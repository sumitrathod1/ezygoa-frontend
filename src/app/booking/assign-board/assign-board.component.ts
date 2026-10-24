import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkDrag, CdkDragDrop, CdkDragPreview, CdkDragStart, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, skip } from 'rxjs';
import {
  AssignmentBoard,
  BoardBooking,
  BoardDriver,
  BoardVehicle,
  DispatchService,
} from '../../services/dispatch.service';
import { BookingService } from '../../services/booking.service';
import { TransferBookingDialogComponent } from '../transfer-booking-dialog/transfer-booking-dialog.component';

type Kind = 'driver' | 'vehicle';
type Range = 'today' | 'tomorrow' | 'week' | 'custom';

interface SlotData { booking: BoardBooking; kind: Kind }
interface ChipData { kind: Kind; id: number }

/**
 * Assign drivers and vehicles to bookings that were taken without one.
 * Desktop: drag a driver / vehicle onto a booking. Phone: tap the empty slot and pick.
 */
@Component({
  selector: 'app-assign-board',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragPreview],
  templateUrl: './assign-board.component.html',
  styleUrl: './assign-board.component.css',
})
export class AssignBoardComponent implements OnInit {
  range: Range = 'week';
  customDate = '';
  onlyMissing = true;
  panelTab: Kind = 'driver';
  search = '';

  board: AssignmentBoard | null = null;
  loading = false;
  error = '';
  /** Booking ids being saved — their slots show a spinner */
  saving = new Set<string>();
  /** Assigned while this page is open: kept visible even with "only missing" on */
  doneHere = new Set<number>();
  /** Chip being dragged, to warn on cards where that driver / car is already busy */
  dragging: ChipData | null = null;

  /** Tap-to-assign picker */
  picker: SlotData | null = null;

  hasTransferTargets = false;

  constructor(
    private _dispatch: DispatchService,
    private _bookingService: BookingService,
    private _toastr: ToastrService,
    private _dialog: MatDialog,
    private _destroyRef: DestroyRef
  ) {}

  ngOnInit() {
    this.load();
    // Someone else changed a booking (or another office transferred one in): refresh quietly
    this._bookingService.bookingUpdated$
      .pipe(skip(1), debounceTime(800), takeUntilDestroyed(this._destroyRef))
      .subscribe(() => {
        if (!this.dragging && !this.saving.size && !this.picker) this.load(true);
      });
    this._dispatch.getTransferTargets().subscribe({
      next: (t) => (this.hasTransferTargets = t.length > 0),
      error: () => (this.hasTransferTargets = false),
    });
  }

  // ── Dates ────────────────────────────────────────────────────────────

  private static iso(d: Date): string {
    const p = (n: number) => (n < 10 ? '0' + n : String(n));
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  get period(): { from: string; to: string } {
    const today = new Date();
    const add = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return AssignBoardComponent.iso(d);
    };
    switch (this.range) {
      case 'today': return { from: add(0), to: add(0) };
      case 'tomorrow': return { from: add(1), to: add(1) };
      case 'custom': return { from: this.customDate || add(0), to: this.customDate || add(0) };
      default: return { from: add(0), to: add(6) };
    }
  }

  setRange(r: Range) {
    this.range = r;
    if (r === 'custom' && !this.customDate) this.customDate = this.period.from;
    this.load();
  }

  load(quiet = false) {
    const { from, to } = this.period;
    if (!quiet) this.loading = true;
    this.error = '';
    this._dispatch.getBoard(from, to).subscribe({
      next: (b) => {
        this.board = b;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Could not load bookings. Check your connection and try again.';
      },
    });
  }

  // ── What to show ─────────────────────────────────────────────────────

  private needsSomething(b: BoardBooking): boolean {
    return !b.vehicleId || (b.needsDriver && !b.userId);
  }

  /**
   * Open bookings starting in the period (rentals that started earlier only count as "busy"),
   * plus past bookings whose date went by without a driver / vehicle — shown first.
   */
  get visible(): BoardBooking[] {
    if (!this.board) return [];
    const { from } = this.period;
    return this.board.bookings.filter(
      (b) =>
        b.isOpen &&
        (b.travelDate >= from || b.isMissed || this.doneHere.has(b.bookingId)) &&
        (!this.onlyMissing || this.needsSomething(b) || this.doneHere.has(b.bookingId))
    );
  }

  isPast(date: string): boolean {
    return date < AssignBoardComponent.iso(new Date());
  }

  get groups(): { date: string; items: BoardBooking[] }[] {
    const map = new Map<string, BoardBooking[]>();
    for (const b of this.visible) {
      if (!map.has(b.travelDate)) map.set(b.travelDate, []);
      map.get(b.travelDate)!.push(b);
    }
    // Oldest first, so missed (past) days are always on top
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date, items }));
  }

  get missingCount(): number {
    return (this.board?.bookings ?? []).filter(
      (b) => b.isOpen && (b.travelDate >= this.period.from || b.isMissed) && this.needsSomething(b)
    ).length;
  }

  dayLabel(date: string): string {
    const today = AssignBoardComponent.iso(new Date());
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const tomorrow = AssignBoardComponent.iso(t);
    const d = new Date(date + 'T00:00:00');
    const nice = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    if (date < today) return `Missed · ${nice} — date passed`;
    if (date === today) return `Today · ${nice}`;
    if (date === tomorrow) return `Tomorrow · ${nice}`;
    return nice;
  }

  time(t: string | null): string {
    if (!t) return '';
    const [hh, mm] = t.split(':');
    const h = parseInt(hh, 10);
    return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  // ── Drivers / vehicles panel ─────────────────────────────────────────

  private matches(text: string | null | undefined): boolean {
    const q = this.search.trim().toLowerCase();
    return !q || (text ?? '').toLowerCase().includes(q);
  }

  get drivers(): BoardDriver[] {
    return (this.board?.drivers ?? []).filter((d) => this.matches(d.name) || this.matches(d.number));
  }

  get vehicles(): BoardVehicle[] {
    return (this.board?.vehicles ?? []).filter((v) => this.matches(v.vehicleName) || this.matches(v.vehicleNumber));
  }

  /** Open jobs in the period for this driver / vehicle */
  jobs(kind: Kind, id: number): number {
    const { from, to } = this.period;
    return (this.board?.bookings ?? []).filter(
      (b) => (kind === 'driver' ? b.userId === id : b.vehicleId === id) && b.travelDate <= to && (b.returnDate ?? b.travelDate) >= from
    ).length;
  }

  private overlaps(a: BoardBooking, b: BoardBooking): boolean {
    return a.travelDate <= (b.returnDate ?? b.travelDate) && (a.returnDate ?? a.travelDate) >= b.travelDate;
  }

  /** Other bookings that driver / vehicle already has on this booking's day(s) */
  busyWith(booking: BoardBooking, kind: Kind, id: number): BoardBooking[] {
    return (this.board?.bookings ?? []).filter(
      (o) => o.bookingId !== booking.bookingId && (kind === 'driver' ? o.userId === id : o.vehicleId === id) && this.overlaps(o, booking)
    );
  }

  busyText(booking: BoardBooking, kind: Kind, id: number): string {
    const other = this.busyWith(booking, kind, id);
    if (!other.length) return '';
    const o = other[0];
    const more = other.length > 1 ? ` +${other.length - 1} more` : '';
    if (o.bookingType === 'SelfDriveRental' && o.returnDate && o.returnDate !== o.travelDate)
      return `On rental #${o.bookingId}${more}`;
    return `Busy${o.travelTime ? ' ' + this.time(o.travelTime) : ''} (#${o.bookingId})${more}`;
  }

  vehicleAllowed(booking: BoardBooking, v: BoardVehicle): boolean {
    return !v.rentalOnly || booking.bookingType === 'SelfDriveRental';
  }

  // ── Drag & drop ──────────────────────────────────────────────────────

  dragStarted(e: CdkDragStart<ChipData>) {
    this.dragging = e.source.data;
  }

  dragEnded() {
    this.dragging = null;
  }

  /** A driver only drops on a driver slot, a car on a vehicle slot */
  canEnter = (drag: CdkDrag<ChipData>, drop: CdkDropList<SlotData>): boolean => {
    const chip = drag.data;
    const slot = drop.data;
    if (!slot || !chip || chip.kind !== slot.kind) return false;
    if (chip.kind === 'vehicle') {
      const v = this.board?.vehicles.find((x) => x.vehicleId === chip.id);
      if (v && !this.vehicleAllowed(slot.booking, v)) return false;
    }
    return true;
  };

  /** The panel lists never accept drops — chips are copied, not moved */
  noEnter = () => false;

  dropped(e: CdkDragDrop<{ booking: BoardBooking; kind: string }, any, ChipData>) {
    if (e.previousContainer === e.container) return;
    const slot = e.container.data as SlotData;
    const chip = e.item.data;
    if (!slot || !chip || chip.kind !== slot.kind) return;
    this.assign(slot.booking, chip.kind, chip.id);
  }

  // ── Tap to assign ────────────────────────────────────────────────────

  openPicker(booking: BoardBooking, kind: Kind) {
    this.search = '';
    this.picker = { booking, kind };
  }

  closePicker() {
    this.picker = null;
  }

  pick(id: number) {
    if (!this.picker) return;
    const { booking, kind } = this.picker;
    this.picker = null;
    this.assign(booking, kind, id);
  }

  // ── Save ─────────────────────────────────────────────────────────────

  slotKey(b: BoardBooking, kind: Kind) {
    return `${b.bookingId}-${kind}`;
  }

  assign(booking: BoardBooking, kind: Kind, id: number) {
    if ((kind === 'driver' && booking.userId === id) || (kind === 'vehicle' && booking.vehicleId === id)) return;
    this.save(booking, kind, kind === 'driver' ? { userId: id } : { vehicleId: id });
  }

  clear(booking: BoardBooking, kind: Kind, event?: Event) {
    event?.stopPropagation();
    this.save(booking, kind, kind === 'driver' ? { clearDriver: true } : { clearVehicle: true });
  }

  private save(booking: BoardBooking, kind: Kind, change: any) {
    const key = this.slotKey(booking, kind);
    this.saving.add(key);
    this._dispatch.assign(booking.bookingId, change).subscribe({
      next: (r) => {
        this.saving.delete(key);
        booking.vehicleId = r.vehicleId;
        booking.vehicleName = r.vehicleName;
        booking.userId = r.userId;
        booking.driverName = r.driverName;
        booking.status = r.status;
        booking.fullyAssigned = r.fullyAssigned;
        if (r.fullyAssigned) this.doneHere.add(booking.bookingId);

        const what = change.clearDriver ? 'Driver removed' : change.clearVehicle ? 'Vehicle removed'
          : kind === 'driver' ? `${r.driverName} assigned` : `${r.vehicleName} assigned`;
        this._toastr.success(r.fullyAssigned ? `${what} — booking #${r.bookingId} is ready` : what, '', { timeOut: 2500 });
        if (r.warnings?.length) this._toastr.warning(r.warnings.join('<br>'), 'Please check', { enableHtml: true, timeOut: 9000 });
      },
      error: (err) => {
        this.saving.delete(key);
        this._toastr.error(err?.error?.message || 'Could not save. Please try again.', 'Not assigned');
      },
    });
  }

  // ── Transfer ─────────────────────────────────────────────────────────

  transfer(booking: BoardBooking) {
    const ref = this._dialog.open(TransferBookingDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        bookingId: booking.bookingId,
        summary: `${booking.customerName ?? 'Customer'} · ${booking.from ?? ''} → ${booking.to ?? ''} · ${this.dayLabel(booking.travelDate)}${booking.travelTime ? ', ' + this.time(booking.travelTime) : ''}`,
      },
    });
    ref.afterClosed().subscribe((done) => {
      if (done && this.board) this.board.bookings = this.board.bookings.filter((b) => b.bookingId !== booking.bookingId);
    });
  }

  trackBooking = (_: number, b: BoardBooking) => b.bookingId;
}

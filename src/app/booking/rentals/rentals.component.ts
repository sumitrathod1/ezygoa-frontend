import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { RentalRow, RentalService } from '../../services/rental.service';
import { BookingService } from '../../services/booking.service';
import { RentalFormComponent } from './rental-form.component';
import { InvoicePreviewComponent } from '../../calendar/invoice-preview/invoice-preview.component';

type Tab = 'out' | 'upcoming' | 'returned';

/** Rent a Car: every self-drive rental (our cars and partners' cars) in one place. */
@Component({
  selector: 'app-rentals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rentals.component.html',
  styleUrl: './rentals.component.css',
})
export class RentalsComponent implements OnInit {
  rentals: RentalRow[] = [];
  tab: Tab = 'out';
  search = '';
  loading = true;
  error = '';
  busyId: number | null = null;

  constructor(
    private _rentals: RentalService,
    private _bookingService: BookingService,
    private _dialog: MatDialog,
    private _toastr: ToastrService
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this._rentals.list().subscribe({
      next: (r) => {
        this.rentals = r;
        this.loading = false;
        // Nothing out right now: open on upcoming
        if (this.tab === 'out' && !this.count('out') && this.count('upcoming')) this.tab = 'upcoming';
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Could not load rentals.';
      },
    });
  }

  private inTab(r: RentalRow, t: Tab): boolean {
    if (t === 'out') return r.state === 'out' || r.state === 'overdue';
    return r.state === t;
  }

  count(t: Tab): number {
    return this.rentals.filter((r) => this.inTab(r, t)).length;
  }

  get overdueCount(): number {
    return this.rentals.filter((r) => r.state === 'overdue').length;
  }

  get visible(): RentalRow[] {
    const q = this.search.trim().toLowerCase();
    const list = this.rentals.filter((r) => this.inTab(r, this.tab)).filter(
      (r) => !q || [r.customerName, r.customerNumber, r.vehicleName, r.vehicleNumber, r.partnerName, String(r.bookingId)]
        .some((x) => (x ?? '').toLowerCase().includes(q))
    );
    // Overdue first, then by return date; returned: newest first
    return this.tab === 'returned'
      ? list.sort((a, b) => b.returnDate.localeCompare(a.returnDate))
      : list.sort((a, b) => Number(b.state === 'overdue') - Number(a.state === 'overdue') || a.returnDate.localeCompare(b.returnDate) || a.pickupDate.localeCompare(b.pickupDate));
  }

  dateLabel(iso: string): string {
    return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  }

  time(t: string | null): string {
    if (!t) return '';
    const [hh, mm] = t.split(':');
    const h = parseInt(hh, 10);
    return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  stateLabel(r: RentalRow): string {
    return { upcoming: 'Upcoming', out: 'Out now', overdue: 'Overdue', returned: 'Returned' }[r.state];
  }

  newRental() {
    this._dialog.open(RentalFormComponent, { width: '620px', maxWidth: '96vw', data: null })
      .afterClosed().subscribe((saved) => saved && this.load());
  }

  edit(r: RentalRow) {
    this._dialog.open(RentalFormComponent, { width: '620px', maxWidth: '96vw', data: { rental: r } })
      .afterClosed().subscribe((saved) => saved && this.load());
  }

  markReturned(r: RentalRow) {
    this.busyId = r.bookingId;
    this._rentals.markReturned(r.bookingId).subscribe({
      next: () => {
        this.busyId = null;
        this._toastr.success(`Rental #${r.bookingId} marked as returned${r.securityDeposit ? ' — remember to refund the deposit' : ''}`);
        this._bookingService.notifyBookingUpdated();
        this.load();
      },
      error: (err) => {
        this.busyId = null;
        this._toastr.error(err?.error?.message || 'Could not update the rental.');
      },
    });
  }

  invoice(r: RentalRow) {
    this._dialog.open(InvoicePreviewComponent, { data: { booking: { bookingId: r.bookingId } }, maxWidth: '500px', width: '95vw', maxHeight: '92vh' });
  }

  call(number: string | null) {
    if (number) window.open(`tel:${number}`, '_self');
  }

  trackRental = (_: number, r: RentalRow) => r.bookingId;
}

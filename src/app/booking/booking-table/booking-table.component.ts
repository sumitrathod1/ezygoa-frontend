import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { BookingFormComponent } from '../booking-form/booking-form.component';
import { BookingService } from '../../services/booking.service';
import { VehicleService } from '../../services/vehicle.service';
import { EmployeeService } from '../../services/employee.service';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IndianCurrencyPipe } from '../../pipes/indian-currency.pipe';
import { Observable, skip } from 'rxjs';
import { DispatchService } from '../../services/dispatch.service';
import { TransferBookingDialogComponent } from '../transfer-booking-dialog/transfer-booking-dialog.component';
import { InvoicePreviewComponent } from '../../calendar/invoice-preview/invoice-preview.component';

import { BookingTypePipe } from '../../pipes/booking-type.pipe';
type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom' | '';

/** Totals over every booking that matches the filters (sent by the server, not counted from one page) */
export interface BookingSummary {
  count: number;
  revenue: number;
  pending: number;
  assigned: number;
  completed: number;
  cancelled: number;
}

const EMPTY_SUMMARY: BookingSummary = { count: 0, revenue: 0, pending: 0, assigned: 0, completed: 0, cancelled: 0 };

const emptyFilter = () => ({
  particularDate: '',
  startDate: '',
  endDate: '',
  from: '',
  to: '',
  status: '',
  vehicleId: '',
  userId: '',
  bookingType: '',
  travelTime: '',
  /** Who added the booking */
  createdByUserId: '',
  /** Linked organisation it was transferred from; 'any' = every transferred booking */
  fromOrgId: '',
});

@Component({
  selector: 'app-booking-table',
  standalone: true,
  imports: [BookingTypePipe, CommonModule, RouterModule, FormsModule, ReactiveFormsModule, IndianCurrencyPipe],
  templateUrl: './booking-table.component.html',
  styleUrl: './booking-table.component.css',
})
export class BookingTableComponent implements OnInit {
  bookings: any[] = [];
  vehicles: any[] = [];
  employees: any[] = [];
  addedByOptions: { userId: number; name: string; count: number }[] = [];
  fromOrgOptions: { orgId: number; name: string; count: number }[] = [];

  summary: BookingSummary = { ...EMPTY_SUMMARY };
  loading = false;

  pagination: any = {
    pageNumber: 1,
    pageSize: 20,
    totalCount: 0,
    totalPages: 0,
  };

  /** Filter panel open (collapsed by default on phones) */
  showFilters = typeof window !== 'undefined' && window.innerWidth > 768;
  selectedPeriod: Period = '';
  showCustom = false;

  filter: any = emptyFilter();

  statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Assigned', label: 'Assigned' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Canceled', label: 'Cancelled' },
  ];

  constructor(
    private _dialog: MatDialog,
    private _bookingservice: BookingService,
    private _vehicleService: VehicleService,
    private _employeeService: EmployeeService,
    private _dispatch: DispatchService
  ) {
    this.canTransfer$ = this._dispatch.canTransfer();
  }

  /** Show "Transfer" only when this organisation has a linked one */
  canTransfer$: Observable<boolean>;

  transferBooking(booking: any) {
    this._dialog
      .open(TransferBookingDialogComponent, {
        width: '440px',
        maxWidth: '95vw',
        data: {
          bookingId: booking.bookingId,
          summary: `${booking.customerName ?? 'Customer'} · ${booking.from ?? ''} → ${booking.to ?? ''} · ${booking.travelDate ?? ''}`,
        },
      })
      .afterClosed()
      .subscribe((done) => done && this.applyFilter());
  }

  invoice(booking: any) {
    this._dialog.open(InvoicePreviewComponent, {
      data: { booking: { bookingId: booking.bookingId } },
      maxWidth: '500px',
      width: '95vw',
      maxHeight: '92vh',
    });
  }

  ngOnInit() {
    this.applyFilter();
    // bookingUpdated$ replays its last value on subscribe — skip it, the page was just loaded
    this._bookingservice.bookingUpdated$.pipe(skip(1)).subscribe(() => this.applyFilter());

    this._vehicleService.getAllVehicles().subscribe({
      next: (data: any) => {
        this.vehicles = Array.isArray(data) ? data : data?.vehicles || [];
      },
    });

    this._employeeService.getAllEmployees().subscribe({
      next: (data: any) => {
        this.employees = Array.isArray(data) ? data : data?.users || data?.employees || [];
      },
    });
  }

  selectPeriod(p: Period) {
    this.selectedPeriod = p;
    this.showCustom = p === 'custom';
    if (p === 'custom') return;

    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (p === '') {
      this.filter.startDate = '';
      this.filter.endDate = '';
    } else if (p === 'week') {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      this.filter.startDate = fmt(from);
      this.filter.endDate = fmt(now);
    } else if (p === 'month') {
      this.filter.startDate = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
      this.filter.endDate = fmt(now);
    } else if (p === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      this.filter.startDate = fmt(new Date(now.getFullYear(), q * 3, 1));
      this.filter.endDate = fmt(now);
    } else if (p === 'year') {
      this.filter.startDate = fmt(new Date(now.getFullYear(), 0, 1));
      this.filter.endDate = fmt(now);
    }

    this.search();
  }

  /** A filter changed: back to page 1 */
  search() {
    this.pagination.pageNumber = 1;
    this.applyFilter();
  }

  applyFilter() {
    this.loading = true;
    this._bookingservice
      .filterBookings(this.filter, this.pagination.pageNumber, this.pagination.pageSize)
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.bookings = res.data || [];
          this.pagination = res.pagination || this.pagination;
          this.summary = { ...EMPTY_SUMMARY, ...(res.summary || {}) };
          if (res.filters) {
            this.addedByOptions = res.filters.addedBy || [];
            this.fromOrgOptions = res.filters.fromOrgs || [];
          }
        },
        error: () => (this.loading = false),
      });
  }

  applyCustomRange() {
    this.search();
  }

  clearFilter() {
    this.selectedPeriod = '';
    this.showCustom = false;
    this.filter = emptyFilter();
    this.search();
  }

  /** Tap a status tile to see only those bookings (tap again to show all) */
  toggleStatus(status: string) {
    this.filter.status = this.filter.status === status ? '' : status;
    this.search();
  }

  /** Number of dropdown filters in use — shown on the "Filters" button */
  get activeFilterCount(): number {
    const f = this.filter;
    return [f.status, f.vehicleId, f.userId, f.createdByUserId, f.fromOrgId].filter((v) => !!v).length;
  }

  get hasAnyFilter(): boolean {
    return this.activeFilterCount > 0 || !!this.selectedPeriod;
  }

  /** "21–40 of 1,699" */
  get rangeText(): string {
    const { pageNumber, pageSize, totalCount } = this.pagination;
    if (!totalCount) return '0';
    const start = (pageNumber - 1) * pageSize + 1;
    const end = Math.min(totalCount, pageNumber * pageSize);
    return `${start}–${end} of ${totalCount.toLocaleString('en-IN')}`;
  }

  changePage(page: number) {
    if (page < 1 || page > this.pagination.totalPages || page === this.pagination.pageNumber) return;
    this.pagination.pageNumber = page;
    this.applyFilter();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editBooking(booking: any) {
    this._dialog.open(BookingFormComponent, { data: booking });
  }

  statusLabel(status?: string | null): string {
    return status === 'Canceled' ? 'Cancelled' : status || '';
  }

  /** Booked with a partner's car/driver instead of our own */
  driverText(b: any): string {
    if (b.partnerName) return `Partner: ${b.partnerName}`;
    return b.userName || '';
  }

  formatTime(time?: string | null): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m} ${suffix}`;
  }

  trackBooking = (_: number, b: any) => b.bookingId;
}

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BookingFormComponent } from '../../booking/booking-form/booking-form.component';
import { BookingService } from '../../services/booking.service';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { ExternalFormComponent } from '../../booking/external-form/external-form.component';
import { InvoicePreviewComponent } from '../invoice-preview/invoice-preview.component';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { DispatchService } from '../../services/dispatch.service';
import { TransferBookingDialogComponent } from '../../booking/transfer-booking-dialog/transfer-booking-dialog.component';
import { TripDialogComponent } from '../../booking/trip-dialog/trip-dialog.component';

import { BookingTypePipe } from '../../pipes/booking-type.pipe';
@Component({
  selector: 'app-date-per-bookings',
  standalone: true,
  imports: [BookingTypePipe, CommonModule, RouterModule],
  templateUrl: './date-per-bookings.component.html',
  styleUrl: './date-per-bookings.component.css',
})
export class DatePerBookingsComponent {
  @Input() bookings: any[] = [];
  @Input() selectedDate: Date | null = null;
  @Input() loading = false;
  @Output() close = new EventEmitter<void>();

  totalAmount: number = 0;
  totalBookings: number = 0;
  /** Show "Transfer" only when this organisation has a linked one */
  canTransfer$: Observable<boolean>;

  constructor(
    private _dialog: MatDialog,
    private _bookingService: BookingService,
    private _totastr: ToastrService,
    private _dispatch: DispatchService
  ) {
    this.canTransfer$ = this._dispatch.canTransfer();
  }

  openTrip(b: any) {
    this._dialog.open(TripDialogComponent, { width: '640px', maxWidth: '96vw', data: { tripId: b.tripId } });
  }

  /** New booking for the same customer — joins their trip (and hotel) when there is one. */
  addForCustomer(b: any) {
    this._dialog.open(BookingFormComponent, {
      data: {
        prefill: {
          customerName: b.customer?.customerName,
          customerNumber: b.customer?.customerNumber,
          tripId: b.tripId ?? null,
          pax: b.pax ?? null,
          travelAgentId: b.travelAgentId ?? null,
          stay: b.tripStayName ? { name: b.tripStayName, mapsLink: b.tripStayMapsLink ?? null } : null,
        },
      },
    });
  }

  isPartner(b: any): boolean {
    return !!(b.externalEmployeeId || b.externalEmployee || b.externalEmployeeNumber);
  }

  transferBooking(booking: any) {
    const id = booking.bookingId ?? booking.BookingId;
    const ref = this._dialog.open(TransferBookingDialogComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        bookingId: id,
        summary: `${booking.customer?.customerName ?? 'Customer'} · ${booking.from ?? ''} → ${booking.to ?? ''} · ${this.formatTime(booking.traveltime)}`,
      },
    });
    ref.afterClosed().subscribe((done) => {
      if (!done) return;
      this.bookings = this.bookings.filter((b) => (b.bookingId ?? b.BookingId) !== id);
      this.calculateTotals();
    });
  }
  get formattedDate(): string {
    return this.selectedDate ? this.selectedDate.toDateString() : '';
  }
  ngOnInit() {
    this.calculateTotals();
  }
  ngOnChanges() {
    this.calculateTotals();
  }

  calculateTotals() {
    this.totalBookings = this.bookings.length;

    this.totalAmount = this.bookings.reduce(
      (sum, b) => sum + (Number(b.amount) || 0),
      0
    );
  }
  onClose() {
    this.close.emit();
  }

  callCustomer(number: string) {
    window.open(`tel:${number}`, '_self');
  }

  editBooking(booking: any) {
    this._dialog.open(BookingFormComponent, {
      data: booking,
    });
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

  cancelBooking(booking: any) {
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Cancel Booking',
        message: `Are you sure you want to cancel booking?`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const bookingId = booking.bookingId ?? booking.BookingId;
        const travelDate = booking.travelDate ?? booking.TravelDate ?? new Date().toISOString().split('T')[0];
        this._bookingService
          .cancelBooking(bookingId, travelDate, 'User')
          .subscribe({
            next: (res) => {
              this.bookings = this.bookings.filter(
                (b) => (b.bookingId ?? b.BookingId) !== bookingId
              );
              this.calculateTotals();
              this._totastr.success('Booking cancelled successfully', 'Success');
              this._bookingService.notifyBookingUpdated();
            },
            error: (err) => {
              const message = err?.error?.message || 'Error cancelling booking';
              this._totastr.error(message, 'Error');
            },
          });
      }
    });
  }

  openAssignExternalDialog(booking: any) {
    this._dialog.open(ExternalFormComponent, {
      width: '500px',
      data: {
        bookingId: booking.bookingId,
        advancePay: booking.advancePaid ?? 0,
      },
    });
  }

  getVehicleColor(b: any): string {
    const map: any = {
      Swift_Dezire: 'red',
      ERTIGA: '#2563eb',
      TT20Seater: '#22c55e',
      Urbania: '#1a1a1a',
    };
    if (!b.vehicle || b.externalEmployee || b.externalEmployeeNumber) return 'brown';
    return map[b.vehicle?.vehicleName] || '#6366f1';
  }

  getBookingTypeColor(type: string): string {
    const map: Record<string, string> = {
      AirportPickup: '#3b82f6',
      AirportDrop: '#8b5cf6',
      RailwayStation: '#06b6d4',
      FullDay: '#f59e0b',
      SightSeeing: '#22c55e',
      NorthGoaSightseeing: '#16a34a',
      SouthGoaSightseeing: '#0d9488',
      DudhsagarTour: '#0891b2',
      Shuttle: '#6366f1',
      Notspecified: '#9ca3af',
    };
    return map[type] || '#6366f1';
  }

  getBalance(b: any): number {
    return (b.amount || 0) - (b.advancePaid || 0);
  }

  /** Opens Google Maps navigation from driver's current location to the given place */
  mapsUrl(location: string): string {
    if (!location || location === '—') return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
  }

  openInvoice(booking: any) {
    this._dialog.open(InvoicePreviewComponent, {
      data: { booking },
      maxWidth: '500px',
      width: '95vw',
      maxHeight: '92vh',
    });
  }
}

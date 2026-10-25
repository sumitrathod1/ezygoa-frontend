import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { TripDetail, TripService } from '../../services/trip.service';
import { BoardDriver, BoardVehicle, DispatchService } from '../../services/dispatch.service';
import { BookingService } from '../../services/booking.service';
import { BookingFormComponent } from '../booking-form/booking-form.component';
import { LocationPickerComponent, PickedLocation } from '../../shared/location-picker/location-picker.component';

import { BookingTypePipe } from '../../pipes/booking-type.pipe';
/** One customer visit: all its days, the hotel, totals, and "same driver & car for all days". */
@Component({
  selector: 'app-trip-dialog',
  standalone: true,
  imports: [BookingTypePipe, CommonModule, FormsModule, MatDialogModule],
  templateUrl: './trip-dialog.component.html',
  styleUrl: './trip-dialog.component.css',
})
export class TripDialogComponent implements OnInit {
  trip: TripDetail | null = null;
  loading = true;
  error = '';

  drivers: BoardDriver[] = [];
  vehicles: BoardVehicle[] = [];
  allDriver: number | null = null;
  allVehicle: number | null = null;
  assigning = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { tripId: number },
    private _ref: MatDialogRef<TripDialogComponent>,
    private _trips: TripService,
    private _dispatch: DispatchService,
    private _bookingService: BookingService,
    private _dialog: MatDialog,
    private _toastr: ToastrService
  ) {}

  ngOnInit() {
    this.load();
    // Drivers / vehicles of this organisation (same lists as the Assign page)
    const today = TripDialogComponent.todayIso();
    this._dispatch.getBoard(today, today).subscribe({
      next: (b) => {
        this.drivers = b.drivers;
        this.vehicles = b.vehicles.filter((v) => !v.rentalOnly);
      },
      error: () => {},
    });
  }

  load() {
    this.loading = true;
    this._trips.get(this.data.tripId).subscribe({
      next: (t) => {
        this.trip = t;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Could not load the trip.';
      },
    });
  }

  get openOwnDays(): number {
    const today = TripDialogComponent.todayIso();
    return (this.trip?.bookings ?? []).filter(
      (b) => !b.externalEmployeeId && b.status !== 'Canceled' && b.status !== 'Completed' && b.travelDate >= today
    ).length;
  }

  /** Today as yyyy-mm-dd in local time (toISOString is UTC — still "yesterday" early morning in India). */
  private static todayIso(): string {
    const d = new Date();
    const p = (n: number) => (n < 10 ? '0' + n : String(n));
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  dayLabel(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  time(t: string | null): string {
    if (!t) return '';
    const [hh, mm] = t.split(':');
    const h = parseInt(hh, 10);
    return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  range(): string {
    if (!this.trip) return '';
    const f = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return this.trip.startDate === this.trip.endDate ? f(this.trip.startDate) : `${f(this.trip.startDate)} – ${f(this.trip.endDate)}`;
  }

  changeHotel() {
    if (!this.trip) return;
    const ref = this._dialog.open(LocationPickerComponent, {
      width: '520px', maxWidth: '100vw', height: '90vh', maxHeight: '90vh', panelClass: 'lp-dialog-panel',
      data: { current: this.trip.stayName ?? '', label: 'Hotel / stay' },
    });
    ref.afterClosed().subscribe((picked: PickedLocation | null) => {
      if (!picked || !this.trip) return;
      this._trips.updateStay(this.trip.tripId, { name: picked.name, lat: picked.lat, lng: picked.lng, mapsLink: picked.mapsLink }).subscribe({
        next: () => {
          this._toastr.success('Hotel updated for the whole trip');
          this.load();
        },
        error: (err) => this._toastr.error(err?.error?.message || 'Could not update the hotel'),
      });
    });
  }

  assignAll() {
    if (!this.trip || (!this.allDriver && !this.allVehicle)) return;
    this.assigning = true;
    this._trips.assignAll(this.trip.tripId, { userId: this.allDriver, vehicleId: this.allVehicle }).subscribe({
      next: (r) => {
        this.assigning = false;
        this._toastr.success(`${r.updated} day${r.updated === 1 ? '' : 's'} assigned`);
        if (r.warnings?.length) this._toastr.warning(r.warnings.join('<br>'), 'Please check', { enableHtml: true, timeOut: 9000 });
        if (r.skipped?.length) this._toastr.info(r.skipped.join('<br>'), 'Not changed', { enableHtml: true, timeOut: 9000 });
        this._bookingService.notifyBookingUpdated();
        this.load();
      },
      error: (err) => {
        this.assigning = false;
        this._toastr.error(err?.error?.message || 'Could not assign');
      },
    });
  }

  /** New booking for the same customer, already in this trip with its hotel. */
  addBooking() {
    if (!this.trip) return;
    this._ref.close();
    this._dialog.open(BookingFormComponent, {
      data: {
        prefill: {
          customerName: this.trip.customer?.customerName,
          customerNumber: this.trip.customer?.customerNumber,
          tripId: this.trip.tripId,
          pax: this.trip.pax || null,
          stay: this.trip.stayName
            ? { name: this.trip.stayName, lat: this.trip.stayLat, lng: this.trip.stayLng, mapsLink: this.trip.stayMapsLink }
            : null,
        },
      },
    });
  }

  close() {
    this._ref.close();
  }
}

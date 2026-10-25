import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { BookingService } from '../../services/booking.service';
import { VehicleService } from '../../services/vehicle.service';
import { RentalRatesService } from '../../services/rental-rates.service';
import { RentalRow, RentalService } from '../../services/rental.service';
import { LocationPickerComponent, PickedLocation } from '../../shared/location-picker/location-picker.component';

/** One-tap pickup / return places for rentals. */
const RENTAL_PLACES = [
  { label: '✈ Mopa', value: 'Mopa Airport' },
  { label: '✈ Dabolim', value: 'Dabolim Airport' },
  { label: '🚉 Thivim', value: 'Thivim Railway Station' },
  { label: '🚉 Madgaon', value: 'Madgaon Railway Station' },
  { label: '🏢 Our office', value: 'Office' },
];

/**
 * Rent a Car form: customer, dates and times, our car or a partner's car, price per day,
 * deposit and advance. Saved as a self-drive rental booking (so partner commission,
 * statements and invoices work the same as for every other booking).
 */
@Component({
  selector: 'app-rental-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rental-form.component.html',
  styleUrl: './rental-form.component.css',
})
export class RentalFormComponent implements OnInit {
  readonly places = RENTAL_PLACES;
  times: string[] = [];

  editId: number | null = null;
  customerName = '';
  customerNumber = '';
  source: 'own' | 'partner' = 'own';
  vehicleId: number | null = null;
  partnerName = '';
  partnerNumber = '';
  commission: number | null = null;
  cashWith: 'Admin' | 'ExternalEmployee' = 'Admin';
  pickupDate = '';
  pickupTime = '10:00 AM';
  returnDate = '';
  returnTime = '10:00 AM';
  pickupLocation = '';
  returnLocation = '';
  ratePerDay: number | null = null;
  amount: number | null = null;
  amountEdited = false;
  securityDeposit: number | null = null;
  depositEdited = false;
  advance: number | null = null;

  vehicles: any[] = [];
  rates = new Map<number, { pricePerDay: number; securityDeposit: number }>();
  partners: { name: string; number: string }[] = [];
  rentals: RentalRow[] = [];
  saving = false;
  errors: string[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { rental?: RentalRow } | null,
    private _ref: MatDialogRef<RentalFormComponent>,
    private _bookingService: BookingService,
    private _vehicleService: VehicleService,
    private _ratesService: RentalRatesService,
    private _rentalService: RentalService,
    private _dialog: MatDialog,
    private _toastr: ToastrService
  ) {
    for (let h = 0; h < 24; h++)
      for (const m of ['00', '30']) this.times.push(`${String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')}:${m} ${h < 12 ? 'AM' : 'PM'}`);

    const today = RentalFormComponent.iso(new Date());
    this.pickupDate = today;
    this.returnDate = RentalFormComponent.shift(today, 1);

    const r = data?.rental;
    if (r) {
      this.editId = r.bookingId;
      this.customerName = r.customerName ?? '';
      this.customerNumber = r.customerNumber ?? '';
      this.source = r.externalEmployeeId ? 'partner' : 'own';
      this.vehicleId = r.vehicleId;
      this.partnerName = r.partnerName ?? '';
      this.partnerNumber = r.partnerNumber ?? '';
      this.commission = r.commission;
      this.cashWith = r.cashWithPartner ? 'ExternalEmployee' : 'Admin';
      this.pickupDate = r.pickupDate;
      this.pickupTime = RentalFormComponent.to12h(r.pickupTime) || this.pickupTime;
      this.returnDate = r.returnDate;
      this.returnTime = RentalFormComponent.to12h(r.returnTime) || this.returnTime;
      this.pickupLocation = r.pickupLocation ?? '';
      this.returnLocation = r.returnLocation ?? '';
      this.amount = r.amount;
      this.amountEdited = true;
      this.ratePerDay = r.days ? Math.round(r.amount / r.days) : r.amount;
      this.securityDeposit = r.securityDeposit;
      this.depositEdited = true;
      this.advance = r.paid || null;
    }
  }

  ngOnInit() {
    this._vehicleService.getAllVehicles(true).subscribe({
      next: (res: any) => {
        const all: any[] = Array.isArray(res) ? res : res?.data ?? [];
        // Rent-a-car cars first, then the rest of the fleet
        this.vehicles = all.sort((a, b) => Number(this.isRentalCar(b)) - Number(this.isRentalCar(a)) || String(a.vehicleName).localeCompare(String(b.vehicleName)));
      },
    });
    this._ratesService.getAll().subscribe({
      next: (rates) => {
        for (const r of rates) this.rates.set(r.vehicleId, { pricePerDay: r.pricePerDay, securityDeposit: r.securityDeposit });
        if (!this.editId) this.applyRate();
      },
    });
    this._bookingService.getExternalEmployees().subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : res?.data ?? [];
        this.partners = raw
          .filter((e) => e.externalEmployeeName && e.externalEmployeeNumber)
          .map((e) => ({ name: e.externalEmployeeName, number: e.externalEmployeeNumber }));
      },
    });
    this._rentalService.list().subscribe({ next: (r) => (this.rentals = r), error: () => {} });
  }

  // ── dates / money ───────────────────────────────────────────────────

  static iso(d: Date): string {
    const p = (n: number) => (n < 10 ? '0' + n : String(n));
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  static shift(iso: string, by: number): string {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + by);
    return RentalFormComponent.iso(d);
  }

  /** "14:30:00" → "02:30 PM" */
  static to12h(t: string | null): string {
    if (!t) return '';
    const [hh, mm] = t.split(':');
    const h = parseInt(hh, 10);
    return `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
  }

  /** Whole days between pickup and return (at least 1). */
  get days(): number {
    if (!this.pickupDate || !this.returnDate) return 1;
    const ms = new Date(this.returnDate + 'T00:00:00').getTime() - new Date(this.pickupDate + 'T00:00:00').getTime();
    return Math.max(1, Math.round(ms / 86400000));
  }

  get balance(): number {
    return Math.max(0, (Number(this.amount) || 0) - (Number(this.advance) || 0));
  }

  isRentalCar(v: any): boolean {
    return /^RENTAL-/i.test(v?.vehicleNumber ?? '');
  }

  /** Price per day and deposit from the Rental Rates of the chosen car. */
  applyRate() {
    const rate = this.vehicleId ? this.rates.get(this.vehicleId) : undefined;
    if (rate) {
      this.ratePerDay = rate.pricePerDay;
      if (!this.depositEdited) this.securityDeposit = rate.securityDeposit || null;
    }
    this.recalc();
  }

  recalc() {
    if (!this.amountEdited && this.ratePerDay != null) this.amount = (Number(this.ratePerDay) || 0) * this.days;
  }

  onDatesChange() {
    if (this.returnDate && this.pickupDate && this.returnDate < this.pickupDate) this.returnDate = this.pickupDate;
    this.recalc();
  }

  onAmountTyped() {
    this.amountEdited = true;
  }

  onRateTyped() {
    this.amountEdited = false;
    this.recalc();
  }

  /** Other rentals with this car on overlapping days. */
  busyText(v: any): string {
    const clash = this.rentals.find(
      (r) => r.vehicleId === v.vehicleId && r.bookingId !== this.editId && r.state !== 'returned'
        && r.pickupDate <= this.returnDate && r.returnDate >= this.pickupDate
    );
    return clash ? ` — busy (#${clash.bookingId} until ${clash.returnDate})` : '';
  }

  pickPartner(name: string) {
    const p = this.partners.find((x) => x.name === name);
    if (p && !this.partnerNumber) this.partnerNumber = p.number;
  }

  pickPlace(field: 'pickupLocation' | 'returnLocation') {
    const ref = this._dialog.open(LocationPickerComponent, {
      width: '520px', maxWidth: '100vw', height: '90vh', maxHeight: '90vh', panelClass: 'lp-dialog-panel',
      data: { current: this[field], label: field === 'pickupLocation' ? 'Hand over the car at' : 'Car comes back at' },
    });
    ref.afterClosed().subscribe((picked: PickedLocation | null) => {
      if (picked) this[field] = picked.name;
    });
  }

  // ── save ────────────────────────────────────────────────────────────

  validate(): string[] {
    const e: string[] = [];
    if (!this.customerName.trim()) e.push('Customer name is required.');
    if (this.customerNumber.replace(/\D/g, '').length < 10) e.push('Enter a valid 10-digit customer number.');
    if (!this.pickupDate) e.push('Choose the pickup date.');
    if (!this.returnDate) e.push('Choose the return date.');
    if (this.pickupDate && this.returnDate && this.returnDate < this.pickupDate) e.push('Return date cannot be before the pickup date.');
    if ((Number(this.amount) || 0) < 0) e.push('Amount cannot be negative.');
    if ((Number(this.advance) || 0) > (Number(this.amount) || 0) && (Number(this.amount) || 0) > 0) e.push('Advance cannot be more than the amount.');
    if (this.source === 'partner') {
      if (!this.partnerName.trim()) e.push("Enter the partner's name.");
      if (this.partnerNumber.replace(/\D/g, '').length < 10) e.push("Enter the partner's 10-digit number.");
      if (this.commission == null || (this.commission as any) === '') e.push('Enter your commission (0 if none).');
      else if (Number(this.commission) > (Number(this.amount) || 0)) e.push('Commission cannot be more than the amount.');
    }
    return e;
  }

  save() {
    this.errors = this.validate();
    if (this.errors.length) return;
    this.saving = true;
    const partner = this.source === 'partner';
    const payload: any = {
      bookingId: this.editId ?? 0,
      customerName: this.customerName.trim(),
      customerNumber: this.customerNumber.trim(),
      travelDate: this.pickupDate,
      travelTime: this.pickupTime,
      returnDate: this.returnDate,
      returnTime: this.returnTime,
      from: this.pickupLocation || null,
      to: this.returnLocation || null,
      pax: 1,
      bookingType: 'SelfDriveRental',
      bookingStatus: null,
      amount: Number(this.amount) || 0,
      customerWillPay: Number(this.amount) || 0,
      advancePaid: Number(this.advance) || 0,
      securityDeposit: Number(this.securityDeposit) || null,
      payment: partner ? this.cashWith : 'Admin',
      vehicleId: partner ? null : this.vehicleId,
      userId: null,
      externalEmployee: partner ? this.partnerName.trim() : null,
      externalEmployeeNumber: partner ? this.partnerNumber.trim() : null,
      commissionAmount: partner ? Number(this.commission) || 0 : null,
      travelAgentId: this.data?.rental?.travelAgentId ?? null,
      tripId: this.data?.rental?.tripId ?? null,
      dayWiseBookings: [],
    };
    this._bookingService.newBooking(payload).subscribe({
      next: () => {
        this.saving = false;
        this._toastr.success(this.editId ? 'Rental updated' : 'Rental saved');
        this._bookingService.notifyBookingUpdated();
        this._ref.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.errors = [err?.error?.message || 'Could not save the rental. Please try again.'];
      },
    });
  }

  close() {
    this._ref.close(false);
  }
}

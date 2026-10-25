import { Component, Inject, ViewChild, OnInit } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { Dialog } from '@angular/cdk/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';
import { BookingService } from '../../services/booking.service';
import { EmployeeService } from '../../services/employee.service';
import { VehicleService } from '../../services/vehicle.service';
import { AgentService } from '../../services/agent.service';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import {
  MatAutocompleteModule,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { catchError, debounceTime, distinctUntilChanged, filter, map, Observable, of, startWith, switchMap } from 'rxjs';
import { ReturningCustomer, TripService, TripStay, TripSummary } from '../../services/trip.service';
import { BOOKING_TYPES, END_DROP_PLACES, FULL_DAY_PACKAGES, supportsEndDrop } from '../../shared/booking-types';
import { BookingTypePipe } from '../../pipes/booking-type.pipe';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  LocationPickerComponent,
  PickedLocation,
} from '../../shared/location-picker/location-picker.component';

/** One day of a package: its own date, type, time, route and amount. */
export interface PackageDay {
  date: string;         // yyyy-mm-dd
  type: string;
  time: string;         // "09:00 AM" or '' for not set
  from: string;
  to: string;
  amount: number | null;
  /** Tour / full day ending with a drop elsewhere (airport, station, another hotel) */
  endDrop?: string | null;
  /** Tour starting with a pickup (airport, station, another hotel) */
  startPickup?: string | null;
  /** Full Day package: 8 (8 hr / 80 km) or 12 (12 hr / 120 km) */
  fullDayHours?: number | null;
}

/** Places offered as one-tap buttons next to every From / To. */
export const QUICK_PLACES = [
  { label: '✈ Mopa', value: 'Mopa Airport' },
  { label: '✈ Dabolim', value: 'Dabolim Airport' },
  { label: '🚉 Thivim', value: 'Thivim Railway Station' },
  { label: '🚉 Madgaon', value: 'Madgaon Railway Station' },
];

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [
    NgxMaterialTimepickerModule,
    MatAutocompleteModule,
    FormsModule,
    CommonModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatGridListModule,
    MatCheckboxModule,
    BookingTypePipe,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.css',
})
export class BookingFormComponent implements OnInit {
  readonly BookingType = BOOKING_TYPES;
  readonly endDropPlaces = END_DROP_PLACES;
  readonly supportsEndDrop = supportsEndDrop;
  readonly fullDayPackages = FULL_DAY_PACKAGES;

  isSubmitting = false;
  bookingForm!: FormGroup;
  paytypes = ['Admin', 'ExternalEmployee'];
  driverType: any = [];
  vehcilesType: any = [];
  agentTypes: any = [];
  times: string[] = [];
  isEditMode = false;
  /** Package days (replaces the old same-type / same-time / equal-amount days). */
  days: PackageDay[] = [];
  /** 'split': total is spread evenly (any day can still be changed); 'each': type every day's amount. */
  amountMode: 'split' | 'each' = 'split';
  readonly quickPlaces = QUICK_PLACES;

  /** Hotel / stay of the trip — entered once, reused by every day and by later bookings. */
  stay: TripStay | null = null;
  /** Trip this booking joins (or already belongs to when editing). */
  tripId: number | null = null;
  /** Returning-customer lookup result for the typed phone number. */
  returning: ReturningCustomer | null = null;
  returningDismissed = false;

  // Custom time picker state
  timeHour = 12;
  timeMinute = '00';
  timeAmPm: 'AM' | 'PM' = 'AM';
  hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  filteredFrom$!: Observable<string[]>;
  filteredTo$!: Observable<string[]>;

  /** Partners already saved for this organisation (ExternalEmployees), one per phone number. */
  partners: { id: number; name: string; number: string }[] = [];
  filteredPartners$!: Observable<{ id: number; name: string; number: string }[]>;

  @ViewChild('fromTrigger', { read: MatAutocompleteTrigger })
  fromTrigger!: MatAutocompleteTrigger;

  @ViewChild('toTrigger', { read: MatAutocompleteTrigger })
  toTrigger!: MatAutocompleteTrigger;

  constructor(
    private _fb: FormBuilder,
    private _bookingService: BookingService,
    private _employeeService: EmployeeService,
    private _vechileService: VehicleService,
    private _agentService: AgentService,
    private _toastr: ToastrService,
    private _dilog: Dialog,
    private _matDialog: MatDialog,
    private _tripService: TripService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.bookingForm = _fb.group({
      bookingId: data?.bookingId ?? null,
      customerName: [
        data?.customer?.customerName ?? data?.customerName ?? '',
        [Validators.required],
      ],
      customerNumber: [
        data?.customer?.customerNumber ?? data?.customerNumber ?? '',
        [
          Validators.required,
          Validators.pattern(/^(\+91\s*|91\s*|0)?[6-9][0-9]{9}$/),
        ],
      ],
      pax: data?.pax ?? '',
      from: Array.isArray(data?.from) ? data.from[0] : data?.from ?? '',
      to: Array.isArray(data?.to) ? data.to[0] : data?.to ?? '',
      travelDate: data?.travelDate ?? '',
      travelTime: data?.traveltime ?? '',
      driver: data?.userid != null ? Number(data.userid) : null,
      vehicle: data?.vehicle?.vehicleId != null ? Number(data.vehicle.vehicleId) : (data?.vehicleId != null ? Number(data.vehicleId) : null),
      amount: data?.amount ?? '',
      bookingType: data?.bookingType ?? '',
      payment: data?.payment ?? '',
      ownerPay: data?.ownerPay ?? (data?.ownerWillPay || null),
      customerPay: data?.customerPay ?? (data?.customerWillPay || null),
      agent: data?.travelAgentId ? Number(data.travelAgentId) : null,
      isPackage: [false],
      dayWiseBookings: this._fb.array([]),
      advancePaid: data?.advancePaid ?? null,
      // Booking lists return externalEmployee as an object, not the name/number strings —
      // so editing a partner booking opened it as in-house and saving detached the partner.
      isExternalBooking: [!!(data?.externalEmployeeNumber || data?.externalEmployee?.externalEmployeeNumber || data?.externalEmployeeId)],
      externalEmployee: [data?.externalEmployee?.externalEmployeeName ?? (typeof data?.externalEmployee === 'string' ? data.externalEmployee : null)],
      externalEmployeeNumber: [
        data?.externalEmployeeNumber ?? data?.externalEmployee?.externalEmployeeNumber ?? null,
        [Validators.pattern(/^(\+91\s*|91\s*|0)?[6-9][0-9]{9}$/)],
      ],
      commissionAmount: [data?.commissionAmount ?? null],
      returnDate: [data?.returnDate ?? null],
      endDrop: [data?.endDrop ?? null],
      startPickup: [data?.startPickup ?? null],
      fullDayHours: [data?.fullDayHours ?? null],
      packageStartDate: [null],
      packageDays: [2],
      packageFrom: [''],
      packageTo: [''],
      packageTime: [''],
      packageBookingType: ['FullDay'],
    });

    if (data?.dayWiseBookings?.length) {
      this.bookingForm.patchValue({ isPackage: true });
      const first = data.dayWiseBookings[0];
      const totalAmt = data.dayWiseBookings.reduce(
        (s: number, d: any) => s + (Number(d.amount) || 0), 0
      );
      this.bookingForm.patchValue({
        packageStartDate: first.travelDate ? new Date(first.travelDate) : null,
        packageDays: data.dayWiseBookings.length,
        packageTime: first.travelTime || '',
        packageBookingType: first.bookingType || 'FullDay',
        amount: totalAmt,
      });
      this.days = data.dayWiseBookings.map((d: any) => ({
        date: d.travelDate ? this.localDate(new Date(d.travelDate)) : '',
        type: d.bookingType || 'FullDay',
        time: d.travelTime || '',
        from: d.from || '',
        to: d.to || '',
        amount: d.amount ?? null,
        endDrop: d.endDrop ?? null,
        startPickup: d.startPickup ?? null,
        fullDayHours: d.fullDayHours ?? null,
      }));
    }

    // Trip of the booking being edited, or the trip a new booking is being added to
    this.tripId = data?.tripId ?? data?.prefill?.tripId ?? null;
    if (data?.tripStayName || data?.prefill?.stay?.name) {
      this.stay = data.prefill?.stay ?? { name: data.tripStayName, mapsLink: data.tripStayMapsLink ?? null };
    }

    // "+ Add booking for this customer": only fills the form, it is not an edit
    if (data?.prefill) {
      this.bookingForm.patchValue({
        bookingId: null,
        customerName: data.prefill.customerName ?? '',
        customerNumber: data.prefill.customerNumber ?? '',
        pax: data.prefill.pax ?? '',
        agent: data.prefill.travelAgentId ? Number(data.prefill.travelAgentId) : null,
      });
      this.returningDismissed = true;
    } else if (data) {
      this.isEditMode = true;
      const patch: any = { ...data };
      if (data.vehicle && typeof data.vehicle === 'object') {
        patch.vehicle = data.vehicle.vehicleId ?? data.vehicleId ?? '';
      }
      patch.driver = data.driver ?? data.userid ?? patch.driver;
      if (Array.isArray(patch.from)) patch.from = patch.from[0];
      if (Array.isArray(patch.to)) patch.to = patch.to[0];
      // List rows carry the partner as an object — the form needs its name and number.
      // Patching the raw object put "[object Object]" in the name field and broke saving.
      if (data.externalEmployee && typeof data.externalEmployee === 'object') {
        patch.externalEmployee = data.externalEmployee.externalEmployeeName ?? '';
        patch.externalEmployeeNumber = data.externalEmployee.externalEmployeeNumber ?? '';
        patch.isExternalBooking = true;
      }
      if (data.customer && typeof data.customer === 'object') {
        patch.customerName = data.customer.customerName ?? patch.customerName;
        patch.customerNumber = data.customer.customerNumber ?? patch.customerNumber;
      }
      delete patch.customer;
      delete patch.vehicleId;
      this.bookingForm.patchValue(patch);
    }

    // Initialise custom time picker from existing traveltime value
    const existingTime: string = data?.traveltime ?? '';
    if (existingTime) {
      // Normalise: strip seconds if present (e.g. "18:30:00" -> "18:30")
      const cleaned = existingTime.trim().replace(/^(\d{1,2}:\d{2}):\d{2}\s*$/, '$1');
      const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const rawMin = parseInt(match[2], 10);
        const ampmStr = (match[3] ?? '').toUpperCase();
        if (ampmStr === 'AM' || ampmStr === 'PM') {
          this.timeAmPm = ampmStr as 'AM' | 'PM';
          this.timeHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        } else {
          this.timeAmPm = h >= 12 ? 'PM' : 'AM';
          this.timeHour = h % 12 === 0 ? 12 : h % 12;
        }
        const rounded = Math.round(rawMin / 5) * 5;
        this.timeMinute = this.pad(rounded >= 60 ? 55 : rounded);
      }
      this.updateMainTime();
    }
  }

  get dayWiseBookings(): FormArray {
    return this.bookingForm.get('dayWiseBookings') as FormArray;
  }

  get isExternalBooking(): boolean {
    return this.bookingForm.get('isExternalBooking')?.value === true;
  }

  get isPackage(): boolean {
    return this.bookingForm.get('isPackage')?.value === true;
  }

  /** Rent-a-car placeholders ("RENTAL-…") are offered only for self-drive rentals. */
  get vehicleOptions(): any[] {
    const all: any[] = Array.isArray(this.vehcilesType) ? this.vehcilesType : this.vehcilesType?.data ?? [];
    if (this.isSelfDriveRental) return all;
    const current = this.bookingForm.get('vehicle')?.value;
    return all.filter((v) => !/^RENTAL-/i.test(v.vehicleNumber ?? '') || v.vehicleId === current);
  }

  pickEndDrop() {
    const ref = this._matDialog.open(LocationPickerComponent, {
      width: '520px', maxWidth: '100vw', height: '90vh', maxHeight: '90vh', panelClass: 'lp-dialog-panel',
      data: { current: this.bookingForm.get('endDrop')?.value ?? '', label: 'End with a drop at' },
    });
    ref.afterClosed().subscribe((picked: PickedLocation | null) => {
      if (picked) this.bookingForm.patchValue({ endDrop: picked.name });
    });
  }

  /** Pickup chosen: the trip starts there and (unless set) goes to the hotel. */
  setStartPickup(value: string) {
    const patch: any = { startPickup: value, from: value };
    if (!this.bookingForm.get('to')?.value && this.stay?.name) patch.to = this.stay.name;
    this.bookingForm.patchValue(patch);
  }

  setDayPickup(i: number, value: string) {
    const d = this.days[i];
    if (!d) return;
    d.startPickup = value;
    d.from = value;
    if (!d.to && this.stay?.name) d.to = this.stay.name;
  }

  pickStartPickup() {
    const ref = this._matDialog.open(LocationPickerComponent, {
      width: '520px', maxWidth: '100vw', height: '90vh', maxHeight: '90vh', panelClass: 'lp-dialog-panel',
      data: { current: this.bookingForm.get('startPickup')?.value ?? '', label: 'Start with a pickup at' },
    });
    ref.afterClosed().subscribe((picked: PickedLocation | null) => {
      if (picked) this.setStartPickup(picked.name);
    });
  }

  pickDayStartPickup(i: number) {
    const ref = this._matDialog.open(LocationPickerComponent, {
      width: '520px', maxWidth: '100vw', height: '90vh', maxHeight: '90vh', panelClass: 'lp-dialog-panel',
      data: { current: this.days[i]?.startPickup ?? '', label: 'Start with a pickup at' },
    });
    ref.afterClosed().subscribe((picked: PickedLocation | null) => {
      if (picked) this.setDayPickup(i, picked.name);
    });
  }

  pickDayEndDrop(i: number) {
    const ref = this._matDialog.open(LocationPickerComponent, {
      width: '520px', maxWidth: '100vw', height: '90vh', maxHeight: '90vh', panelClass: 'lp-dialog-panel',
      data: { current: this.days[i]?.endDrop ?? '', label: 'End with a drop at' },
    });
    ref.afterClosed().subscribe((picked: PickedLocation | null) => {
      if (picked && this.days[i]) this.days[i].endDrop = picked.name;
    });
  }

  get isSelfDriveRental(): boolean {
    return this.bookingForm.get('bookingType')?.value === 'SelfDriveRental';
  }

  get remaining(): number {
    const total = this.n(this.bookingForm.get('amount')?.value);
    const advance = this.n(this.bookingForm.get('advancePaid')?.value);
    return total - advance;
  }

  /** What the partner keeps after our commission — null until both amounts are entered. */
  get partnerEarning(): number | null {
    const fare = this.bookingForm.get('amount')?.value;
    const com = this.bookingForm.get('commissionAmount')?.value;
    if (fare === '' || fare == null || com === '' || com == null) return null;
    return Math.max(0, this.n(fare) - this.n(com));
  }

  get packageEndDate(): Date | null {
    const start = this.bookingForm.get('packageStartDate')?.value;
    const days = this.n(this.bookingForm.get('packageDays')?.value);
    if (!start || days < 1) return null;
    const d = new Date(start);
    d.setDate(d.getDate() + days - 1);
    return d;
  }

  /** Clean up a phone input. Writes back to the field being typed in — it used to always
   *  write to customerNumber, so typing the driver's number overwrote the customer's. */
  normalizePhone(event: any, controlName: 'customerNumber' | 'externalEmployeeNumber' = 'customerNumber') {
    let value = event.target.value || '';
    value = value.replace(/[^0-9+]/g, '');
    if (value.startsWith('+91')) {
      value = '+91 ' + value.replace('+91', '').trim();
    }
    const digits = value.replace(/\D/g, '');
    if (digits.length > 12) {
      value = value.slice(0, value.length - 1);
    }
    this.bookingForm.get(controlName)?.setValue(value, { emitEvent: false });
  }

  createDayGroup(day?: any) {
    return this._fb.group({
      travelDate: [day?.travelDate ?? ''],
      from: [day?.from ?? this.bookingForm.get('from')!.value ?? ''],
      to: [day?.to ?? this.bookingForm.get('to')!.value ?? ''],
      travelTime: [
        day?.travelTime ?? this.bookingForm.get('travelTime')!.value ?? '',
      ],
      bookingType: [
        day?.bookingType ?? this.bookingForm.get('bookingType')!.value ?? '',
      ],
      amount: [day?.amount ?? 0],
    });
  }

  addDay(day?: any) {
    this.dayWiseBookings.push(this.createDayGroup(day));
  }

  removeDay(index: number) {
    this.dayWiseBookings.removeAt(index);
  }

  incDays() {
    this.addPackageDay();
  }

  decDays() {
    if (this.days.length > 2) this.removePackageDay(this.days.length - 1);
  }

  private static shiftDate(iso: string, by: number): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + by);
    const p = (n: number) => (n < 10 ? '0' + n : String(n));
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** "09:00 AM" → "09:00" for sorting days that share a date. */
  private sortTime(t: string): string {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(t || '');
    if (!m) return '99:99';
    let h = parseInt(m[1], 10) % 12;
    if ((m[3] || '').toUpperCase() === 'PM') h += 12;
    return `${h < 10 ? '0' + h : h}:${m[2]}`;
  }

  /** Fresh package: airport pickup on day 1, airport drop on the last day. */
  private initPackageDays() {
    const start = this.bookingForm.get('packageStartDate')?.value;
    const first = start ? this.localDate(new Date(start)) : '';
    const h = this.stay?.name ?? '';
    this.days = [
      { date: first, type: 'AirportPickup', time: '', from: '', to: h, amount: null },
      { date: BookingFormComponent.shiftDate(first, 1), type: 'AirportDrop', time: '', from: h, to: '', amount: null },
    ];
    this.syncPackageDays();
  }

  /** New days go before the airport drop (the drop moves one day later). */
  addPackageDay() {
    const last = this.days[this.days.length - 1];
    const h = this.stay?.name ?? '';
    const day: PackageDay = { date: last?.date ?? '', type: 'SightSeeing', time: '09:00 AM', from: h, to: '', amount: null };
    if (last && last.type === 'AirportDrop') {
      this.days.splice(this.days.length - 1, 0, day);
      last.date = BookingFormComponent.shiftDate(last.date, 1);
    } else {
      day.date = BookingFormComponent.shiftDate(last?.date ?? '', 1);
      this.days.push(day);
    }
    this.syncPackageDays();
  }

  removePackageDay(i: number) {
    if (this.days.length <= 2) return;
    this.days.splice(i, 1);
    this.syncPackageDays();
  }

  /** Keeps the day-count stepper, the amounts and the total consistent with the rows. */
  syncPackageDays() {
    this.bookingForm.get('packageDays')!.setValue(this.days.length, { emitEvent: false });
    this.recalcAmounts();
  }

  /** Start date changed: days follow one after another from it (any day can then be moved). */
  onPackageStartChange(value: any) {
    if (!value) return;
    const first = this.localDate(new Date(value));
    this.days.forEach((d, i) => (d.date = BookingFormComponent.shiftDate(first, i)));
  }

  setAmountMode(mode: 'split' | 'each') {
    this.amountMode = mode;
    this.recalcAmounts();
  }

  /** Split: spread the total in whole rupees (remainder on the last day). Each: total = sum of days. */
  recalcAmounts() {
    if (!this.days.length) return;
    if (this.amountMode === 'split') {
      const total = Math.max(0, Math.round(this.n(this.bookingForm.get('amount')?.value)));
      const each = Math.floor(total / this.days.length);
      this.days.forEach((d, i) => (d.amount = i === this.days.length - 1 ? total - each * (this.days.length - 1) : each));
    } else {
      const sum = this.days.reduce((s, d) => s + this.n(d.amount), 0);
      this.bookingForm.get('amount')!.setValue(sum, { emitEvent: false });
    }
  }

  /** Changing one day's amount in split mode switches to "each day" so the change is kept. */
  onDayAmountChange(day: PackageDay, value: any) {
    day.amount = value === '' || value === null ? null : this.n(value);
    if (this.amountMode === 'split') this.amountMode = 'each';
    this.recalcAmounts();
  }

  /** Sensible From / To for the chosen type, using the hotel (only fills empty fields). */
  onDayTypeChange(day: PackageDay) {
    const h = this.stay?.name;
    if (!h) return;
    if (day.type === 'AirportPickup' || day.type === 'RailwayStation') {
      if (!day.to) day.to = h;
    } else if (!day.from) {
      day.from = h;
    }
  }

  /** Previous day's drop point, offered as a quick button. */
  prevDrop(i: number): string {
    return i > 0 ? this.days[i - 1].to : '';
  }

  setDayPlace(i: number, field: 'from' | 'to', value: string) {
    if (this.days[i]) this.days[i][field] = value;
  }

  setPlace(field: 'from' | 'to', value: string) {
    this.bookingForm.patchValue({ [field]: value });
  }

  dayLabel(d: PackageDay): string {
    if (!d.date) return '';
    return new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  trackDay = (i: number) => i;

  // ── Hotel / stay ──────────────────────────────────────────────────────

  pickStay() {
    const ref = this._matDialog.open(LocationPickerComponent, {
      width: '520px', maxWidth: '100vw', height: '90vh', maxHeight: '90vh', panelClass: 'lp-dialog-panel',
      data: { current: this.stay?.name ?? '', label: 'Hotel / stay' },
    });
    ref.afterClosed().subscribe((picked: PickedLocation | null) => {
      if (!picked) return;
      const old = this.stay?.name;
      this.stay = { name: picked.name, lat: picked.lat, lng: picked.lng, mapsLink: picked.mapsLink };
      // Days that used the old hotel (or are empty where a hotel belongs) get the new one
      for (const d of this.days) {
        if (old && d.from === old) d.from = picked.name;
        if (old && d.to === old) d.to = picked.name;
        this.onDayTypeChange(d);
      }
    });
  }

  clearStay() {
    this.stay = null;
  }

  // ── Returning customer ────────────────────────────────────────────────

  private watchReturningCustomer() {
    this.bookingForm.get('customerNumber')!.valueChanges
      .pipe(
        map((v) => String(v ?? '').replace(/\D/g, '').slice(-10)),
        filter((digits) => digits.length === 10),
        distinctUntilChanged(),
        debounceTime(400),
        switchMap((digits) => this._tripService.byCustomer(digits).pipe(catchError(() => of(null))))
      )
      .subscribe((res) => {
        this.returning = res?.customer ? res : null;
        // Fill the name when it is still empty
        if (this.returning && !String(this.bookingForm.get('customerName')?.value ?? '').trim())
          this.bookingForm.patchValue({ customerName: this.returning.customer!.customerName });
      });
  }

  /** Banner only for a new booking that is not already joining a trip. */
  get showReturning(): boolean {
    return !!this.returning && !this.returningDismissed && !this.isEditMode && !this.tripId;
  }

  joinTrip(t: TripSummary) {
    this.tripId = t.tripId;
    if (t.stayName) this.stay = { name: t.stayName, lat: t.stayLat, lng: t.stayLng, mapsLink: t.stayMapsLink };
    if (!this.n(this.bookingForm.get('pax')?.value) && t.pax) this.bookingForm.patchValue({ pax: t.pax });
    for (const d of this.days) this.onDayTypeChange(d);
  }

  leaveTrip() {
    this.tripId = null;
    this.returningDismissed = false;
  }

  tripRange(t: { startDate: string; endDate: string }): string {
    const f = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return t.startDate === t.endDate ? f(t.startDate) : `${f(t.startDate)} – ${f(t.endDate)}`;
  }

  private localDate(d: Date): string {
    const p = (n: number) => n < 10 ? '0' + n : String(n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  openDayLocationPicker(field: 'from' | 'to', index: number) {
    const current = this.days[index]?.[field] ?? '';
    const ref = this._matDialog.open(LocationPickerComponent, {
      width: '520px',
      maxWidth: '100vw',
      height: '90vh',
      maxHeight: '90vh',
      panelClass: 'lp-dialog-panel',
      data: { current, label: field === 'from' ? 'From Location' : 'To Location' },
    });
    ref.afterClosed().subscribe((picked: PickedLocation | null) => {
      if (!picked || !this.days[index]) return;
      this.days[index][field] = picked.name;
    });
  }

  ngOnInit() {
    this.filteredFrom$ = this.bookingForm.get('from')!.valueChanges.pipe(
      startWith(this.bookingForm.get('from')!.value || ''),
      map((v) => this._filterStates(v))
    );

    this.filteredTo$ = this.bookingForm.get('to')!.valueChanges.pipe(
      startWith(this.bookingForm.get('to')!.value || ''),
      map((v) => this._filterStates(v))
    );
    this.filteredPartners$ = this.bookingForm.get('externalEmployee')!.valueChanges.pipe(
      startWith(this.bookingForm.get('externalEmployee')!.value || ''),
      map((v) => this._filterPartners(v))
    );
    this.generateTimeSlots();
    this.loadEmployees();
    this.loadVehciles();
    this.loadAgents();
    this.loadPartners();

    // Ticking "Package" starts with pickup + drop days; the start date lays the days out
    this.bookingForm.get('isPackage')!.valueChanges.subscribe((on) => {
      if (on && !this.days.length) this.initPackageDays();
    });
    this.bookingForm.get('packageStartDate')!.valueChanges.subscribe((v) => this.onPackageStartChange(v));
    this.bookingForm.get('amount')!.valueChanges.subscribe(() => {
      if (this.amountMode === 'split') this.recalcAmounts();
    });
    this.watchReturningCustomer();

    this.bookingForm.get('isExternalBooking')?.valueChanges.subscribe((isExt) => {
      if (isExt) {
        this.bookingForm.patchValue({ vehicle: null, driver: null, ownerPay: 0 });
      } else {
        this.bookingForm.patchValue({
          externalEmployee: null,
          externalEmployeeNumber: null,
          commissionAmount: null,
        });
      }
    });
  }

  private _filterStates(value: string): string[] {
    const filter = (value || '').toString().toLowerCase();
    return this.states.filter((s) => s.toLowerCase().includes(filter));
  }

  private static last10(v: any): string {
    return String(v ?? '').replace(/\D/g, '').slice(-10);
  }

  /** Matches on name or on phone digits, so "shehen" and "98789" both find Shehensha. */
  private _filterPartners(value: any) {
    const text = String(value ?? '').trim().toLowerCase();
    const digits = text.replace(/\D/g, '');
    const list = !text
      ? this.partners
      : this.partners.filter(
          (p) => p.name.toLowerCase().includes(text) || (digits.length >= 3 && p.number.replace(/\D/g, '').includes(digits))
        );
    return list.slice(0, 20);
  }

  loadPartners() {
    this._bookingService.getExternalEmployees().subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        // The same partner can be stored more than once ("+91 98…" and "98…") — show them once
        const byNumber = new Map<string, { id: number; name: string; number: string }>();
        for (const e of raw) {
          const name = String(e.externalEmployeeName ?? '').trim();
          const number = String(e.externalEmployeeNumber ?? '').trim();
          const key = BookingFormComponent.last10(number);
          if (!name || key.length < 10 || byNumber.has(key)) continue;
          byNumber.set(key, { id: e.externalEmployeeID, name, number });
        }
        this.partners = [...byNumber.values()].sort((a, b) => a.name.localeCompare(b.name));
        // Re-run the filter so the list is ready the first time the field is focused
        const ctrl = this.bookingForm.get('externalEmployee')!;
        ctrl.setValue(ctrl.value, { emitEvent: true });
      },
      error: () => (this.partners = []),
    });
  }

  pickPartner(p: { name: string; number: string }) {
    this.bookingForm.patchValue({ externalEmployee: p.name, externalEmployeeNumber: p.number });
    this.bookingForm.get('externalEmployeeNumber')?.markAsTouched();
  }

  /** Typed the number of a saved partner but left the name empty — fill it in. */
  fillPartnerNameFromNumber() {
    const name = String(this.bookingForm.get('externalEmployee')?.value ?? '').trim();
    if (name) return;
    const key = BookingFormComponent.last10(this.bookingForm.get('externalEmployeeNumber')?.value);
    if (key.length < 10) return;
    const match = this.partners.find((p) => BookingFormComponent.last10(p.number) === key);
    if (match) this.bookingForm.patchValue({ externalEmployee: match.name });
  }

  loadAgents() {
    this._agentService.getAllAgents().subscribe({
      next: (agent: any) => {
        this.agentTypes = agent;
        if (this.isEditMode && this.data?.travelAgentId != null) {
          this.bookingForm.patchValue({ agent: Number(this.data.travelAgentId) });
        }
      },
    });
  }

  loadEmployees() {
    this._employeeService.getAllEmployees().subscribe({
      next: (data: any) => {
        this.driverType = data;
        if (this.isEditMode && this.data?.userid != null) {
          this.bookingForm.patchValue({ driver: Number(this.data.userid) });
        }
      },
    });
  }

  loadVehciles() {
    this._vechileService.getAllVehicles(true).subscribe({
      next: (data: any) => {
        this.vehcilesType = data;
        if (this.isEditMode) {
          const vid = this.data?.vehicle?.vehicleId ?? this.data?.vehicleId ?? null;
          if (vid != null) this.bookingForm.patchValue({ vehicle: Number(vid) });
        }
      },
    });
  }

  generateTimeSlots() {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const suffix = hour < 12 ? 'AM' : 'PM';
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        const formatted = `${this.pad(hour12)}:${this.pad(min)} ${suffix}`;
        times.push(formatted);
      }
    }
    this.times = times;
  }

  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  readonly email = new FormControl('', [Validators.required, Validators.email]);

  states: string[] = [
    'Airport',
    'Railway Station',
    'Mopa Airport',
    'Vasco',
    'Calangute',
    'Baga',
    'Candolim',
    'Saligav',
    'Anjuna',
    'Vagator',
    'Arpora',
    'Nerul',
    'Panjim',
    'Mapusa',
  ];
  errorMessage = '';

  private fmtDate(d: any): string {
    if (!d) return this.localDate(new Date());
    if (d instanceof Date) return this.localDate(d);
    return d;
  }

  private n(val: any): number {
    const v = Number(val);
    return isNaN(v) ? 0 : v;
  }

  /** Everything that would make the booking wrong or fail on save, in plain words. */
  validationErrors(): string[] {
    const f = this.bookingForm.value;
    const errs: string[] = [];
    const c = (name: string) => this.bookingForm.get(name);

    if (!String(f.customerName ?? '').trim()) errs.push('Customer name is required.');
    if (c('customerNumber')?.invalid) errs.push('Enter a valid 10-digit customer number.');

    const amount = this.n(f.amount);
    if (amount < 0) errs.push('Amount cannot be negative.');
    if (this.n(f.advancePaid) < 0) errs.push('Advance cannot be negative.');
    if (amount > 0 && this.n(f.advancePaid) > amount) errs.push('Advance cannot be more than the amount.');

    if (f.isPackage) {
      // An empty date became 1 Jan 1970 for that day of the package
      if (this.days.length < 2) errs.push('A package needs at least 2 days.');
      this.days.forEach((d, i) => {
        if (!d.date) errs.push(`Choose the date of day ${i + 1}.`);
        if (d.type === 'FullDay' && !d.fullDayHours) errs.push(`Day ${i + 1}: choose Full Day 8 hr / 80 km or 12 hr / 120 km.`);
        if (this.n(d.amount) < 0) errs.push(`Day ${i + 1} amount cannot be negative.`);
      });
    } else {
      // An empty date was silently saved as today
      if (!f.travelDate) errs.push('Choose the travel date.');
      if (f.bookingType === 'FullDay' && !f.fullDayHours) errs.push('Choose Full Day 8 hr / 80 km or 12 hr / 120 km.');
      if (f.bookingType === 'SelfDriveRental') {
        if (!f.returnDate) errs.push('Choose the return date for the rental.');
        else if (f.travelDate && new Date(f.returnDate) < new Date(f.travelDate)) errs.push('Return date cannot be before the travel date.');
      }
    }

    if (f.isExternalBooking) {
      if (!String(f.externalEmployee ?? '').trim()) errs.push('Enter the partner / driver name.');
      if (!String(f.externalEmployeeNumber ?? '').trim() || c('externalEmployeeNumber')?.invalid)
        errs.push('Enter a valid 10-digit partner number.');
      const com = f.commissionAmount;
      if (com === null || com === undefined || com === '') errs.push('Enter your commission (0 if none).');
      else if (this.n(com) < 0) errs.push('Commission cannot be negative.');
      else if (this.n(com) > amount) errs.push('Commission cannot be more than the amount.');
    }
    return errs;
  }

  /** Readable message from any API error (ApiResponse, ASP.NET validation problem, network). */
  private apiError(err: any): string {
    const e = err?.error;
    if (typeof e?.message === 'string' && e.message) return e.message;
    if (e?.errors && typeof e.errors === 'object' && !Array.isArray(e.errors)) {
      const first = Object.values(e.errors).flat().find((m) => typeof m === 'string');
      if (first) return String(first);
    }
    if (typeof e?.title === 'string') return e.title;
    if (err?.status === 0) return 'No connection to the server. Check your internet and try again.';
    return 'Save failed. Please try again.';
  }

  onFormSubmit() {
    const errs = this.validationErrors();
    if (errs.length) {
      this.bookingForm.markAllAsTouched();
      this._toastr.warning(errs.join('<br>'), 'Please check the booking', { enableHtml: true });
      return;
    }

    this.isSubmitting = true;
    const f = this.bookingForm.value;
    let payload: any;

    if (f.isPackage) {
      // Days in date order; each keeps its own type, time, route and amount
      const ordered = [...this.days].sort((a, b) => (a.date + this.sortTime(a.time)).localeCompare(b.date + this.sortTime(b.time)));
      const dayWiseBookings = ordered.map((d) => ({
        travelDate: d.date,
        from: d.from || '',
        to: d.to || '',
        travelTime: d.time || '',
        bookingType: d.type || 'FullDay',
        amount: this.n(d.amount),
        endDrop: supportsEndDrop(d.type) ? d.endDrop || null : null,
        startPickup: supportsEndDrop(d.type) ? d.startPickup || null : null,
        fullDayHours: d.type === 'FullDay' ? d.fullDayHours ?? null : null,
      }));
      const total = dayWiseBookings.reduce((sum, d) => sum + d.amount, 0);
      const start = new Date(ordered[0].date + 'T00:00:00');
      payload = {
        bookingId: f.bookingId || 0,
        customerName: f.customerName,
        customerNumber: f.customerNumber,
        dayWiseBookings,
        tripId: this.tripId,
        stay: this.stay,
        bookingDate: this.localDate(start),
        pax: this.n(f.pax),
        vehicleId: this.n(f.vehicle),
        userId: this.n(f.driver),
        payment: f.payment,
        travelAgentId: this.n(f.agent),
        customerWillPay: this.n(f.customerPay),
        ownerWillPay: this.n(f.ownerPay),
        amount: total,
        advancePaid: this.n(f.advancePaid),
      };
    } else {
      payload = {
        bookingId: f.bookingId || 0,
        customerName: f.customerName,
        customerNumber: f.customerNumber,
        dayWiseBookings: [],
        bookingDate: this.fmtDate(f.travelDate),
        travelTime: f.travelTime,
        from: f.from,
        to: f.to,
        pax: this.n(f.pax),
        vehicleId: this.n(f.vehicle),
        userId: this.n(f.driver),
        bookingType: f.bookingType,
        payment: f.payment,
        travelAgentId: this.n(f.agent),
        customerWillPay: this.n(f.customerPay),
        ownerWillPay: this.n(f.ownerPay),
        amount: this.n(f.amount),
        advancePaid: this.n(f.advancePaid),
        externalEmployee: f.isExternalBooking ? f.externalEmployee : null,
        externalEmployeeNumber: f.isExternalBooking ? f.externalEmployeeNumber : null,
        commissionAmount: f.isExternalBooking ? f.commissionAmount : null,
        returnDate: f.bookingType === 'SelfDriveRental' && f.returnDate
          ? this.fmtDate(f.returnDate)
          : null,
        tripId: this.tripId,
        stay: this.stay,
        endDrop: supportsEndDrop(f.bookingType) ? f.endDrop || null : null,
        startPickup: supportsEndDrop(f.bookingType) ? f.startPickup || null : null,
        fullDayHours: f.bookingType === 'FullDay' ? f.fullDayHours ?? null : null,
      };
    }

    this._bookingService.newBooking(payload).subscribe({
      next: (res: any) => {
        this._bookingService.loadBookings().subscribe();
        // Refresh the calendar / lists now — don't rely only on the live SignalR message,
        // which may not be connected (the new booking used to appear only after a page change)
        this._bookingService.notifyBookingUpdated();
        this._toastr.success(
          f.isExternalBooking ? 'Partner booking saved — you will find it under Extra (partner bookings are not on the calendar).' : res.message || 'Booking saved'
        );
        this._dilog.closeAll();
        this.isSubmitting = false;
      },
      error: (err) => {
        this._toastr.error(this.apiError(err), 'Booking not saved');
        this.isSubmitting = false;
      },
    });
  }

  updateMainTime() {
    const timeStr = `${this.pad(this.timeHour)}:${this.timeMinute} ${this.timeAmPm}`;
    this.bookingForm.patchValue({ travelTime: timeStr });
  }

  setAmPm(val: 'AM' | 'PM') {
    this.timeAmPm = val;
    this.updateMainTime();
  }

  openLocationPicker(field: 'from' | 'to', label: string, dayIndex?: number) {
    const pkgField = field === 'from' ? 'packageFrom' : 'packageTo';
    const isPackageField = dayIndex === undefined && this.isPackage;
    const current =
      dayIndex !== undefined
        ? this.dayWiseBookings.at(dayIndex).get(field)?.value ?? ''
        : isPackageField
          ? this.bookingForm.get(pkgField)?.value ?? ''
          : this.bookingForm.get(field)?.value ?? '';

    const ref = this._matDialog.open(LocationPickerComponent, {
      width: '520px',
      maxWidth: '100vw',
      height: '90vh',
      maxHeight: '90vh',
      panelClass: 'lp-dialog-panel',
      data: { current, label },
    });

    ref.afterClosed().subscribe((picked: PickedLocation | null) => {
      if (!picked) return;
      if (dayIndex !== undefined) {
        this.dayWiseBookings.at(dayIndex).patchValue({ [field]: picked.name });
      } else if (isPackageField) {
        this.bookingForm.patchValue({ [pkgField]: picked.name });
      } else {
        this.bookingForm.patchValue({ [field]: picked.name });
      }
    });
  }

  clossBooking() {
    this._dilog.closeAll();
  }
}

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
import { map, Observable, startWith } from 'rxjs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  LocationPickerComponent,
  PickedLocation,
} from '../../shared/location-picker/location-picker.component';

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
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.css',
})
export class BookingFormComponent implements OnInit {
  BookingType = [
    'AirportPickup',
    'AirportDrop',
    'RailwayStation',
    'FullDay',
    'SightSeeing',
    'Shuttle',
    'Notspecified',
  ];

  isSubmitting = false;
  bookingForm!: FormGroup;
  paytypes = ['Admin', 'ExternalEmployee'];
  driverType: any = [];
  vehcilesType: any = [];
  agentTypes: any = [];
  times: string[] = [];
  isEditMode = false;
  isPackage = false;

  // Custom time picker state
  timeHour = 12;
  timeMinute = '00';
  timeAmPm: 'AM' | 'PM' = 'AM';
  hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  filteredFrom$!: Observable<string[]>;
  filteredTo$!: Observable<string[]>;

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
      ownerPay: data?.ownerPay ?? null,
      customerPay: data?.customerPay ?? null,
      agent: data?.travelAgentId ? Number(data.travelAgentId) : null,
      isPackage: [false],
      dayWiseBookings: this._fb.array([]),
      advancePaid: data?.advancePaid ?? null,
      isExternalBooking: [data?.externalEmployeeNumber ? true : false],
      externalEmployee: [data?.externalEmployee ?? null],
      externalEmployeeNumber: [
        data?.externalEmployeeNumber ?? null,
        [Validators.pattern(/^(\+91\s*|91\s*|0)?[6-9][0-9]{9}$/)],
      ],
      commissionAmount: [data?.commissionAmount ?? null],
    });

    if (data?.dayWiseBookings?.length) {
      this.bookingForm.patchValue({ isPackage: true });
      data.dayWiseBookings.forEach((d: any) => this.addDay(d));
    }

    if (data) {
      this.isEditMode = true;
      const patch: any = { ...data };
      if (data.vehicle && typeof data.vehicle === 'object') {
        patch.vehicle = data.vehicle.vehicleId ?? data.vehicleId ?? '';
      }
      patch.driver = data.driver ?? data.userid ?? patch.driver;
      if (Array.isArray(patch.from)) patch.from = patch.from[0];
      if (Array.isArray(patch.to)) patch.to = patch.to[0];
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

  normalizePhone(event: any) {
    let value = event.target.value || '';
    value = value.replace(/[^0-9+]/g, '');
    if (value.startsWith('+91')) {
      value = '+91 ' + value.replace('+91', '').trim();
    }
    const digits = value.replace(/\D/g, '');
    if (digits.length > 12) {
      value = value.slice(0, value.length - 1);
    }
    this.bookingForm.get('customerNumber')?.setValue(value, { emitEvent: false });
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

  ngOnInit() {
    this.filteredFrom$ = this.bookingForm.get('from')!.valueChanges.pipe(
      startWith(this.bookingForm.get('from')!.value || ''),
      map((v) => this._filterStates(v))
    );

    this.filteredTo$ = this.bookingForm.get('to')!.valueChanges.pipe(
      startWith(this.bookingForm.get('to')!.value || ''),
      map((v) => this._filterStates(v))
    );
    this.generateTimeSlots();
    this.loadEmployees();
    this.loadVehciles();
    this.loadAgents();

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

  toggleFields() {
    this.isPackage = !this.isPackage;
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
    this._vechileService.getAllVehicles().subscribe({
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

  onFormSubmit() {
    if (!this.bookingForm.valid) {
      this._toastr.warning('Please fill all required fields');
      return;
    }

    this.isSubmitting = true;
    const f = this.bookingForm.value;
    let payload: any;

    if (f.isPackage && f.dayWiseBookings && f.dayWiseBookings.length) {
      payload = {
        bookingId: f.bookingId || 0,
        customerName: f.customerName,
        customerNumber: f.customerNumber,
        dayWiseBookings: f.dayWiseBookings.map((d: any) => ({
          travelDate: d.travelDate,
          from: d.from,
          to: d.to,
          travelTime: d.travelTime,
          bookingType: d.bookingType,
          amount: d.amount,
        })),
        bookingDate: f.bookingDate ?? new Date().toISOString().split('T')[0],
        pax: f.pax,
        vehicleId: Number(f.vehicle),
        userId: Number(f.driver),
        payment: f.payment,
        travelAgentId: f.agent ?? 0,
        customerWillPay: f.customerPay ?? 0,
        ownerWillPay: f.ownerPay ?? 0,
        amount: f.amount ?? 0,
        advancePaid: f.advancePaid ?? 0,
      };
    } else {
      payload = {
        bookingId: f.bookingId || 0,
        customerName: f.customerName,
        customerNumber: f.customerNumber,
        dayWiseBookings: [],
        bookingDate: f.travelDate ?? new Date().toISOString().split('T')[0],
        travelTime: f.travelTime,
        from: f.from,
        to: f.to,
        pax: f.pax,
        vehicleId: Number(f.vehicle),
        userId: Number(f.driver),
        bookingType: f.bookingType,
        payment: f.payment,
        travelAgentId: f.agent ?? 0,
        customerWillPay: f.customerPay ?? 0,
        ownerWillPay: f.ownerPay ?? 0,
        amount: f.amount ?? 0,
        advancePaid: f.advancePaid ?? 0,
        externalEmployee: f.isExternalBooking ? f.externalEmployee : null,
        externalEmployeeNumber: f.isExternalBooking ? f.externalEmployeeNumber : null,
        commissionAmount: f.isExternalBooking ? f.commissionAmount : null,
      };
    }

    this._bookingService.newBooking(payload).subscribe({
      next: (res: any) => {
        this._bookingService.loadBookings().subscribe();
        this._toastr.success(res.message || 'Booking saved');
        this._dilog.closeAll();
        this.isSubmitting = false;
      },
      error: (err) => {
        this._toastr.error(err?.error?.message || 'Save failed');
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
    const current =
      dayIndex !== undefined
        ? this.dayWiseBookings.at(dayIndex).get(field)?.value ?? ''
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
      } else {
        this.bookingForm.patchValue({ [field]: picked.name });
      }
    });
  }

  clossBooking() {
    this._dilog.closeAll();
  }
}

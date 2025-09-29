import { Component, Inject } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
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

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [
    NgxMaterialTimepickerModule,
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
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './booking-form.component.html',
  styleUrl: './booking-form.component.css',
})
export class BookingFormComponent {
  BookingType = [
    'AirportPickup',
    'AirportDrop',
    'RailwayStation',
    'FullDay',
    'SightSeeing',
    'Shuttle',
    'Notspecified',
  ];
  bookingForm!: FormGroup;

  paytypes = ['Admin', 'ExternalEmployee'];

  driverType: any = [];

  vehcilesType: any = [];

  agentTypes: any = [];

  times: string[] = [];
  isEditMode = false;

  constructor(
    private _fb: FormBuilder,
    private _bookingService: BookingService,
    private _employeeService: EmployeeService,
    private _vechileService: VehicleService,
    private _agentService: AgentService,
    private _toastr: ToastrService,
    /*private _dialogRef:MatDialogRef<BookingComponent>*/ private _dilog: Dialog,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.bookingForm = _fb.group({
      bookingId: data?.bookingId ?? null,
      customerName: data?.customer?.customerName ?? '',
      // customerNumber: data?.customer?.customerNumber ?? '',
      customerNumber: [
        data?.customer?.customerNumber ?? '',
        [
          Validators.required,
          Validators.pattern(/^(\+91)?\d{10}$/), // +91 optional + 10 digits
        ],
      ],
      pax: data?.pax ?? '',
      from: Array.isArray(data?.from) ? data.from[0] : data?.from ?? '',
      to: Array.isArray(data?.to) ? data.to[0] : data?.to ?? '',
      travelDate: data?.travelDate ?? '',
      travelTime: data?.traveltime ?? '',
      driver: data?.userid ?? '',
      vehicle: data?.vehicleId ?? '',
      amount: data?.amount ?? '',
      bookingType: data?.bookingType ?? '',
      payment: data?.payment ?? '',
      ownerPay: data?.ownerPay ?? null,
      customerPay: data?.customerPay ?? null,
      agent: data?.travelAgentId ? Number(data.travelAgentId) : null,
    });

    if (data) {
      this.isEditMode = true;
      this.bookingForm.patchValue(data);
    }
  }

  ngOnInit() {
    this.generateTimeSlots();
    this.loadEmployees();
    this.loadVehciles();
    this.loadAgents();
  }

  loadAgents() {
    this._agentService.getAllAgents().subscribe({
      next: (agent: any) => {
        this.agentTypes = agent;
      },
      error: (err: any) => {
        console.error('Error fetching agents:', err);
      },
    });
  }

  loadEmployees() {
    this._employeeService.getAllEmployees().subscribe({
      next: (data: any) => {
        this.driverType = data;
      },
      error: (err: any) => {
        console.error('Error fetching employees:', err);
      },
    });
  }

  loadVehciles() {
    this._vechileService.getAllVehicles().subscribe({
      next: (data: any) => {
        this.vehcilesType = data;
      },
      error: (err: any) => {
        console.error('Error fetching vehicles:', err);
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
    if (this.bookingForm.valid) {
      console.log(this.bookingForm.value);
      this._bookingService.newBooking(this.bookingForm.value).subscribe({
        next: (val: any) => {
          this._bookingService.loadBookings().subscribe();
          this._toastr.success(val.message || 'Booking is added successfully');
        },
        error: (err: any) => {
          this._toastr.error(
            err?.error?.message || 'Error while adding booking',
            'Failed'
          );
        },
      });
      this._dilog.closeAll();
    }
  }
  clossBooking() {
    this._dilog.closeAll();
  }
}

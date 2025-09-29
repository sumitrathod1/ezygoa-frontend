import { Component } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { Dialog } from '@angular/cdk/dialog';
import { VehicleService } from '../../services/vehicle.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [
    NgxMaterialTimepickerModule,
    FormsModule,
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
  templateUrl: './vehicle-form.component.html',
  styleUrl: './vehicle-form.component.css',
})
export class VehicleFormComponent {
  vehicleForm!: FormGroup;

  vehicleTypes: string[] = [
    'HatchBack',
    'Sedan',
    'Suv',
    'TT17Seater',
    'TT20Seater',
    'Bus30Seater',
    'Bus40Seater',
    'Bus60Seater',
    'Notspecified',
  ];

  constructor(
    private _fb: FormBuilder,
    private _dilog: Dialog,
    private _vehicleService: VehicleService,
    private _toaster: ToastrService
  ) {
    this.vehicleForm = _fb.group({
      VehicleName: '',
      VehicleNumber: '',
      VehicleType: '',
      Seatingcapacity: '',
      RegistrationDate: '',
    });
  }

  onVehicleFormSubmit() {
    if (this.vehicleForm.valid) {
      const payload = {
        VehicleName: this.vehicleForm.value.VehicleName,
        VehicleNumber: this.vehicleForm.value.VehicleNumber,
        VehicleType: this.vehicleForm.value.VehicleType,
        RegistrationDate: new Date(this.vehicleForm.value.RegistrationDate)
          .toISOString()
          .split('T')[0],
        Seatingcapacity: this.vehicleForm.value.Seatingcapacity,
      };
      this._vehicleService.addVehicle(payload).subscribe({
        next: (res: any) => {
          this._dilog.closeAll();
          this._toaster.success('Vehicle Added Successfully', 'Success');
        },
        error: (err) => {
          this._toaster.error('Error while ading the vehicle:', err.message, {
            timeOut: 3000,
          });
        },
      });
    }
  }
  clossVehicle() {
    this._dilog.closeAll();
  }
}

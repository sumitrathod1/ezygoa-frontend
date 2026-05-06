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

  toUppercase(controlName: string) {
  const ctrl = this.vehicleForm.get(controlName);
  if (!ctrl) return;

  const value = ctrl.value;
  if (value) {
    ctrl.setValue(value.toUpperCase(), { emitEvent: false });
  }
}


  onVehicleFormSubmit() {
    if (this.vehicleForm.valid) {
      const formatDateOnly = (d: any) => {
        if (!d) return null;
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return null;
        dt.setHours(12, 0, 0, 0);
        return dt.toISOString().split('T')[0];
      };
      const payload = {
        VehicleName: this.vehicleForm.value.VehicleName,
        VehicleNumber: this.vehicleForm.value.VehicleNumber,
        VehicleType: this.vehicleForm.value.VehicleType,
        RegistrationDate: formatDateOnly(
          this.vehicleForm.value.RegistrationDate
        ),
        // RegistrationDate: new Date(this.vehicleForm.value.RegistrationDate)
        //   .toISOString()
        //   .split('T')[0],
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

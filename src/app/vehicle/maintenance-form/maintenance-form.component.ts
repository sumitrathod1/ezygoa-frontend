import { Component, Inject } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { VehicleService } from '../../services/vehicle.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-maintenance-form',
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
  templateUrl: './maintenance-form.component.html',
  styleUrl: './maintenance-form.component.css',
})
export class MaintenanceFormComponent {
  maintenanceForm!: FormGroup;
  maintenanceTypes = ['oilChange', 'TireChange', 'Service'];

  constructor(
    private _fb: FormBuilder,
    private _dialog: MatDialog,
    private _vehicleService: VehicleService,
    private _toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.maintenanceForm = _fb.group({
      vehicleID: data?.vehicleID || '',
      serviceDate: '',
      nextduedate: '',
      description: '',
      cost: '',
      maintenanceType: '',
    });
  }

  onMaintenanceFormSubmit() {
    if (this.maintenanceForm.valid) {
      console.log('Maintenance Form Submitted:', this.maintenanceForm.value);
      this._vehicleService
        .addMaintenance(this.maintenanceForm.value)
        .subscribe({
          next: (val: any) => {
            this._toastr.success('Maintenance added successfully:', 'Success');
          },
          error: (err: any) => {
            this._toastr.error('Error adding maintenance:', err);
          },
        });
      this._dialog.closeAll();
    }
  }

  onCloseMaintenance() {
    this._dialog.closeAll();
  }
}

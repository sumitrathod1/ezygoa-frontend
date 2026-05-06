import { Component, Inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VehicleService } from '../../services/vehicle.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-maintenance-form',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, MatDialogModule],
  templateUrl: './maintenance-form.component.html',
  styleUrl: './maintenance-form.component.css',
})
export class MaintenanceFormComponent {
  maintenanceForm!: FormGroup;
  maintenanceTypes = ['oilChange', 'TireChange', 'Service'];
  isSubmitting = false;

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
    if (this.maintenanceForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this._vehicleService.addMaintenance(this.maintenanceForm.value).subscribe({
        next: () => {
          this._toastr.success('Maintenance added successfully', 'Success');
          this._dialog.closeAll();
        },
        error: (err: any) => {
          this.isSubmitting = false;
          this._toastr.error('Error adding maintenance', err?.message || '');
        },
      });
    }
  }

  onCloseMaintenance() {
    this._dialog.closeAll();
  }
}

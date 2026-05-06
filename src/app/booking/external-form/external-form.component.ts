import { Component, Inject } from '@angular/core';
import {
  MatFormField,
  MatFormFieldModule,
  MatLabel,
} from '@angular/material/form-field';
import {
  MatSelect,
  MatOption,
  MatSelectModule,
} from '@angular/material/select';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { BookingService } from '../../services/booking.service';

@Component({
  selector: 'app-external-form',
  standalone: true,
  imports: [
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    ReactiveFormsModule,
    FormsModule,
    NgxMaterialTimepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatGridListModule,
  ],
  templateUrl: './external-form.component.html',
  styleUrl: './external-form.component.css',
})
export class ExternalFormComponent {
  externalForm!: FormGroup;

  constructor(
    private _fb: FormBuilder,
    private _dialog: MatDialog,
    private _toastr: ToastrService,
    private _bookingService: BookingService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.externalForm = this._fb.group({
      bookingId: [this.data?.bookingId, Validators.required],
      vendorName: ['', Validators.required],
      vendorNumber: ['', Validators.required],
      commissionAmount: [0],
      advancePay: [this.data.advancePay ?? 0],
      cashCollectedBy: ['Admin', Validators.required],
    });
  }

  ngOnInit() {}

  onCloseExternal() {
    this._dialog.closeAll();
  }

  onExternalFormSubmit() {
    if (this.externalForm.invalid) return;

    this._bookingService.reassignToExternal(this.externalForm.value).subscribe({
      next: (res: any) => {
        this._toastr.success(res.message || 'Assigned successfully');
        this._dialog.closeAll();
      },
      error: () => {
        this._toastr.error('Assignment failed');
      },
    });
  }
}

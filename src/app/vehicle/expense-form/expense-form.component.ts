import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VehicleService } from '../../services/vehicle.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, MatDialogModule],
  templateUrl: './expense-form.component.html',
  styleUrl: './expense-form.component.css',
})
export class ExpenseFormComponent implements OnInit {
  expenseForm!: FormGroup;
  vehicles: any[] = [];
  isSubmitting = false;
  isEditMode   = false;
  expenseId: number | null = null;

  readonly CategoryType = [
    'Fuel', 'Repair', 'Towing', 'DocumentRenew',
    'Salary', 'EMI', 'Insurance', 'Service', 'Tyre', 'Other',
  ];

  constructor(
    private _fb: FormBuilder,
    private _dialog: MatDialog,
    private _vehicleService: VehicleService,
    private _toastr: ToastrService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.expense;
    this.expenseId  = data?.expense?.vehicleExpenceId ?? null;

    const e = data?.expense;
    // Resolve pre-filled vehicleID from editing or from vehicle card shortcut
    const preVehicleId = e?.vehicleID ?? data?.vehicleID ?? null;

    this.expenseForm = _fb.group({
      vehicleID:    [preVehicleId],            // optional — salary/misc may have no vehicle
      categoryType: [e?.categoryType ?? 'Fuel', Validators.required],
      amount:       [e?.amount ?? '',          [Validators.required, Validators.min(1)]],
      expenseDate:  [
        e?.expenseDate
          ? new Date(e.expenseDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        Validators.required,
      ],
      notes: [e?.notes ?? ''],
    });
  }

  ngOnInit() {
    this._vehicleService.getAllVehicles().subscribe({
      next: (data: any) => {
        this.vehicles = Array.isArray(data) ? data : (data?.data ?? []);
      },
    });
  }

  onExpenseFormSubmit() {
    if (!this.expenseForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;
    const v = this.expenseForm.value;

    const payload = {
      categoryType: v.categoryType,
      amount:       Number(v.amount),
      expenseDate:  v.expenseDate,
      notes:        v.notes || null,
      vehicleID:    v.vehicleID ? Number(v.vehicleID) : null,
    };

    const call = this.isEditMode && this.expenseId
      ? this._vehicleService.updateExpense(this.expenseId, payload)
      : this._vehicleService.addExpence(payload);

    call.subscribe({
      next: () => {
        this._toastr.success(
          this.isEditMode ? 'Expense updated' : 'Expense added',
          'Success'
        );
        this._dialog.closeAll();
      },
      error: (err) => {
        this.isSubmitting = false;
        this._toastr.error(
          err?.error?.message || (this.isEditMode ? 'Error updating expense' : 'Error adding expense'),
          'Error'
        );
      },
    });
  }

  onCloseExpense() {
    this._dialog.closeAll();
  }
}

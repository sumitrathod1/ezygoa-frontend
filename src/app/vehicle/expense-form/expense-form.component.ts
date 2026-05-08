import { Component, Inject } from '@angular/core';
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
import { Observable } from 'rxjs';
import { EmployeeService } from '../../services/employee.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, MatDialogModule],
  templateUrl: './expense-form.component.html',
  styleUrl: './expense-form.component.css',
})
export class ExpenseFormComponent {
  expenseForm!: FormGroup;
  CategoryType: string[] = ['Fuel', 'Repair', 'Towing', 'DocumentRenew', 'Salary', 'EMI', 'Insurance', 'Service', 'Tyre', 'Other'];
  vehcilesType: any = [];
  userRole$!: Observable<string | null>;
  role: string | null = null;
  isSubmitting = false;
  isEditMode = false;
  expenseId: number | null = null;

  constructor(
    private _fb: FormBuilder,
    private _dialog: MatDialog,
    private _vehicleService: VehicleService,
    private _toastr: ToastrService,
    private _employeService: EmployeeService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.expense;
    this.expenseId  = data?.expense?.vehicleExpenceId ?? null;

    const e = data?.expense;
    this.expenseForm = _fb.group({
      vehicleID:    [e?.vehicleID ?? data?.vehicleID ?? ''],
      categoryType: [e?.categoryType ?? 'Fuel', Validators.required],
      amount:       [e?.amount ?? '', [Validators.required, Validators.min(1)]],
      expenseDate:  [
        e?.expenseDate
          ? new Date(e.expenseDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        Validators.required,
      ],
      notes:        [e?.notes ?? ''],
      vehicle:      [''],
    });
  }

  ngOnInit() {
    this.userRole$ = this._employeService.userRole$;
    this.userRole$.subscribe((role) => {
      this.role = role;
    });
    this.loadVehciles();
  }

  onExpenseFormSubmit() {
    if (this.expenseForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const payload: any = {
        categoryType: this.expenseForm.value.categoryType,
        amount:       Number(this.expenseForm.value.amount),
        expenseDate:  this.expenseForm.value.expenseDate,
        notes:        this.expenseForm.value.notes || null,
        vehicleID:    this.role === 'Employee'
          ? this.expenseForm.value.vehicle
          : this.expenseForm.value.vehicleID,
      };

      const call = this.isEditMode && this.expenseId
        ? this._vehicleService.updateExpense(this.expenseId, payload)
        : this._vehicleService.addExpence(payload);

      call.subscribe({
        next: () => {
          this._toastr.success(
            this.isEditMode ? 'Expense updated successfully' : 'Expense added successfully',
            'Success'
          );
          this._dialog.closeAll();
        },
        error: (err) => {
          this.isSubmitting = false;
          this._toastr.error(
            this.isEditMode ? 'Error updating expense' : 'Error adding expense',
            err?.error?.message || ''
          );
        },
      });
    }
  }

  onCloseExpense() {
    this._dialog.closeAll();
  }

  loadVehciles() {
    this._vehicleService.getAllVehicles().subscribe({
      next: (data: any) => {
        this.vehcilesType = data;
      },
    });
  }
}

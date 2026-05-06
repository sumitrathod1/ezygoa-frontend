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
  CategoryType: string[] = ['CNG', 'Repair', 'Fuel', 'DocumentRenew'];
  vehcilesType: any = [];
  userRole$!: Observable<string | null>;
  role: string | null = null;
  isSubmitting = false;

  constructor(
    private _fb: FormBuilder,
    private _dialog: MatDialog,
    private _vehicleService: VehicleService,
    private _toastr: ToastrService,
    private _employeService: EmployeeService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.expenseForm = _fb.group({
      vehicleID: data?.vehicleID || '',
      categoryType: ['Fuel', Validators.required],
      amount: ['', [Validators.required, Validators.min(1)]],
      expenseDate: [new Date().toISOString().split('T')[0], Validators.required],
      vehicle: '',
    });
  }

  ngOnInit() {
    this.userRole$ = this._employeService.userRole$;
    this.userRole$.subscribe((role) => {
      this.role = role;
      if (this.role === 'Admin' && this.data?.vehicleID) {
        this.expenseForm.patchValue({ vehicleID: this.data.vehicleID });
      }
    });
    this.loadVehciles();
  }

  onExpenseFormSubmit() {
    if (this.expenseForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const payload: any = {
        categoryType: this.expenseForm.value.categoryType,
        amount: this.expenseForm.value.amount,
        expenseDate: this.expenseForm.value.expenseDate,
      };

      if (this.role === 'Employee') {
        payload.vehicleID = this.expenseForm.value.vehicle;
      } else if (this.role === 'Admin') {
        payload.vehicleID = this.expenseForm.value.vehicleID;
      }

      this._vehicleService.addExpence(payload).subscribe({
        next: () => {
          this._toastr.success('Expense added successfully', 'Success');
          this._dialog.closeAll();
        },
        error: (err) => {
          this.isSubmitting = false;
          this._toastr.error('Error adding expense', err?.error?.message || '');
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

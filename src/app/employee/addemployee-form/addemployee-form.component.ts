import { Component, Inject, Optional } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Dialog, DIALOG_DATA } from '@angular/cdk/dialog';
import { EmployeeService } from '../../services/employee.service';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-addemployee-form',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './addemployee-form.component.html',
  styleUrl: './addemployee-form.component.css',
})
export class AddemployeeFormComponent {
  employeeForm!: FormGroup;
  isEditMode = false;

  Licence: string[] = ['LMVC', 'Badge', 'HeavyBadge'];
  Role: string[] = ['Admin', 'Employee'];
  salaryDays = Array.from({ length: 28 }, (_, i) => i + 1);

  constructor(
    _fb: FormBuilder,
    private _dialog: Dialog,
    private _employeeService: EmployeeService,
    private _toaster: ToastrService,
    @Optional() @Inject(DIALOG_DATA) public editData: any
  ) {
    this.isEditMode = !!editData;

    this.employeeForm = _fb.group({
      EmployeeName: [editData?.employeeName || '', Validators.required],
      UserName: [editData?.userName || editData?.username || '', Validators.required],
      DOB: editData?.dob || editData?.DOB || null,
      Address: editData?.address || '',
      Role: editData?.role || editData?.Role || '',
      Licence: editData?.licence || '',
      Email: editData?.email || '',
      Password: [
        '',
        this.isEditMode ? [] : [Validators.required],
      ],
      Number: [
        editData?.number || editData?.phone || '',
        Validators.pattern(/^[6-9][0-9]{9}$/),
      ],
      Salary: editData?.salary || '',
      SalaryDay: [editData?.salaryDay ?? editData?.SalaryDay ?? 1],
      IsSalaryActive: [editData?.isSalaryActive ?? editData?.IsSalaryActive ?? false],
    });
  }

  onAddEmployeeFormSubmit() {
    if (!this.employeeForm.valid) return;

    if (this.isEditMode) {
      const id = this.editData?.userId ?? this.editData?.UserId ?? this.editData?.id;
      const payload = { ...this.employeeForm.value };
      if (!payload.Password) delete payload.Password;

      this._employeeService.updateEmployee(id, payload).subscribe({
        next: () => {
          this._toaster.success('Driver updated successfully', 'Success');
          this.closeForm();
        },
        error: () => {
          this._toaster.error('Error updating driver', 'Error');
        },
      });
    } else {
      this._employeeService.addEmployee(this.employeeForm.value).subscribe({
        next: () => {
          this._toaster.success('Employee added successfully', 'Success');
          this.closeForm();
        },
        error: () => {
          this._toaster.error('Error adding employee', 'error');
        },
      });
    }
  }

  ordinal(n: number): string {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return s[(v - 20) % 10] ?? s[v] ?? s[0];
  }

  closeForm() {
    this._dialog.closeAll();
  }
}

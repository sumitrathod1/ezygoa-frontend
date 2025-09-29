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
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { HttpClient } from '@angular/common/http';
import { Dialog } from '@angular/cdk/dialog';
import { EmployeeService } from '../../services/employee.service';
import { provideNativeDateAdapter } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-addemployee-form',
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
    CommonModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './addemployee-form.component.html',
  styleUrl: './addemployee-form.component.css',
})
export class AddemployeeFormComponent {
  employeeForm!: FormGroup;

  constructor(
    private _fb: FormBuilder,
    private _dialog: Dialog,
    private _employeeService: EmployeeService,
    private _toaster: ToastrService
  ) {
    this.employeeForm = _fb.group({
      EmployeeName: '',
      UserName: '',
      DOB: null,
      Address: '',
      Role: '',
      Licence: '',
      Email: '',
      Password: '',
      Number: '',
      Salary: '',
    });
  }

  Licence: string[] = ['LMVC', 'Badge', 'HeavyBadge'];
  Role: string[] = ['Admin', 'Employee'];
  onAddEmployeeFormSubmit() {
    this._employeeService.addEmployee(this.employeeForm.value).subscribe({
      next: (response) => {
        this._toaster.success('Employee added successfully', 'Success');
        this.closeForm();
      },
      error: (error) => {
        this._toaster.error('Error adding employee', 'error');
      },
    });
  }
  closeForm() {
    this._dialog.closeAll();
  }
}

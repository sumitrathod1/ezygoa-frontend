import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { er } from '@fullcalendar/core/internal-common';
import { EmployeeService } from '../../services/employee.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-forget-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.css',
})
export class ForgetPasswordComponent {
  forgotForm!: FormGroup;

  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  togglePassword(field: string) {
    if (field === 'old') this.showOldPassword = !this.showOldPassword;
    if (field === 'new') this.showNewPassword = !this.showNewPassword;
    if (field === 'confirm')
      this.showConfirmPassword = !this.showConfirmPassword;
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private _employeServes: EmployeeService,
    private _toaster: ToastrService
  ) {}

  ngOnInit(): void {
    this.forgotForm = this.fb.group(
      {
        UserName: ['', Validators.required],
        oldPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    if (!newPassword || !confirmPassword) return null;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.forgotForm.invalid) {
      console.log('Form is invalid');
      return;
    }

    const { oldPassword, newPassword } = this.forgotForm.value;
    this._employeServes.changePassword(this.forgotForm.value).subscribe({
      next: (res) => {
        this._toaster.success(res.message);
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        this._toaster.error(err?.error.message);
      },
    });
  }

  backLogin() {
    this.router.navigate(['/login']);
  }
}

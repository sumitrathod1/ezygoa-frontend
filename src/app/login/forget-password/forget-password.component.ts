import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
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
  step = 1; // 1 = email, 2 = reset

  emailForm!: FormGroup;
  resetForm!: FormGroup;

  showNewPassword = false;
  showConfirmPassword = false;

  email!: string;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private employeeService: EmployeeService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.resetForm = this.fb.group(
      {
        otp: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordMatchValidator(form: FormGroup) {
    const pass = form.get('newPassword')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  // STEP 1
  sendOtp() {
    if (this.emailForm.invalid) return;

    this.email = this.emailForm.value.email;

    this.employeeService.forgotPassword({ email: this.email }).subscribe({
      next: (_res: any) => {
        this.toastr.success('OTP sent to your email');
        this.step = 2;
      },
      error: () => {
        this.toastr.error('Failed to send OTP');
      },
    });
  }

  // STEP 2
  resetPassword() {
    if (this.resetForm.invalid) return;

    const payload = {
      email: this.email,
      otp: this.resetForm.value.otp,
      newPassword: this.resetForm.value.newPassword,
    };

    this.employeeService.resetPassword(payload).subscribe({
      next: (res: any) => {
        this.toastr.success(res.message || 'Password reset successful');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.error || 'Something went wrong';

        this.toastr.error(msg);
      },
    });
  }

  backLogin() {
    this.router.navigate(['/login']);
  }
}

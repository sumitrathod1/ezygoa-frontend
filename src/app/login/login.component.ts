import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { EmployeeService } from '../services/employee.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { BookingService } from '../services/booking.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  loginForm!: FormGroup;
  isLoading = false;
  showNewPassword = false;

  private cdr = inject(ChangeDetectorRef);

  togglePassword(field: string) {
    if (field === 'new') this.showNewPassword = !this.showNewPassword;
  }

  constructor(
    private _employeService: EmployeeService,
    private fb: FormBuilder,
    private router: Router,
    private _toastr: ToastrService,
    private bookingService: BookingService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.cdr.markForCheck();

    localStorage.setItem('name', this.loginForm.value.username);
    this._employeService.loginUser(this.loginForm.value).subscribe({
      next: (response) => {
        this._employeService.storeTokan(response.token);
        this.bookingService.connectSignalRAfterLogin();

        const helper = new JwtHelperService();
        const decodedToken = helper.decodeToken(response.token);
        const role =
          decodedToken[
            'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
          ];

        this._toastr.success('Login successful!', 'Welcome');
        this.loginForm.reset();

        if (role === 'Admin') {
          this.router.navigate(['/home']);
        } else if (role === 'Employee') {
          this.router.navigate(['/driver']);
        } else if (role === 'SuperAdmin') {
          this.router.navigate(['/super-admin']);
        } else {
          this._toastr.warning('Unknown role. Contact admin.', 'Warning');
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const status = error?.status;
        const msg =
          status === 0 ? 'Cannot reach the server. Is the API running?'
          : status === 429 ? 'Too many login attempts. Wait 1 minute and try again.'
          : status === 401 && error?.error?.message !== 'Invalid credentials' && error?.error?.message
            ? error.error.message   // e.g. "User account is deactivated"
          : status === 401 ? 'Wrong username or password. Usernames are lowercase (e.g. "superadmin").'
          : error?.error?.message || `Login failed (server error ${status ?? ''}).`;
        this._toastr.error(msg, 'Login Failed');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  viewForget() {
    this.router.navigate(['/forget']);
  }
}
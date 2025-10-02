import { Component } from '@angular/core';
import { EmployeeService } from '../services/employee.service';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { JwtHelperService } from '@auth0/angular-jwt';

import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  loginForm!: FormGroup;

  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  togglePassword(field: string) {
    if (field === 'new') this.showNewPassword = !this.showNewPassword;
  }

  constructor(
    private _employeService: EmployeeService,
    private fb: FormBuilder,
    private router: Router,
    private _totastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  foruserLogin() {}

  onSubmit() {
    if (this.loginForm.valid) {
      localStorage.setItem('name', this.loginForm.value.username);
      this._employeService.loginUser(this.loginForm.value).subscribe({
        next: (response) => {
          this._employeService.storeTokan(response.token);

          const helper = new JwtHelperService();
          const decodedToken = helper.decodeToken(response.token);
          const role =
            decodedToken[
              'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
            ];

          if (role === 'Admin') {
            console.log('Admin');
            this.router.navigate(['/home']);
          } else if (role === 'Employee') {
            console.log('Employee');
            this.router.navigate(['/driver']);
          } else {
            this._totastr.warning('Unknown role:', role);
          }
          this._totastr.success('Login successful', 'Success');
          this.loginForm.reset();
        },
        error: (error) => {
          this._totastr.error('Login failed', error);
        },
      });
    }
  }

  viewForget() {
    this.router.navigate(['/forget']);
  }
}

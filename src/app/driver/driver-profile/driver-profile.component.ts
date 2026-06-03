import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './driver-profile.component.html',
  styleUrl: './driver-profile.component.css',
})
export class DriverProfileComponent implements OnInit {
  // Basic
  name      = '';
  initial   = '';
  username  = '';

  // From API
  phone       = '';
  email       = '';
  address     = '';
  dob         = '';
  age         = 0;
  licence     = '';
  bankAccount = '';

  isLoading = true;
  userId    = 0;

  constructor(private _empService: EmployeeService) {}

  ngOnInit() {
    const decoded = this._empService.decodeToken();
    this.userId = parseInt(
      decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? '0', 10
    );
    this.name    = decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
                 ?? decoded?.['unique_name'] ?? 'Driver';
    this.initial = this.name[0]?.toUpperCase() ?? 'D';

    this.loadFullProfile();
  }

  private loadFullProfile() {
    if (!this.userId) { this.isLoading = false; return; }
    this._empService.getUserById(this.userId).subscribe({
      next: (u: any) => {
        this.name        = u.employeeName ?? this.name;
        this.initial     = this.name[0]?.toUpperCase() ?? 'D';
        this.username    = u.userName    ?? '';
        this.phone       = u.number      ?? '';
        this.email       = u.email       ?? '';
        this.address     = u.address     ?? '';
        this.bankAccount = u.bankAccount ?? '';
        this.age         = u.emploeAge   ?? u.employeAge ?? 0;
        this.licence     = this.licenceLabel(u.licence);
        if (u.employeeDOB) {
          const d = new Date(u.employeeDOB);
          this.dob = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private licenceLabel(val: any): string {
    if (val === 0 || val === 'LMVC')       return 'LMVC';
    if (val === 1 || val === 'Badge')      return 'Badge';
    if (val === 2 || val === 'HeavyBadge') return 'Heavy Badge';
    return val ?? '—';
  }

  logout() {
    this._empService.logout();
  }
}

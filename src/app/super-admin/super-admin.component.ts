import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { JwtHelperService } from '@auth0/angular-jwt';
import { OrganizationService } from '../services/organization.service';
import { EmployeeService } from '../services/employee.service';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin.component.html',
  styleUrl: './super-admin.component.css',
})
export class SuperAdminComponent implements OnInit {
  private cdr    = inject(ChangeDetectorRef);
  private orgSvc = inject(OrganizationService);
  private empSvc = inject(EmployeeService);
  private toastr = inject(ToastrService);

  // ── state ──────────────────────────────────────────
  orgs: any[]      = [];
  loading          = false;
  activeTab        = 'orgs'; // 'orgs'|'org-detail'|'new-org'|'new-admin'|'change-password'
  selectedOrg: any = null;
  orgUsers: any[]  = [];
  usersLoading     = false;

  // New org form
  newOrg   = { name: '', code: '', email: '', phone: '', address: '' };
  orgSaving = false;

  // New admin form
  newAdmin    = { employeeName: '', userName: '', password: '', number: '' };
  adminOrgId  = 0;
  adminSaving = false;
  showAdminPwd = false;

  // Change password form
  changePwd = { oldPassword: '', newPassword: '', confirmPassword: '' };
  pwdSaving = false;
  showOldPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;

  ngOnInit(): void {
    this.loadOrgs();
  }

  // ── orgs ──────────────────────────────────────────
  loadOrgs(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.orgSvc.getAll().subscribe({
      next: (res: any) => {
        this.orgs    = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  selectOrg(org: any): void {
    this.selectedOrg = org;
    this.activeTab   = 'org-detail';
    this.orgUsers    = [];
    this.loadOrgUsers(org.orgId);
    this.cdr.markForCheck();
  }

  loadOrgUsers(orgId: number): void {
    this.usersLoading = true;
    this.cdr.markForCheck();
    this.orgSvc.getOrgUsers(orgId).subscribe({
      next: (res: any) => {
        this.orgUsers     = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        this.usersLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.usersLoading = false; this.cdr.markForCheck(); },
    });
  }

  openNewOrg(): void {
    this.newOrg    = { name: '', code: '', email: '', phone: '', address: '' };
    this.activeTab = 'new-org';
    this.cdr.markForCheck();
  }

  saveOrg(): void {
    if (!this.newOrg.name.trim()) {
      this.toastr.warning('Organization name is required', 'Validation');
      return;
    }
    this.orgSaving = true;
    this.cdr.markForCheck();
    this.orgSvc.create(this.newOrg).subscribe({
      next: () => {
        this.toastr.success('Organization created!', 'Success');
        this.orgSaving = false;
        this.activeTab = 'orgs';
        this.loadOrgs();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to create organization', 'Error');
        this.orgSaving = false;
        this.cdr.markForCheck();
      },
    });
  }

  openNewAdmin(org: any): void {
    this.adminOrgId  = org.orgId;
    this.selectedOrg = org;
    this.newAdmin    = { employeeName: '', userName: '', password: '', number: '' };
    this.activeTab   = 'new-admin';
    this.cdr.markForCheck();
  }

  saveAdmin(): void {
    if (!this.newAdmin.userName || !this.newAdmin.password) {
      this.toastr.warning('Username and password are required', 'Validation');
      return;
    }
    this.adminSaving = true;
    this.cdr.markForCheck();
    this.orgSvc.createAdmin(this.adminOrgId, this.newAdmin).subscribe({
      next: () => {
        this.toastr.success('Admin user created!', 'Success');
        this.adminSaving = false;
        this.activeTab   = 'org-detail';
        this.loadOrgUsers(this.adminOrgId);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to create admin', 'Error');
        this.adminSaving = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleActive(org: any): void {
    this.orgSvc.update(org.orgId, { isActive: !org.isActive }).subscribe({
      next: () => {
        org.isActive = !org.isActive;
        this.toastr.success(
          `Organization ${org.isActive ? 'activated' : 'deactivated'}`, 'Updated'
        );
        this.cdr.markForCheck();
      },
      error: () => this.toastr.error('Update failed', 'Error'),
    });
  }

  // ── change password ────────────────────────────────
  openChangePassword(): void {
    this.changePwd = { oldPassword: '', newPassword: '', confirmPassword: '' };
    this.showOldPwd = this.showNewPwd = this.showConfirmPwd = false;
    this.activeTab = 'change-password';
    this.cdr.markForCheck();
  }

  savePassword(): void {
    if (!this.changePwd.oldPassword || !this.changePwd.newPassword) {
      this.toastr.warning('All password fields are required', 'Validation');
      return;
    }
    if (this.changePwd.newPassword !== this.changePwd.confirmPassword) {
      this.toastr.warning('New passwords do not match', 'Validation');
      return;
    }
    if (this.changePwd.newPassword.length < 6) {
      this.toastr.warning('Password must be at least 6 characters', 'Validation');
      return;
    }

    // Get username from JWT token
    const token   = localStorage.getItem('token');
    const decoded = new JwtHelperService().decodeToken(token!);
    const userName =
      decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      decoded['name'] || '';

    this.pwdSaving = true;
    this.cdr.markForCheck();

    this.empSvc.changePassword({
      UserName: userName,
      oldPassword: this.changePwd.oldPassword,
      newPassword: this.changePwd.newPassword,
    }).subscribe({
      next: () => {
        this.toastr.success('Password changed successfully!', 'Done');
        this.pwdSaving = false;
        this.activeTab = 'orgs';
        this.changePwd = { oldPassword: '', newPassword: '', confirmPassword: '' };
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.toastr.error(err?.error?.message || 'Failed to change password', 'Error');
        this.pwdSaving = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── shared ────────────────────────────────────────
  logout(): void {
    this.empSvc.logout();
  }

  back(): void {
    if (this.activeTab === 'new-admin') {
      this.activeTab = 'org-detail';
    } else if (this.activeTab === 'new-org' || this.activeTab === 'change-password') {
      this.activeTab = 'orgs';
    } else {
      this.activeTab   = 'orgs';
      this.selectedOrg = null;
    }
    this.cdr.markForCheck();
  }

  roleLabel(role: string | number): string {
    // API returns enum as string ("Admin", "Employee") due to JsonStringEnumConverter
    if (role === 'SuperAdmin' || role === 2) return 'SuperAdmin';
    if (role === 'Admin'      || role === 1) return 'Admin';
    return 'Employee';
  }
}

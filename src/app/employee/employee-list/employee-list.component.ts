import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { EmployeeService } from '../../services/employee.service';
import { AddemployeeFormComponent } from '../addemployee-form/addemployee-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css',
})
export class EmployeeListComponent implements OnInit {
  drivers: any[] = [];
  deletedDrivers: any[] = [];
  showDeleted = false;

  confirmDeleteId: number | null = null;

  constructor(
    private _employeServeice: EmployeeService,
    private _dialog: Dialog,
    private _toastr: ToastrService,
  ) {}

  ngOnInit() {
    this.loadDrivers();
    this._employeServeice.employeeUpdated$.subscribe(() => this.loadDrivers());
  }

  loadDrivers() {
    this._employeServeice.getAllEmployees().subscribe({
      next: (data: any) => {
        const raw: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        this.drivers = raw.filter((e: any) => !e.isDeleted && e.status !== false);
        this._employeServeice.updateEmployeeCount(this.drivers.length);
      },
    });
  }

  loadDeletedDrivers() {
    this._employeServeice.getDeletedEmployees().subscribe({
      next: (data: any) => {
        const raw: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        this.deletedDrivers = raw;
      },
    });
  }

  toggleShowDeleted() {
    this.showDeleted = !this.showDeleted;
    if (this.showDeleted && this.deletedDrivers.length === 0) {
      this.loadDeletedDrivers();
    }
  }

  editEmployee(emp: any) {
    this._dialog.open(AddemployeeFormComponent, {
      data: emp,
      panelClass: 'custom-dialog-panel',
    });
  }

  confirmDelete(emp: any) {
    this.confirmDeleteId = emp.userId ?? emp.UserId;
  }

  cancelDelete() { this.confirmDeleteId = null; }

  deleteEmployee(emp: any) {
    const id = emp.userId ?? emp.UserId;
    this._employeServeice.deleteEmployee(id).subscribe({
      next: () => {
        this._toastr.success(`${emp.employeeName} removed (history preserved)`, 'Done');
        this.confirmDeleteId = null;
        this.loadDrivers();
        if (this.showDeleted) this.loadDeletedDrivers();
      },
      error: () => this._toastr.error('Could not delete driver'),
    });
  }

  restoreEmployee(emp: any) {
    const id = emp.userId ?? emp.UserId;
    this._employeServeice.restoreEmployee(id).subscribe({
      next: () => {
        this._toastr.success(`${emp.employeeName} restored`, 'Restored');
        this.loadDrivers();
        this.loadDeletedDrivers();
      },
      error: () => this._toastr.error('Could not restore driver'),
    });
  }

  getInitials(name: string): string {
    if (!name?.trim()) return '?';
    return name.trim().split(/\s+/).filter(w => w.length > 0).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  getAvatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg,#6366f1,#4f46e5)',
      'linear-gradient(135deg,#3b82f6,#1d4ed8)',
      'linear-gradient(135deg,#22c55e,#15803d)',
      'linear-gradient(135deg,#f59e0b,#d97706)',
      'linear-gradient(135deg,#ef4444,#b91c1c)',
      'linear-gradient(135deg,#8b5cf6,#6d28d9)',
      'linear-gradient(135deg,#06b6d4,#0e7490)',
    ];
    let hash = 0;
    for (let i = 0; i < (name ?? '').length; i++) hash = (name!).charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  getAge(dob: string): string {
    if (!dob) return '—';
    const age = new Date().getFullYear() - new Date(dob).getFullYear();
    return isNaN(age) ? '—' : `${age} yrs`;
  }
}

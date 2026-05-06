import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AddemployeeFormComponent } from './addemployee-form/addemployee-form.component';
import { EmployeeService } from '../services/employee.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.css',
})
export class EmployeeComponent {
  drivers: any[] = [];
  numberofDrivers: number = 0;
  searchQuery = '';

  constructor(
    private _dialog: MatDialog,
    private _employeServeice: EmployeeService
  ) {}

  ngOnInit() {
    this.loadDrivers();
    this._employeServeice.employeeUpdated$.subscribe(() => {
      this.loadDrivers();
    });
  }

  loadDrivers() {
    this._employeServeice.getAllEmployees().subscribe({
      next: (data) => {
        this.drivers = Array.isArray(data) ? data : [];
        this.numberofDrivers = this.drivers.length;
      },
    });
  }

  get filteredDrivers() {
    const q = this.searchQuery?.toLowerCase() ?? '';
    if (!q) return this.drivers;
    return this.drivers.filter(
      (d) =>
        (d.employeeName ?? '').toLowerCase().includes(q) ||
        (d.address ?? '').toLowerCase().includes(q) ||
        (d.number ?? d.phone ?? '').toString().toLowerCase().includes(q)
    );
  }

  getInitials(name: string): string {
    if (!name || !name.trim()) return '?';
    const words = name.trim().split(/\s+/).filter((w: string) => w.length > 0);
    if (words.length === 0) return '?';
    return words.slice(0, 2).map((w: string) => w[0].toUpperCase()).join('');
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
    const safe = name || '';
    let hash = 0;
    for (let i = 0; i < safe.length; i++) {
      hash = safe.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  addDriver() {
    this._dialog.open(AddemployeeFormComponent);
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AddemployeeFormComponent } from './addemployee-form/addemployee-form.component';
import { EmployeeService } from '../services/employee.service';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.css',
})
export class EmployeeComponent {
  drivers: any[] = [];
  numberofDrivers: number = 0;
  constructor(
    private _dialog: MatDialog,
    private _employeServeice: EmployeeService
  ) {}

  ngOnInit() {
    this.loadDrivers();
    this._employeServeice.employeeUpdated$.subscribe(() => {
      console.log('📢 Employee update event received!');
      this.loadDrivers();
    });
  }

  loadDrivers() {
    this._employeServeice.getAllEmployees().subscribe({
      next: (data) => {
        this.drivers = Array.isArray(data) ? data : [];
        this.numberofDrivers = this.drivers.length;
      },
      error: (err) => {
        console.error('Error loading drivers:', err);
      },
    });
  }

  addDriver() {
    this._dialog.open(AddemployeeFormComponent);
  }
}

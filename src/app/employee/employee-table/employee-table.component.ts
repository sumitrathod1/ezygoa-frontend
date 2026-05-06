import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-employee-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-table.component.html',
  styleUrl: './employee-table.component.css',
})
export class EmployeeTableComponent {
  constructor(private _employeeService: EmployeeService) {}
  Employees: any[] = [];

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this._employeeService.getAllEmployees().subscribe({
      next: (data) => {
        this.Employees = data;
        this._employeeService.updateEmployeeCount(this.Employees.length);
      },
    });
  }
  onEmployeeClick(data: any) {}
}

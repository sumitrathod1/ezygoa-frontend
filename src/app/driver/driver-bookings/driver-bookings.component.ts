import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { EmployeeService } from '../../services/employee.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-driver-bookings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-bookings.component.html',
  styleUrl: './driver-bookings.component.css',
})
export class DriverBookingsComponent {
  pastBookings: any[] = [];

  constructor(private _employeeService: EmployeeService) {}

  ngOnInit() {
    this.loadDriverData();
  }

  loadDriverData() {
    this._employeeService
      .getEmployeeBookings()
      .pipe(
        map((response) => {
          const bookings = response ?? [];

          const todayDateStr = new Date().toLocaleDateString('en-CA');

          this.pastBookings = bookings.filter(
            (b: { travelDate: string }) => b.travelDate < todayDateStr
          );

          return bookings;
        })
      )
      .subscribe({
        next: (bookings) => {},
      });
  }
}

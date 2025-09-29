import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { EmployeeService } from '../services/employee.service';
import { map } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-driver',
  standalone: true,
  imports: [CommonModule, MatProgressSpinner],
  templateUrl: './driver.component.html',
  styleUrl: './driver.component.css',
})
export class DriverComponent {
  currentBookings: any[] = [];
  upcomingRides: any[] = [];
  isLoading = false;

  rides = 0;
  constructor(private _employeService: EmployeeService) {}

  ngOnInit() {
    this.loadDriverData();
  }

  loadDriverData() {
    this._employeService
      .getEmployeeBookings()
      .pipe(
        map((response) => {
          const bookings = response ?? [];

          const todayDateStr = new Date().toISOString().slice(0, 10);

          this.currentBookings = bookings.filter(
            (b: { travelDate: string }) => b.travelDate === todayDateStr
          );

          this.upcomingRides = bookings.filter(
            (b: { travelDate: string }) => b.travelDate > todayDateStr
          );

          console.log('Bookings loaded:', bookings);
          console.log('Current bookings:', this.currentBookings);
          console.log('Upcoming rides:', this.upcomingRides);

          this.rides = bookings.length;
          return bookings;
        })
      )
      .subscribe({
        next: (bookings) => {},
        error: (err) => {
          console.error('Error loading bookings:', err);
          this.currentBookings = [];
          this.upcomingRides = [];
        },
      });
  }
  onLogout() {
    this._employeService.logout();
  }

  callCustomer(number: string) {
    console.log('Calling number:', number);
    window.open(`tel:${number}`, '_self');
  }
}

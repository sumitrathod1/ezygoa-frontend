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

          //const todayDateStr = new Date().toISOString().slice(0, 10);
          const todayDateStr = new Date().toLocaleDateString('en-CA');

          this.currentBookings = bookings.filter(
            (b: { travelDate: string }) =>
              new Date(b.travelDate).toISOString().slice(0, 10) === todayDateStr
          );

          this.upcomingRides = bookings.filter(
            (b: { travelDate: string }) => b.travelDate > todayDateStr
          );

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

  formatTime(time?: string | null): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m} ${suffix}`;
  }
}

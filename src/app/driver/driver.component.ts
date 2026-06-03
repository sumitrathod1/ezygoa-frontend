import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, DestroyRef, inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { EmployeeService } from '../services/employee.service';
import { BookingService }  from '../services/booking.service';
import { DriverExpenseComponent } from './driver-expense/driver-expense.component';

@Component({
  selector: 'app-driver',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, DriverExpenseComponent],
  templateUrl: './driver.component.html',
  styleUrl: './driver.component.css',
})
export class DriverComponent {
  currentBookings:  any[] = [];
  upcomingRides:    any[] = [];
  isLoading        = false;
  rides            = 0;
  showExpenseForm  = false;

  driverName    = '';
  driverInitial = '';
  greeting      = '';
  todayLabel    = '';

  private destroyRef = inject(DestroyRef);
  private cdr        = inject(ChangeDetectorRef);

  constructor(
    private _employeeService: EmployeeService,
    private _bookingService:  BookingService,
  ) {}

  ngOnInit() {
    this.initHeader();
    this.loadDriverData();

    this._bookingService.bookingUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadDriverData());
  }

  private initHeader() {
    const decoded = this._employeeService.decodeToken();
    this.driverName = decoded?.[
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
    ] ?? decoded?.['unique_name'] ?? 'Driver';
    this.driverInitial = this.driverName[0]?.toUpperCase() ?? 'D';

    const h = new Date().getHours();
    this.greeting =
      h < 12 ? 'Good morning' :
      h < 17 ? 'Good afternoon' : 'Good evening';

    this.todayLabel = new Date().toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  }

  loadDriverData() {
    this.isLoading = true;
    this.cdr.markForCheck();

    this._employeeService
      .getEmployeeBookings()
      .pipe(
        map((response) => {
          const bookings     = response ?? [];
          const todayDateStr = new Date().toLocaleDateString('en-CA');

          this.currentBookings = bookings.filter(
            (b: any) =>
              new Date(b.travelDate).toISOString().slice(0, 10) === todayDateStr
          );
          this.upcomingRides = bookings.filter(
            (b: any) => b.travelDate > todayDateStr
          );
          this.rides = bookings.length;
          return bookings;
        })
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.currentBookings = [];
          this.upcomingRides   = [];
          this.cdr.markForCheck();
        },
      });
  }

  callCustomer(number: string) {
    if (number) window.open(`tel:${number}`, '_self');
  }

  mapsUrl(location: string): string {
    if (!location) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
  }

  formatTime(time?: string | null): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const h      = parseInt(parts[0], 10);
    const m      = parts[1].padStart(2, '0');
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12    = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${suffix}`;
  }
}

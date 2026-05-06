import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { EmployeeService } from '../services/employee.service';
import { map } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseFormComponent } from '../vehicle/expense-form/expense-form.component';
import { BookingService } from '../services/booking.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-driver',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatProgressSpinner,
    RouterModule,
  ],
  templateUrl: './driver.component.html',
  styleUrl: './driver.component.css',
})
export class DriverComponent {
  currentBookings: any[] = [];
  upcomingRides: any[] = [];
  isLoading = false;
  rides = 0;

  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  constructor(
    private _employeService: EmployeeService,
    private _bookingservice: BookingService,
    private _dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadDriverData();

    this._bookingservice.bookingUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadDriverData());
  }

  loadDriverData() {
    this.isLoading = true;
    this.cdr.markForCheck();

    this._employeService
      .getEmployeeBookings()
      .pipe(
        map((response) => {
          const bookings = response ?? [];
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
        next: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.currentBookings = [];
          this.upcomingRides = [];
          this.cdr.markForCheck();
        },
      });
  }

  onLogout() {
    this._employeService.logout();
  }

  callCustomer(number: string) {
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

  expence() {
    this._dialog.open(ExpenseFormComponent);
  }

  displayFields = [
    { label: 'Pickup', valueKey: 'from', dot: 'green' },
    { label: 'Drop', valueKey: 'to', dot: 'red' },
    { label: 'Type', valueKey: 'bookingType', dot: 'green' },
    { label: 'Vehicle', valueKey: 'vehicle.vehicleName', dot: 'blue' },
    { label: 'Amount', valueKey: 'amount', dot: 'orange' },
    { label: 'Balance', valueKey: 'balance', dot: 'violet' },
    { label: 'AdvancePaid', valueKey: 'advancePaid', dot: 'violet' },
  ];

  resolveValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o ? o[k] : ''), obj);
  }
}
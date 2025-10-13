import { Component } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';

import { CommonModule } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { BookingService } from '../services/booking.service';
import { EmployeeService } from '../services/employee.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-home',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    FullCalendarModule,
    CommonModule,
    CalendarComponent,
    NgChartsModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  bookings: any[] = [];
  revenue: any = {};
  isLoading: boolean = true;

  lineChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Earnings',
        data: [12000, 15000, 11000, 17000, 14000, 19000],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointRadius: 5,
      },
    ],
  };
  lineChartType: ChartType = 'line';
  lineChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' },
    },
    scales: {
      x: {},
      y: { beginAtZero: true },
    },
  };

  totalBookings: number = 0;
  totalEmployees: number = 0;
  totalVehicles: number = 0;
  todayBookings: number = 0;

  constructor(
    private _bookingservice: BookingService,
    private _employeServices: EmployeeService,
    private _toastr: ToastrService
  ) {}

  ngOnInit() {
    this.isLoading = true;
    this._bookingservice.bookingCount$.subscribe((count) => {
      this.totalBookings = count;
    });
    this._employeServices.employeCount$.subscribe((count) => {
      this.totalEmployees = count;
    });

    this._bookingservice.bookingUpdated$.subscribe(() => {
      this.loadAllbookings();
    });
    this.loadAllbookings();
  }

  todayBookingss: any[] = [];
  upcomingBookings: any[] = [];

  loadAllbookings() {
    this.isLoading = true;
    const colorList = [
      '#00bcd4',
      '#f59e42',
      '#22c55e',
      '#a78bfa',
      '#ef4444',
      '#6366f1',
    ];

    this._bookingservice.loadBookings().subscribe({
      next: (data) => {
        this.isLoading = false;
        const allBookings = data.bookings.map((b: any, idx: number) => ({
          ...b,
          color: colorList[idx % colorList.length],
        }));

        const todayStr = new Date().toDateString();

        this.todayBookingss = allBookings.filter(
          (b: any) => new Date(b.travelDate).toDateString() === todayStr
        );

        const agentBookingsCount = allBookings.filter(
          (b: any) => b.travelAgentId !== null
        ).length;

        this._bookingservice.updateAgentBookingCount(agentBookingsCount);

        this.upcomingBookings = allBookings
          .filter((b: any) => new Date(b.travelDate) > new Date())
          .sort(
            (a: any, b: any) =>
              new Date(a.travelDate).getTime() -
              new Date(b.travelDate).getTime()
          );

        this.bookings = allBookings;
        this.revenue = data.revenueStats || {};
        this.totalBookings = allBookings.length;
        this.todayBookings = this.todayBookingss.length;
      },
      error: (err) => {
        this.isLoading = false;
        this._toastr.error('Error loading bookings:', err);
      },
    });
  }

  // loadAllbookings() {
  //   this.isLoading = true;
  //   const colorList = [
  //     '#00bcd4',
  //     '#f59e42',
  //     '#22c55e',
  //     '#a78bfa',
  //     '#ef4444',
  //     '#6366f1',
  //   ];
  //   this._bookingservice.loadBookings().subscribe({
  //     next: (data) => {
  //       this.isLoading = false;

  //       this.bookings = data.bookings.map((booking: any, idx: number) => ({
  //         ...booking,
  //         color: colorList[idx % colorList.length],
  //       }));
  //       this.revenue = data.revenueStats || {};
  //       this.totalBookings = this.bookings.length;
  //       this.todayBookings = this.bookings.filter(
  //         (booking) =>
  //           new Date(booking.date || booking.travelDate).toDateString() ===
  //           new Date().toDateString()
  //       ).length;
  //     },
  //     error: (err) => {
  //       this.isLoading = false;
  //       this._toastr.error('Error loading bookings:', err);
  //     },
  //   });
  // }

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

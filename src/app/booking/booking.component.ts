import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { BookingService } from '../services/booking.service';
import { EmailServiceService } from '../services/email-service.service';
import { IndianCurrencyPipe } from '../pipes/indian-currency.pipe';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [
    NgxMaterialTimepickerModule,
    FormsModule,
    RouterModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatGridListModule,
    CommonModule,
    NgChartsModule,
    IndianCurrencyPipe,
  ],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingComponent implements OnInit {
  totalBookings = 0;
  totalRevenue = 0;
  pendingCount = 0;
  completedCount = 0;
  cancelledCount = 0;

  constructor(
    private _bookingService: BookingService,
    private _emailService: EmailServiceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
    this._bookingService.bookingUpdated$.subscribe(() => {
      this.loadData();
      this._emailService.refreshCount();
    });
    this._bookingService.bookingCount$.subscribe((count) => {
      this.totalBookings = count;
      this._emailService.refreshCount();
      this.cdr.markForCheck();
    });
  }

  private loadData() {
    this._bookingService.loadBookings().subscribe({
      next: (data) => {
        const bookings = data.bookings || [];
        this.totalBookings = bookings.length;
        this.totalRevenue = data?.revenueStats?.total || 0;
        this.pendingCount   = bookings.filter((b: any) => b.status === 'Pending').length;
        this.completedCount = bookings.filter((b: any) => b.status === 'Completed').length;
        this.cancelledCount = bookings.filter((b: any) => b.status === 'Cancelled').length;

        // Monthly bookings bar chart
        const monthlyCounts: Record<string, number> = {};
        bookings.forEach((booking: any) => {
          if (booking.travelDate && booking.travelDate !== '0001-01-01') {
            const date = new Date(booking.travelDate);
            const key = `${date.toLocaleString('default', { month: 'short' })}-${date.getFullYear()}`;
            monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
          }
        });
        this.barChartData = {
          labels: Object.keys(monthlyCounts),
          datasets: [{ label: 'Bookings', data: Object.values(monthlyCounts), backgroundColor: '#6366f1' }],
        };

        // Booking type pie chart
        const typeCounts: Record<string, number> = {};
        bookings.forEach((b: any) => {
          if (b.bookingType) typeCounts[b.bookingType] = (typeCounts[b.bookingType] || 0) + 1;
        });
        this.pieChartData = {
          labels: Object.keys(typeCounts),
          datasets: [{
            data: Object.values(typeCounts),
            backgroundColor: ['#6366f1', '#fbbf24', '#22c55e', '#f43f5e', '#a78bfa', '#f59e42', '#ef4444'],
            hoverBackgroundColor: ['#6366f1', '#fbbf24', '#22c55e', '#f43f5e', '#a78bfa', '#f59e42', '#ef4444'],
          }],
        };

        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  barChartData: any = {
    labels: [],
    datasets: [{ label: 'Bookings', data: [], backgroundColor: '#6366f1' }],
  };
  barChartType: ChartType = 'bar';
  barChartOptions: any = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: {}, y: { beginAtZero: true } },
  };

  pieChartData: any = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
  pieChartType: any = 'pie';
  pieChartOptions: any = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.parsed}`,
        },
      },
    },
  };
}

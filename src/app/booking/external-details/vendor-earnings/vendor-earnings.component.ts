import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartType, ChartOptions } from 'chart.js';
import { BookingService } from '../../../services/booking.service';
import { IndianCurrencyPipe } from '../../../pipes/indian-currency.pipe';

@Component({
  selector: 'app-vendor-earnings',
  standalone: true,
  imports: [CommonModule, NgChartsModule, IndianCurrencyPipe],
  templateUrl: './vendor-earnings.component.html',
  styleUrl: './vendor-earnings.component.css',
})
export class VendorEarningsComponent implements OnInit {
  isLoading = true;

  bookings: any[] = [];

  summary = {
    totalBookings: 0,
    totalAmount: 0,
    adminEarned: 0,
    vendorsEarned: 0,
    vendorToAdminPending: 0,
    adminToVendorPending: 0,
  };

  pieChartType: ChartType = 'pie';

  pieChartData: any = {
    labels: [],
    datasets: [],
  };

  pieChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.loadVendorBookings();
  }

  loadVendorBookings() {
    this.isLoading = true;

    this.bookingService.getVendorBookings().subscribe({
      next: (res) => {
        this.bookings = res || [];
        this.calculateSummary();
        this.buildPieChart();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  calculateSummary() {
    const s = {
      totalBookings: 0,
      totalAmount: 0,

      adminEarned: 0,
      vendorsEarned: 0,

      vendorToAdminPending: 0,
      adminToVendorPending: 0,
    };

    this.bookings.forEach((b) => {
      s.totalBookings += 1;

      const amount = b.bookingAmount || 0;
      const commission = b.commission || 0;

      s.totalAmount += amount;
      s.adminEarned += commission;
      s.vendorsEarned += amount - commission;

      if (!b.isSettled && b.settlementDirection === 'VendorToOwner') {
        s.vendorToAdminPending += b.ownerReceivable || 0;
      }

      if (!b.isSettled && b.settlementDirection === 'OwnerToVendor') {
        s.adminToVendorPending += b.vendorPayable || 0;
      }
    });

    this.summary = s;
  }

  buildPieChart() {
    this.pieChartData = {
      labels: [
        'Admin Earned (Commission)',
        'Drivers Earned',
        'Driver → Admin Pending',
        'Admin → driver Pending',
      ],
      datasets: [
        {
          data: [
            this.summary.adminEarned,
            this.summary.vendorsEarned,
            this.summary.vendorToAdminPending,
            this.summary.adminToVendorPending,
          ],
          backgroundColor: ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b'],
        },
      ],
    };
  }
}

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

  pieChartType: ChartType = 'doughnut';

  pieChartData: any = {
    labels: [],
    datasets: [],
  };

  pieChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false, // sized by .chart-box — it used to fill the whole desktop width
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
      if (b.bookingStatus === 'Canceled') return; // cancelled trips earn nothing
      s.totalBookings += 1;

      const amount = b.bookingAmount || 0;
      const commission = b.commission || 0;
      s.totalAmount += amount;
      s.adminEarned += commission;
      s.vendorsEarned += amount - commission;
    });

    // Outstanding uses what is STILL due (after part payments), not the original amount
    this.bookings.forEach((b) => {
      if (b.isSettled) return;
      const left = b.remaining ?? (b.settlementDirection === 'VendorToOwner' ? b.ownerReceivable : b.pendingVendorPayment) ?? 0;
      if (b.settlementDirection === 'VendorToOwner') s.vendorToAdminPending += left;
      else s.adminToVendorPending += left;
    });

    this.summary = s;
  }

  buildPieChart() {
    // Only the split of the fare. Outstanding balances are shown as cards — mixing them
    // into the same pie counted the same money twice.
    this.pieChartData = {
      labels: ["Your commission", "Partners' share"],
      datasets: [
        {
          data: [this.summary.adminEarned, this.summary.vendorsEarned],
          backgroundColor: ['#22c55e', '#3b82f6'],
        },
      ],
    };
  }
}

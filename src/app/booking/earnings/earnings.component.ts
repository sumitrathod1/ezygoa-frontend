import { Component, OnInit } from '@angular/core';
import { ChartType } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../services/booking.service';
import { VehicleService } from '../../services/vehicle.service';
import { IndianCurrencyPipe } from '../../pipes/indian-currency.pipe';

type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom' | 'all';

@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [NgChartsModule, CommonModule, FormsModule, IndianCurrencyPipe],
  templateUrl: './earnings.component.html',
  styleUrl: './earnings.component.css',
})
export class EarningsComponent implements OnInit {
  allBookings: any[] = [];
  allExpenses: any[] = [];
  bookingsAvgStats: any = {};

  // KPIs
  totalRevenue = 0;
  totalExpenses = 0;
  netProfit = 0;
  growth = 0;

  // Period filter
  selectedPeriod: Period = 'month';
  customFrom = '';
  customTo = '';
  showCustom = false;

  // Month filter
  selectedMonth = 'all';
  availableMonths: { label: string; value: string }[] = [];

  // Charts
  lineChartType: ChartType = 'line';
  lineChartData: any = { labels: [], datasets: [] };
  lineChartOptions: any = {
    responsive: true,
    plugins: { legend: { display: true } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v: any) => '₹' + Number(v).toLocaleString('en-IN') },
      },
    },
  };

  pieChartType: ChartType = 'pie';
  pieChartData: any = { labels: [], datasets: [] };
  pieChartOptions: any = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.parsed} bookings`,
        },
      },
    },
  };

  constructor(
    private bookingService: BookingService,
    private vehicleService: VehicleService
  ) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.bookingService.loadBookings().subscribe({
      next: (data) => {
        this.allBookings = data.bookings || [];
        this.bookingsAvgStats = data.averageStats || {};
        this.buildAvailableMonths();
        this.vehicleService.getCombinedExpenses().subscribe({
          next: (exp: any) => {
            this.allExpenses = Array.isArray(exp) ? exp : exp?.expenses || [];
            this.applyPeriodFilter();
          },
          error: () => this.applyPeriodFilter(),
        });
      },
    });
  }

  selectPeriod(p: Period) {
    this.selectedPeriod = p;
    this.showCustom = p === 'custom';
    if (p !== 'custom') this.applyPeriodFilter();
  }

  applyCustomRange() {
    this.applyPeriodFilter();
  }

  clearFilter() {
    this.selectedPeriod = 'month';
    this.selectedMonth = 'all';
    this.customFrom = '';
    this.customTo = '';
    this.showCustom = false;
    this.applyPeriodFilter();
  }

  selectMonth(val: string) {
    this.selectedMonth = val;
    if (val !== 'all') {
      this.selectedPeriod = 'all';
      this.showCustom = false;
    }
    this.applyPeriodFilter();
  }

  buildAvailableMonths() {
    const seen = new Set<string>();
    this.allBookings.forEach(b => {
      if (!b.travelDate || b.travelDate === '0001-01-01') return;
      const d = new Date(b.travelDate);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      seen.add(val);
    });
    this.availableMonths = Array.from(seen)
      .sort((a, b) => b.localeCompare(a))
      .map(val => {
        const [y, m] = val.split('-');
        const label = new Date(+y, +m - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' });
        return { label, value: val };
      });
  }

  applyPeriodFilter() {
    const { from, to } = this.dateRange();

    const filtered = this.allBookings.filter((b) => {
      if (!b.travelDate || b.travelDate === '0001-01-01') return false;
      const d = new Date(b.travelDate);
      if (this.selectedMonth !== 'all') {
        const [y, m] = this.selectedMonth.split('-');
        return d.getFullYear() === +y && d.getMonth() + 1 === +m;
      }
      return (!from || d >= from) && (!to || d <= to);
    });

    const filteredExp = this.allExpenses.filter((e) => {
      const ds = e.expenseDate || e.date || e.createdAt;
      const d = ds ? new Date(ds) : null;
      return !d || ((!from || d >= from) && (!to || d <= to));
    });

    this.totalRevenue = filtered.reduce((s, b) => s + (b.amount || 0), 0);
    this.totalExpenses = filteredExp.reduce((s, e) => s + (e.amount || 0), 0);
    this.netProfit = this.totalRevenue - this.totalExpenses;

    // Growth vs previous same-length period
    const prev = this.prevPeriodRange(from, to);
    const prevRevenue = this.allBookings
      .filter((b) => {
        if (!b.travelDate || b.travelDate === '0001-01-01') return false;
        const d = new Date(b.travelDate);
        return (!prev.from || d >= prev.from) && (!prev.to || d <= prev.to);
      })
      .reduce((s, b) => s + (b.amount || 0), 0);

    this.growth =
      prevRevenue > 0
        ? Math.round(((this.totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10
        : 0;

    this.updateLineChart(filtered);
    this.updatePieChart(filtered);
  }

  updateLineChart(bookings: any[]) {
    const map: Record<string, number> = {};
    bookings.forEach((b) => {
      if (!b.travelDate || b.travelDate === '0001-01-01') return;
      const d = new Date(b.travelDate);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      map[key] = (map[key] || 0) + (b.amount || 0);
    });
    this.lineChartData = {
      labels: Object.keys(map),
      datasets: [
        {
          label: 'Revenue',
          data: Object.values(map),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.12)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }

  updatePieChart(bookings: any[]) {
    const map: Record<string, number> = {};
    bookings.forEach((b) => {
      const name = b.vehicle?.vehicleName || 'Unknown';
      map[name] = (map[name] || 0) + 1;
    });
    this.pieChartData = {
      labels: Object.keys(map),
      datasets: [
        {
          data: Object.values(map),
          backgroundColor: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7'],
        },
      ],
    };
  }

  dateRange(): { from: Date | null; to: Date | null } {
    const now = new Date();
    switch (this.selectedPeriod) {
      case 'week': {
        const from = new Date(now);
        from.setDate(now.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        return { from, to: now };
      }
      case 'month':
        return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3);
        return { from: new Date(now.getFullYear(), q * 3, 1), to: now };
      }
      case 'year':
        return { from: new Date(now.getFullYear(), 0, 1), to: now };
      case 'custom': {
        const from = this.customFrom ? new Date(this.customFrom) : null;
        let to: Date | null = null;
        if (this.customTo) {
          to = new Date(this.customTo);
          to.setHours(23, 59, 59, 999);
        }
        return { from, to };
      }
      default:
        return { from: null, to: null };
    }
  }

  prevPeriodRange(
    from: Date | null,
    to: Date | null
  ): { from: Date | null; to: Date | null } {
    if (!from || !to) return { from: null, to: null };
    const diff = to.getTime() - from.getTime();
    return {
      from: new Date(from.getTime() - diff - 1),
      to: new Date(from.getTime() - 1),
    };
  }
}

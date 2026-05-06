import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { BookingService } from '../../services/booking.service';
import { VehicleService } from '../../services/vehicle.service';
import { IndianCurrencyPipe } from '../../pipes/indian-currency.pipe';

type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom';

@Component({
  selector: 'app-vehicle-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule, IndianCurrencyPipe],
  templateUrl: './vehicle-statistics.component.html',
  styleUrl: './vehicle-statistics.component.css',
})
export class VehicleStatisticsComponent implements OnInit {
  allBookings: any[] = [];
  allExpenses: any[] = [];
  allVehicles: any[] = [];

  totalRevenue = 0;
  totalExpenses = 0;
  netProfit = 0;
  bestVehicle = '-';

  selectedPeriod: Period = 'month';
  selectedVehicleId: number | null = null;
  customFrom = '';
  customTo = '';
  showCustom = false;

  vehicleStats: { name: string; revenue: number; expenses: number; profit: number }[] = [];

  barChartData: any = { labels: [], datasets: [] };
  barChartType: any = 'bar';
  barChartOptions: any = {
    responsive: true,
    plugins: { legend: { display: true, position: 'bottom' } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v: any) => '₹' + Number(v).toLocaleString('en-IN') },
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
    this.vehicleService.getAllVehicles().subscribe({
      next: (data: any) => {
        this.allVehicles = Array.isArray(data) ? data : data?.vehicles || [];
      },
    });

    this.bookingService.loadBookings().subscribe({
      next: (data) => {
        this.allBookings = data.bookings || [];
        this.vehicleService.getAllExpences().subscribe({
          next: (exp: any) => {
            this.allExpenses = Array.isArray(exp) ? exp : exp?.expenses || [];
            this.applyFilters();
          },
        });
      },
    });
  }

  selectPeriod(p: Period) {
    this.selectedPeriod = p;
    this.showCustom = p === 'custom';
    if (p !== 'custom') this.applyFilters();
  }

  applyCustomRange() {
    this.applyFilters();
  }

  clearFilter() {
    this.selectedPeriod = 'month';
    this.selectedVehicleId = null;
    this.customFrom = '';
    this.customTo = '';
    this.showCustom = false;
    this.applyFilters();
  }

  onVehicleChange() {
    this.applyFilters();
  }

  applyFilters() {
    const { from, to } = this.dateRange();
    const vid = this.selectedVehicleId ? +this.selectedVehicleId : null;

    const bookings = this.allBookings.filter((b) => {
      if (!b.travelDate || b.travelDate === '0001-01-01') return false;
      const d = new Date(b.travelDate);
      const dateOk = (!from || d >= from) && (!to || d <= to);
      const vehOk = !vid || b.vehicle?.vehicleId === vid || b.vehicleId === vid;
      return dateOk && vehOk;
    });

    const expenses = this.allExpenses.filter((e) => {
      const dateStr = e.expenseDate || e.date || e.createdAt;
      const d = dateStr ? new Date(dateStr) : null;
      const dateOk = !d || ((!from || d >= from) && (!to || d <= to));
      const vehOk = !vid || e.vehicleId === vid;
      return dateOk && vehOk;
    });

    this.totalRevenue = bookings.reduce((s, b) => s + (b.amount || 0), 0);
    this.totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    this.netProfit = this.totalRevenue - this.totalExpenses;

    const map: Record<string, { name: string; revenue: number; expenses: number }> = {};
    bookings.forEach((b) => {
      const name = b.vehicle?.vehicleName || b.vehicleName || 'Unknown';
      if (!map[name]) map[name] = { name, revenue: 0, expenses: 0 };
      map[name].revenue += b.amount || 0;
    });
    expenses.forEach((e) => {
      const name = e.vehicle?.vehicleName || e.vehicleName || 'Unknown';
      if (!map[name]) map[name] = { name, revenue: 0, expenses: 0 };
      map[name].expenses += e.amount || 0;
    });

    this.vehicleStats = Object.values(map)
      .map((v) => ({ ...v, profit: v.revenue - v.expenses }))
      .sort((a, b) => b.revenue - a.revenue);

    this.bestVehicle = this.vehicleStats[0]?.name || '-';
    this.updateChart(bookings);
  }

  updateChart(bookings: any[]) {
    const monthMap: Record<string, Record<string, number>> = {};
    const vehicleSet = new Set<string>();

    bookings.forEach((b) => {
      if (!b.travelDate || b.travelDate === '0001-01-01') return;
      const d = new Date(b.travelDate);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const name = b.vehicle?.vehicleName || b.vehicleName || 'Unknown';
      vehicleSet.add(name);
      if (!monthMap[key]) monthMap[key] = {};
      monthMap[key][name] = (monthMap[key][name] || 0) + (b.amount || 0);
    });

    const labels = Object.keys(monthMap);
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7'];
    const datasets = Array.from(vehicleSet).map((name, i) => ({
      label: name,
      data: labels.map((l) => monthMap[l]?.[name] || 0),
      backgroundColor: colors[i % colors.length],
    }));

    this.barChartData = { labels, datasets };
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
    }
  }
}

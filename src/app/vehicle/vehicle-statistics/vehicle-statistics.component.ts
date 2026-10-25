import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';
import { VehicleService } from '../../services/vehicle.service';
import { DashboardService, FleetSummary, FleetVehicle } from '../../services/dashboard.service';
import { IndianCurrencyPipe } from '../../pipes/indian-currency.pipe';
import { categoryIcon, isoDate, prettyType, rangeLabel } from '../fleet-ui';

type Period = 'week' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom';

/**
 * Vehicle statistics: earnings, spending and profit for the whole fleet or one car, compared
 * with the period before, a six-month trend, where the money goes, and every car ranked.
 * All figures come from GET /Dashboard/fleet.
 */
@Component({
  selector: 'app-vehicle-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgChartsModule, IndianCurrencyPipe],
  templateUrl: './vehicle-statistics.component.html',
  styleUrl: './vehicle-statistics.component.css',
})
export class VehicleStatisticsComponent implements OnInit {
  fleet: FleetSummary | null = null;
  loading = false;
  error = '';
  allVehicles: any[] = [];

  selectedPeriod: Period = 'month';
  selectedVehicleId: number | null = null;
  customFrom = '';
  customTo = '';
  showCustom = false;

  readonly periods: { key: Period; label: string }[] = [
    { key: 'week', label: 'Last 7 days' },
    { key: 'month', label: 'This month' },
    { key: 'lastMonth', label: 'Last month' },
    { key: 'quarter', label: 'This quarter' },
    { key: 'year', label: 'This year' },
    { key: 'custom', label: 'Custom' },
  ];
  readonly prettyType = prettyType;
  readonly categoryIcon = categoryIcon;

  trendData: any = { labels: [], datasets: [] };
  trendOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: { callbacks: { label: (c: any) => `${c.dataset.label}: ₹${Number(c.raw).toLocaleString('en-IN')}` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { callback: (v: any) => '₹' + VehicleStatisticsComponent.short(Number(v)) },
      },
    },
  };

  constructor(
    private _dashboard: DashboardService,
    private _vehicleService: VehicleService,
    private _route: ActivatedRoute,
    private _router: Router
  ) {}

  ngOnInit() {
    const id = Number(this._route.snapshot.queryParamMap.get('vehicleId'));
    this.selectedVehicleId = id > 0 ? id : null;
    this._vehicleService.getAllVehicles().subscribe({
      next: (data: any) => (this.allVehicles = Array.isArray(data) ? data : data?.vehicles || []),
    });
    this.load();
  }

  /** ₹1.2L / ₹45K for chart axes */
  static short(v: number): string {
    const a = Math.abs(v);
    if (a >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (a >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
    if (a >= 1e3) return (v / 1e3).toFixed(0) + 'K';
    return String(v);
  }

  selectPeriod(p: Period) {
    this.selectedPeriod = p;
    this.showCustom = p === 'custom';
    if (p !== 'custom') this.load();
  }

  applyCustomRange() {
    if (this.customFrom && this.customTo && this.customFrom > this.customTo) {
      this.error = "'From' date must be before 'To' date";
      return;
    }
    this.load();
  }

  onVehicleChange() {
    // Keep the choice in the address so Back / refresh return to the same car
    this._router.navigate([], { queryParams: { vehicleId: this.selectedVehicleId || null }, replaceUrl: true });
    this.load();
  }

  load() {
    const { from, to } = this.dateRange();
    this.loading = true;
    this.error = '';
    this._dashboard.getFleet(from, to, this.selectedVehicleId).subscribe({
      next: (f) => {
        this.fleet = f;
        this.loading = false;
        this.buildChart(f);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Could not load the figures.';
      },
    });
  }

  dateRange(): { from: string; to: string } {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (this.selectedPeriod) {
      case 'week': {
        const from = new Date(now);
        from.setDate(now.getDate() - 6);
        return { from: isoDate(from), to: isoDate(now) };
      }
      case 'lastMonth':
        return { from: isoDate(new Date(y, m - 1, 1)), to: isoDate(new Date(y, m, 0)) };
      case 'quarter':
        return { from: isoDate(new Date(y, Math.floor(m / 3) * 3, 1)), to: isoDate(now) };
      case 'year':
        return { from: isoDate(new Date(y, 0, 1)), to: isoDate(now) };
      case 'custom':
        return { from: this.customFrom || isoDate(new Date(y, m, 1)), to: this.customTo || isoDate(now) };
      default:
        return { from: isoDate(new Date(y, m, 1)), to: isoDate(now) };
    }
  }

  buildChart(f: FleetSummary) {
    this.trendData = {
      labels: f.trend.map((t) => t.label),
      datasets: [
        { type: 'bar', label: 'Earned', data: f.trend.map((t) => t.revenue), backgroundColor: '#22c55e', borderRadius: 6, maxBarThickness: 26, order: 2 },
        { type: 'bar', label: 'Spent', data: f.trend.map((t) => t.expenses), backgroundColor: '#f87171', borderRadius: 6, maxBarThickness: 26, order: 2 },
        {
          type: 'line', label: 'Profit', data: f.trend.map((t) => t.profit), borderColor: '#4b2aad', backgroundColor: '#4b2aad',
          pointBackgroundColor: '#4b2aad', pointBorderColor: '#fff', pointBorderWidth: 2,
          tension: 0.35, pointRadius: 4, borderWidth: 2.5, order: 1,
        },
      ],
    };
  }

  get periodLabel(): string {
    return this.fleet ? rangeLabel(this.fleet.from, this.fleet.to) : '';
  }

  get selectedVehicleName(): string {
    return this.allVehicles.find((v) => v.vehicleId === this.selectedVehicleId)?.vehicleName ?? 'This vehicle';
  }

  /** Every car ranked by profit, best first */
  get ranking(): FleetVehicle[] {
    return [...(this.fleet?.vehicles ?? [])].sort((a, b) => b.profit - a.profit);
  }

  get topEarnerId(): number | null {
    const best = [...this.ranking].sort((a, b) => b.revenue - a.revenue)[0];
    return best && best.revenue > 0 ? best.vehicleId : null;
  }

  get mostUsedId(): number | null {
    const best = [...this.ranking].sort((a, b) => b.busyDays - a.busyDays)[0];
    return best && best.busyDays > 0 ? best.vehicleId : null;
  }

  get maxRevenue(): number {
    return Math.max(1, ...this.ranking.map((v) => Math.max(v.revenue, v.expenses)));
  }

  get maxCategory(): number {
    return Math.max(1, ...(this.fleet?.byCategory ?? []).map((c) => c.amount));
  }

  categoryShare(amount: number): number {
    const total = this.fleet?.totals.expenses || 0;
    return total ? Math.round((100 * amount) / total) : 0;
  }

  /** Arrow + colour for a % change; for spending, going up is bad */
  trend(pct: number, upIsGood = true): { icon: string; cls: string; text: string } {
    if (!pct) return { icon: 'bi-dash', cls: 'flat', text: '0%' };
    const good = pct > 0 === upIsGood;
    return { icon: pct > 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right', cls: good ? 'good' : 'bad', text: `${Math.abs(pct)}%` };
  }

  pick(v: FleetVehicle) {
    this.selectedVehicleId = v.vehicleId;
    this.onVehicleChange();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showAll() {
    this.selectedVehicleId = null;
    this.onVehicleChange();
  }

  trackVehicle = (_: number, v: FleetVehicle) => v.vehicleId;
}

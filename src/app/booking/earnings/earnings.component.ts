import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { IndianCurrencyPipe } from '../../pipes/indian-currency.pipe';
import { PeriodChipsComponent, PeriodKey, PeriodRange, localIso } from '../../shared/period-chips/period-chips.component';
import { rangeLabel } from '../../vehicle/fleet-ui';
import { shortMoney } from '../booking.component';

/** The same number of days just before a period */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  const prevTo = new Date(a);
  prevTo.setDate(a.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevTo.getDate() - (days - 1));
  return { from: localIso(prevFrom), to: localIso(prevTo) };
}

/**
 * Earnings: what the business earned (own trips + partner commission), what it spent
 * (vehicles, salaries, ads, other), net earnings vs the period before, commission still to
 * collect, money owed to partners, a 6-month trend and the best partners.
 * Figures come from GET /Dashboard/earnings-summary (commission only on partner bookings).
 */
@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [CommonModule, RouterModule, NgChartsModule, IndianCurrencyPipe, PeriodChipsComponent],
  templateUrl: './earnings.component.html',
  styleUrl: './earnings.component.css',
})
export class EarningsComponent {
  cur: any = null;
  prev: any = null;
  trendRows: { label: string; revenue: number; expenses: number }[] = [];
  loading = false;
  error = '';
  period: PeriodRange | null = null;
  periodKey: PeriodKey = 'month';

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
      y: { grid: { color: '#f1f5f9' }, ticks: { callback: (v: any) => '₹' + shortMoney(Number(v)) } },
    },
  };

  constructor(private _dashboard: DashboardService) {}

  onPeriod(p: PeriodRange) {
    this.period = p;
    this.periodKey = p.key;
    this.load();
  }

  load() {
    if (!this.period) return;
    const { from, to } = this.period;
    const before = previousRange(from, to);
    const end = new Date(to + 'T00:00:00');
    this.loading = true;
    this.error = '';
    forkJoin({
      cur: this._dashboard.getEarningsSummary(from, to),
      prev: this._dashboard.getEarningsSummary(before.from, before.to),
      months: this._dashboard.getExpenseSummary(end.getMonth() + 1, end.getFullYear()),
    }).subscribe({
      next: ({ cur, prev, months }) => {
        this.cur = cur;
        this.prev = prev;
        this.trendRows = months?.monthlyTrend ?? [];
        this.loading = false;
        this.buildChart();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Could not load the earnings.';
      },
    });
  }

  buildChart() {
    const rows = this.trendRows;
    this.trendData = {
      labels: rows.map((r) => r.label),
      datasets: [
        { type: 'bar', label: 'Earned', data: rows.map((r) => r.revenue), backgroundColor: '#22c55e', borderRadius: 6, maxBarThickness: 26, order: 2 },
        { type: 'bar', label: 'Spent', data: rows.map((r) => r.expenses), backgroundColor: '#f87171', borderRadius: 6, maxBarThickness: 26, order: 2 },
        {
          type: 'line', label: 'Net', data: rows.map((r) => r.revenue - r.expenses), borderColor: '#4b2aad', backgroundColor: '#4b2aad',
          pointBackgroundColor: '#4b2aad', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4, tension: 0.35, borderWidth: 2.5, order: 1,
        },
      ],
    };
  }

  get periodLabel(): string {
    return this.cur ? rangeLabel(this.cur.from, this.cur.to) : '';
  }

  get net(): number {
    return this.cur?.netEarnings ?? 0;
  }

  get margin(): number {
    const e = this.cur?.earnedRevenue ?? 0;
    return e ? Math.round((100 * this.net) / e) : 0;
  }

  /** % change against the period before (0 when there is nothing to compare with) */
  change(now: number, before: number): number {
    return before ? Math.round((100 * (now - before)) / Math.abs(before)) : 0;
  }

  trend(pct: number, upIsGood = true): { icon: string; cls: string; text: string } {
    if (!pct) return { icon: 'bi-dash', cls: 'flat', text: '0%' };
    const good = pct > 0 === upIsGood;
    return { icon: pct > 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right', cls: good ? 'good' : 'bad', text: `${Math.abs(pct)}%` };
  }

  /** Own trips vs partner commission, as % of what was earned */
  get ownShare(): number {
    const e = this.cur?.earnedRevenue ?? 0;
    return e ? Math.round((100 * (this.cur.ownBookingRevenue ?? 0)) / e) : 0;
  }

  /** Spending split, biggest first, zero rows left out */
  get costs(): { key: string; label: string; icon: string; amount: number }[] {
    const x = this.cur?.expenses;
    if (!x) return [];
    return [
      { key: 'vehicle', label: 'Vehicles (fuel, EMI, repairs…)', icon: 'bi-car-front-fill', amount: x.vehicle },
      { key: 'salaries', label: 'Salaries', icon: 'bi-person-badge-fill', amount: x.salaries },
      { key: 'advertising', label: 'Advertising', icon: 'bi-megaphone-fill', amount: x.advertising },
      { key: 'business', label: 'Other business costs', icon: 'bi-briefcase-fill', amount: x.business },
    ]
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  costShare(amount: number): number {
    const t = this.cur?.expenses?.total ?? 0;
    return t ? Math.round((100 * amount) / t) : 0;
  }

  get topPartners(): any[] {
    return (this.cur?.partners ?? []).slice(0, 5);
  }
}

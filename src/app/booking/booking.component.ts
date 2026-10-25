import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgChartsModule } from 'ng2-charts';
import { skip } from 'rxjs';
import { BookingService } from '../services/booking.service';
import { EmailServiceService } from '../services/email-service.service';
import { BookingsOverview, DashboardService } from '../services/dashboard.service';
import { IndianCurrencyPipe } from '../pipes/indian-currency.pipe';
import { PeriodChipsComponent, PeriodKey, PeriodRange } from '../shared/period-chips/period-chips.component';
import { typeLabel } from '../shared/booking-types';
import { rangeLabel } from '../vehicle/fleet-ui';

/** ₹1.2L / ₹45K for chart axes */
export function shortMoney(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e7) return (v / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
  if (a >= 1e5) return (v / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
  if (a >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(v);
}

/**
 * Bookings overview: how many bookings and what they earned in a period (vs the period
 * before), the week ahead, cancellations, returning customers, booking types, where
 * bookings come from and a 12-month trend — all worked out on the server.
 */
@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, RouterModule, NgChartsModule, IndianCurrencyPipe, PeriodChipsComponent],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.css',
})
export class BookingComponent implements OnInit {
  data: BookingsOverview | null = null;
  loading = false;
  error = '';
  period: PeriodRange | null = null;
  periodKey: PeriodKey = 'month';

  readonly typeLabel = (t: string) => typeLabel(t);

  trendData: any = { labels: [], datasets: [] };
  trendOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        callbacks: {
          label: (c: any) => (c.dataset.yAxisID === 'money' ? `Earned: ₹${Number(c.raw).toLocaleString('en-IN')}` : `Bookings: ${c.raw}`),
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 8 } },
      count: { position: 'left', beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { precision: 0 } },
      money: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { callback: (v: any) => '₹' + shortMoney(Number(v)) } },
    },
  };

  constructor(
    private _dashboard: DashboardService,
    private _bookingService: BookingService,
    private _emailService: EmailServiceService
  ) {}

  ngOnInit() {
    // A new / edited booking refreshes the figures (bookingUpdated$ replays on subscribe — skip that)
    this._bookingService.bookingUpdated$.pipe(skip(1)).subscribe(() => {
      this.load();
      this._emailService.refreshCount();
    });
  }

  onPeriod(p: PeriodRange) {
    this.period = p;
    this.periodKey = p.key;
    this.load();
  }

  load() {
    if (!this.period) return;
    this.loading = true;
    this.error = '';
    this._dashboard.getBookingsOverview(this.period.from, this.period.to).subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
        this.buildChart(d);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Could not load the booking figures.';
      },
    });
  }

  buildChart(d: BookingsOverview) {
    this.trendData = {
      labels: d.trend.map((t) => t.label),
      datasets: [
        { type: 'bar', label: 'Bookings', data: d.trend.map((t) => t.count), yAxisID: 'count', backgroundColor: '#a5b4fc', hoverBackgroundColor: '#6366f1', borderRadius: 6, maxBarThickness: 22, order: 2 },
        {
          type: 'line', label: 'Earned', data: d.trend.map((t) => t.earned), yAxisID: 'money', borderColor: '#16a34a', backgroundColor: '#16a34a',
          pointBackgroundColor: '#16a34a', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 3.5, tension: 0.35, borderWidth: 2.5, order: 1,
        },
      ],
    };
  }

  get periodLabel(): string {
    return this.data ? rangeLabel(this.data.from, this.data.to) : '';
  }

  /** Arrow + colour for a % change */
  trend(pct: number): { icon: string; cls: string; text: string } {
    if (!pct) return { icon: 'bi-dash', cls: 'flat', text: '0%' };
    return { icon: pct > 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right', cls: pct > 0 ? 'good' : 'bad', text: `${Math.abs(pct)}%` };
  }

  get maxType(): number {
    return Math.max(1, ...(this.data?.byType ?? []).map((t) => t.count));
  }

  get maxDay(): number {
    return Math.max(1, ...(this.data?.nextDays ?? []).map((d) => d.count));
  }

  get openThisWeek(): number {
    return (this.data?.nextDays ?? []).reduce((s, d) => s + d.open, 0);
  }

  get weekCount(): number {
    return (this.data?.nextDays ?? []).reduce((s, d) => s + d.count, 0);
  }

  share(count: number): number {
    const total = this.data?.totals.bookings || 0;
    return total ? Math.round((100 * count) / total) : 0;
  }
}

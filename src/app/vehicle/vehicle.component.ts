import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { ExpenseFormComponent } from './expense-form/expense-form.component';
import { VehicleService } from '../services/vehicle.service';
import { DashboardService, FleetSummary, FleetVehicle } from '../services/dashboard.service';
import { IndianCurrencyPipe } from '../pipes/indian-currency.pipe';
import { categoryIcon, dueText, prettyType, rangeLabel } from './fleet-ui';

/**
 * Vehicles home: how the fleet is doing this month (profit, earnings, expenses, how busy
 * the cars are), what needs attention (papers expiring, services due) and every car at a glance.
 * Figures come from the server (GET /Dashboard/fleet), not from adding up lists in the browser.
 */
@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, RouterModule, IndianCurrencyPipe],
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.css',
})
export class VehicleComponent implements OnInit {
  fleet: FleetSummary | null = null;
  loading = true;
  error = '';
  recentExpenses: any[] = [];

  readonly dueText = dueText;
  readonly prettyType = prettyType;
  readonly categoryIcon = categoryIcon;

  constructor(
    private _dialog: MatDialog,
    private _vehicleService: VehicleService,
    private _dashboard: DashboardService,
    private _router: Router
  ) {}

  ngOnInit() {
    this.load();
    this._vehicleService.getAllExpences().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : [];
        this.recentExpenses = [...list]
          .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
          .slice(0, 4);
      },
    });
  }

  load() {
    this.loading = true;
    this.error = '';
    this._dashboard.getFleet().subscribe({
      next: (f) => {
        this.fleet = f;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load the fleet figures.';
      },
    });
  }

  get periodLabel(): string {
    return this.fleet ? rangeLabel(this.fleet.from, this.fleet.to) : '';
  }

  /** Number of things to look at: papers expiring and services due */
  get alertCount(): number {
    return (this.fleet?.alerts.documents.length ?? 0) + (this.fleet?.alerts.services.length ?? 0);
  }

  /** Highest earner this month (only when it actually made money) */
  get topEarnerId(): number | null {
    const best = [...(this.fleet?.vehicles ?? [])].sort((a, b) => b.revenue - a.revenue)[0];
    return best && best.revenue > 0 ? best.vehicleId : null;
  }

  /** Width of the "out today" ring, 0–100 */
  get outTodayPct(): number {
    const f = this.fleet;
    return f && f.totals.vehicles ? Math.round((100 * f.today.out) / f.totals.vehicles) : 0;
  }

  /** Arrow + colour for a % change; for expenses going up is bad */
  trend(pct: number, upIsGood = true): { icon: string; cls: string; text: string } {
    if (!pct) return { icon: 'bi-dash', cls: 'flat', text: 'same as before' };
    const good = pct > 0 === upIsGood;
    return { icon: pct > 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right', cls: good ? 'good' : 'bad', text: `${Math.abs(pct)}%` };
  }

  openVehicle(v: FleetVehicle) {
    this._router.navigate(['/vehicle-statistics'], { queryParams: { vehicleId: v.vehicleId } });
  }

  addExpense() {
    this._dialog
      .open(ExpenseFormComponent, { maxWidth: '95vw' })
      .afterClosed()
      .subscribe(() => this.load());
  }

  trackVehicle = (_: number, v: FleetVehicle) => v.vehicleId;
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { VehicleService } from '../services/vehicle.service';
import { DashboardService } from '../services/dashboard.service';
import { ExpenseFormComponent } from '../vehicle/expense-form/expense-form.component';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css',
})
export class ExpensesComponent implements OnInit {
  allExpenses: any[] = [];
  vehicles: any[] = [];
  summary: any = null;
  isLoadingSummary = false;
  isLoadingList = false;

  selectedMonth: number;
  selectedYear: number;
  availableYears: number[] = [];

  readonly months = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 },
    { label: 'March', value: 3 },   { label: 'April', value: 4 },
    { label: 'May', value: 5 },     { label: 'June', value: 6 },
    { label: 'July', value: 7 },    { label: 'August', value: 8 },
    { label: 'September', value: 9 },{ label: 'October', value: 10 },
    { label: 'November', value: 11 },{ label: 'December', value: 12 },
  ];

  readonly kpiCards = [
    { key: 'Salary',      icon: 'bi-person-badge-fill', label: 'Salary',      cls: 'kpi-salary'    },
    { key: 'Fuel',        icon: 'bi-fuel-pump-fill',    label: 'Fuel',        cls: 'kpi-fuel'      },
    { key: 'Repair',      icon: 'bi-tools',             label: 'Repair',      cls: 'kpi-repair'    },
    { key: 'EMI',         icon: 'bi-bank',              label: 'EMI',         cls: 'kpi-emi'       },
    { key: 'Service',     icon: 'bi-wrench-adjustable', label: 'Service',     cls: 'kpi-service'   },
    { key: 'Insurance',   icon: 'bi-shield-check',      label: 'Insurance',   cls: 'kpi-insurance' },
    { key: 'Tyre',        icon: 'bi-circle-half',       label: 'Tyre',        cls: 'kpi-tyre'      },
    { key: 'Other',       icon: 'bi-three-dots',        label: 'Other',       cls: 'kpi-other'     },
  ];

  filterVehicle = '';
  filterType = '';

  readonly categoryTypes = [
    'Fuel', 'Repair', 'Towing', 'DocumentRenew',
    'Salary', 'EMI', 'Insurance', 'Service', 'Tyre', 'Other',
  ];

  constructor(
    private _vehicleService: VehicleService,
    private _dashboardService: DashboardService,
    private _dialog: MatDialog,
    private _toastr: ToastrService,
  ) {
    const now = new Date();
    this.selectedMonth = now.getMonth() + 1;
    this.selectedYear  = now.getFullYear();
    for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) {
      this.availableYears.push(y);
    }
  }

  ngOnInit() {
    this._vehicleService.getAllVehicles().subscribe({
      next: (d: any) => this.vehicles = Array.isArray(d) ? d : (d?.data ?? []),
    });
    this.loadAll();
  }

  loadAll() {
    this.loadSummary();
    this.loadList();
  }

  loadSummary() {
    this.isLoadingSummary = true;
    this._dashboardService.getExpenseSummary(this.selectedMonth, this.selectedYear).subscribe({
      next: (data: any) => { this.summary = data; this.isLoadingSummary = false; },
      error: () => { this.isLoadingSummary = false; },
    });
  }

  loadList() {
    this.isLoadingList = true;
    const m   = this.selectedMonth;
    const y   = this.selectedYear;
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${y}-${pad(m)}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end   = `${y}-${pad(m)}-${lastDay}`;

    this._vehicleService.getCombinedExpenses({ startDate: start, endDate: end }).subscribe({
      next: (data: any) => {
        this.allExpenses = Array.isArray(data) ? data : [];
        this.isLoadingList = false;
      },
      error: () => { this.isLoadingList = false; },
    });
  }

  get filteredExpenses(): any[] {
    return this.allExpenses.filter(e => {
      if (this.filterVehicle && e.vehicleID?.toString() !== this.filterVehicle) return false;
      if (this.filterType    && e.categoryType !== this.filterType)              return false;
      return true;
    });
  }

  onMonthYearChange() { this.loadAll(); }

  getCategoryAmount(key: string): number {
    if (!this.summary) return 0;
    if (key === 'Salary') return this.summary.salaryExpenses ?? 0;
    const found = (this.summary.byCategory as any[])?.find(b => b.category === key);
    return found?.amount ?? 0;
  }

  vehicleBarPct(total: number): number {
    if (!this.summary?.vehicleBreakdown?.length) return 0;
    const max = Math.max(...(this.summary.vehicleBreakdown as any[]).map(v => v.total));
    return max > 0 ? Math.round((total / max) * 100) : 0;
  }

  trendBarPct(amount: number): number {
    if (!this.summary?.monthlyTrend?.length) return 0;
    const max = Math.max(...(this.summary.monthlyTrend as any[])
      .flatMap((t: any) => [t.revenue ?? 0, t.expenses ?? 0]));
    return max > 0 ? Math.round((amount / max) * 100) : 0;
  }

  addExpense() {
    const ref = this._dialog.open(ExpenseFormComponent, { data: {}, width: '480px' });
    ref.afterClosed().subscribe(() => this.loadAll());
  }

  editExpense(expense: any) {
    const ref = this._dialog.open(ExpenseFormComponent, {
      data: { expense, vehicleID: expense.vehicleID }, width: '480px',
    });
    ref.afterClosed().subscribe(() => this.loadAll());
  }

  deleteExpense(expense: any) {
    if (expense.isSalaryRecord) return;
    if (!confirm(`Delete ₹${expense.amount} ${expense.categoryType} expense?`)) return;
    this._vehicleService.deleteExpense(expense.vehicleExpenceId).subscribe({
      next: () => {
        this._toastr.success('Expense deleted', 'Done');
        this.allExpenses = this.allExpenses.filter(e => e.vehicleExpenceId !== expense.vehicleExpenceId);
        this.loadSummary();
      },
      error: () => this._toastr.error('Error deleting expense', 'Error'),
    });
  }

  exportCSV() {
    const rows = [['Vehicle/Driver', 'Date', 'Type', 'Amount', 'Notes']];
    this.filteredExpenses.forEach(e => {
      rows.push([
        e.isSalaryRecord ? (e.driverName || '') : (e.vehicle?.vehicleName || ''),
        e.expenseDate ? new Date(e.expenseDate).toLocaleDateString() : '',
        e.categoryType || '',
        e.amount?.toString() || '',
        e.notes || '',
      ]);
    });
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  getBadgeClass(type: string): string {
    const map: Record<string, string> = {
      Fuel: 'badge-fuel', Repair: 'badge-repair', Towing: 'badge-towing',
      DocumentRenew: 'badge-doc', Salary: 'badge-salary', EMI: 'badge-emi',
      Insurance: 'badge-insurance', Service: 'badge-service',
      Tyre: 'badge-tyre', Other: 'badge-other',
    };
    return map[type] || 'badge-other';
  }
}

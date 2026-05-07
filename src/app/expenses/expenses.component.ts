import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { VehicleService } from '../services/vehicle.service';
import { ExpenseFormComponent } from '../vehicle/expense-form/expense-form.component';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css',
})
export class ExpensesComponent implements OnInit {
  expenses: any[]  = [];
  vehicles: any[]  = [];
  summary: any     = null;
  isLoading        = false;

  // Filters
  selectedVehicle  = '';
  selectedType     = '';
  period           = 'month';       // all | week | month | quarter | year | custom
  customStart      = '';
  customEnd        = '';

  readonly categoryTypes = [
    'Fuel', 'Repair', 'Towing', 'DocumentRenew',
    'Salary', 'EMI', 'Insurance', 'Service', 'Other',
  ];

  constructor(
    private _vehicleService: VehicleService,
    private _dialog: MatDialog,
    private _toastr: ToastrService,
  ) {}

  ngOnInit() {
    this._vehicleService.getAllVehicles().subscribe({ next: (d: any) => this.vehicles = d ?? [] });
    this.load();
  }

  get dateRange(): { startDate: string; endDate: string } {
    const now   = new Date();
    const today = now.toISOString().split('T')[0];

    if (this.period === 'week') {
      const d = new Date(now);
      d.setDate(now.getDate() - 6);
      return { startDate: d.toISOString().split('T')[0], endDate: today };
    }
    if (this.period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      return { startDate: start, endDate: today };
    }
    if (this.period === 'quarter') {
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { startDate: qStart.toISOString().split('T')[0], endDate: today };
    }
    if (this.period === 'year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      return { startDate: start, endDate: today };
    }
    if (this.period === 'custom') {
      return { startDate: this.customStart, endDate: this.customEnd };
    }
    return { startDate: '', endDate: '' }; // all
  }

  load() {
    this.isLoading = true;
    const { startDate, endDate } = this.dateRange;
    const params: any = {};
    if (this.selectedVehicle) params.vehicleId = this.selectedVehicle;
    if (this.selectedType)    params.type       = this.selectedType;
    if (startDate)            params.startDate  = startDate;
    if (endDate)              params.endDate    = endDate;

    this._vehicleService.getCombinedExpenses(params).subscribe({
      next: (data: any) => {
        this.expenses  = Array.isArray(data) ? data : [];
        this.isLoading = false;
        this.buildSummary();
      },
      error: () => { this.isLoading = false; },
    });
  }

  buildSummary() {
    const total = this.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const byType: Record<string, number> = {};
    const byVehicle: Record<string, { name: string; total: number }> = {};

    this.expenses.forEach(e => {
      byType[e.categoryType] = (byType[e.categoryType] || 0) + Number(e.amount);
      const vid = e.vehicleID;
      if (!byVehicle[vid]) byVehicle[vid] = { name: e.vehicle?.vehicleName || 'Unknown', total: 0 };
      byVehicle[vid].total += Number(e.amount);
    });

    const byVehicleArr = Object.values(byVehicle).sort((a, b) => b.total - a.total);
    const maxV = byVehicleArr[0]?.total || 1;

    this.summary = {
      total,
      fuel:      byType['Fuel']      || 0,
      repair:    byType['Repair']    || 0,
      salary:    byType['Salary']    || 0,
      emi:       byType['EMI']       || 0,
      insurance: byType['Insurance'] || 0,
      byVehicle: byVehicleArr.map(v => ({ ...v, pct: Math.round((v.total / maxV) * 100) })),
      byType: Object.entries(byType)
        .map(([t, a]) => ({ type: t, amount: a, pct: total ? Math.round((a / total) * 100) : 0 }))
        .sort((a, b) => b.amount - a.amount),
    };
  }

  addExpense() {
    const ref = this._dialog.open(ExpenseFormComponent, {
      data: {},
      width: '480px',
    });
    ref.afterClosed().subscribe(() => this.load());
  }

  editExpense(expense: any) {
    const ref = this._dialog.open(ExpenseFormComponent, {
      data: { expense, vehicleID: expense.vehicleID },
      width: '480px',
    });
    ref.afterClosed().subscribe(() => this.load());
  }

  deleteExpense(expense: any) {
    if (expense.isSalaryRecord) return; // salary records managed via salary module
    if (!confirm(`Delete ₹${expense.amount} ${expense.categoryType} expense?`)) return;
    this._vehicleService.deleteExpense(expense.vehicleExpenceId).subscribe({
      next: () => {
        this._toastr.success('Expense deleted', 'Done');
        this.expenses = this.expenses.filter(e => e.vehicleExpenceId !== expense.vehicleExpenceId);
        this.buildSummary();
      },
      error: () => this._toastr.error('Error deleting expense', 'Error'),
    });
  }

  exportCSV() {
    const rows = [['Vehicle/Driver', 'Date', 'Type', 'Amount', 'Notes']];
    this.expenses.forEach(e => {
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
    const a    = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  getBadgeClass(type: string): string {
    const map: Record<string, string> = {
      Fuel: 'badge-fuel', Repair: 'badge-repair', Towing: 'badge-towing',
      DocumentRenew: 'badge-doc', Salary: 'badge-salary', EMI: 'badge-emi',
      Insurance: 'badge-insurance', Service: 'badge-service', Other: 'badge-other',
    };
    return map[type] || 'badge-other';
  }
}

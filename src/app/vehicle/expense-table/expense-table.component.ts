import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { VehicleService } from '../../services/vehicle.service';
import { ExpenseFormComponent } from '../expense-form/expense-form.component';

@Component({
  selector: 'app-expense-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-table.component.html',
  styleUrl: './expense-table.component.css',
})
export class ExpenseTableComponent {
  expenses: any[] = [];
  searchQuery = '';
  selectedType = '';
  categoryTypes = ['Fuel', 'Repair', 'Towing', 'DocumentRenew', 'Salary', 'EMI', 'Insurance', 'Service', 'Other'];

  constructor(
    private _vehicleService: VehicleService,
    private _dialog: MatDialog,
    private _toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadExpenses();
  }

  loadExpenses() {
    this._vehicleService.getAllExpences().subscribe({
      next: (data: any) => {
        this.expenses = Array.isArray(data) ? data : [];
      },
    });
  }

  get filteredExpenses() {
    let result = this.expenses;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.vehicle?.vehicleName?.toLowerCase().includes(q) ||
          e.categoryType?.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q)
      );
    }
    if (this.selectedType) {
      result = result.filter((e) => e.categoryType === this.selectedType);
    }
    return result;
  }

  get totalAmount() {
    return this.filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }

  getBadgeClass(type: string): string {
    const map: Record<string, string> = {
      Fuel:         'badge-fuel',
      Repair:       'badge-repair',
      Towing:       'badge-towing',
      DocumentRenew:'badge-doc',
      Salary:       'badge-salary',
      EMI:          'badge-emi',
      Insurance:    'badge-insurance',
      Service:      'badge-service',
      Other:        'badge-other',
    };
    return map[type] || 'badge-default';
  }

  editExpense(expense: any) {
    const ref = this._dialog.open(ExpenseFormComponent, {
      data: { expense, vehicleID: expense.vehicleID },
      width: '480px',
    });
    ref.afterClosed().subscribe(() => this.loadExpenses());
  }

  deleteExpense(expense: any) {
    if (!confirm(`Delete ₹${expense.amount} ${expense.categoryType} expense?`)) return;
    this._vehicleService.deleteExpense(expense.vehicleExpenceId).subscribe({
      next: () => {
        this._toastr.success('Expense deleted', 'Done');
        this.expenses = this.expenses.filter(
          (e) => e.vehicleExpenceId !== expense.vehicleExpenceId
        );
      },
      error: () => this._toastr.error('Error deleting expense', 'Error'),
    });
  }

  exportCSV() {
    const rows = [['Vehicle', 'Date', 'Type', 'Amount', 'Notes']];
    this.filteredExpenses.forEach((e) => {
      rows.push([
        e.vehicle?.vehicleName || '',
        e.expenseDate ? new Date(e.expenseDate).toLocaleDateString() : '',
        e.categoryType || '',
        e.amount?.toString() || '',
        e.notes || '',
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'expenses.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../services/vehicle.service';

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
  categoryTypes = ['CNG', 'Repair', 'Fuel', 'DocumentRenew'];

  constructor(private _VechicleService: VehicleService) {}

  ngOnInit() {
    this.loadExpenses();
  }

  loadExpenses() {
    this._VechicleService.getAllExpences().subscribe({
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
          e.categoryType?.toLowerCase().includes(q)
      );
    }
    if (this.selectedType) {
      result = result.filter((e) => e.categoryType === this.selectedType);
    }
    return result;
  }

  get totalAmount() {
    return this.filteredExpenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );
  }

  getBadgeClass(type: string): string {
    const map: Record<string, string> = {
      Fuel: 'badge-fuel',
      Repair: 'badge-repair',
      CNG: 'badge-cng',
      DocumentRenew: 'badge-doc',
    };
    return map[type] || 'badge-default';
  }

  exportCSV() {
    const rows = [['Vehicle', 'Date', 'Type', 'Amount']];
    this.filteredExpenses.forEach((e) => {
      rows.push([
        e.vehicle?.vehicleName || '',
        e.expenseDate ? new Date(e.expenseDate).toLocaleDateString() : '',
        e.categoryType || '',
        e.amount?.toString() || '',
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}

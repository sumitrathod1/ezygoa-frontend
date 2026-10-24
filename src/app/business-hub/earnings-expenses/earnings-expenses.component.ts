import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import {
  BusinessExpense,
  BusinessExpenseInput,
  BusinessExpenseService,
} from '../../services/business-expense.service';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';

type Period = 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

/**
 * What the business actually earns for a period: own-booking revenue + commission
 * (never the partner's share of the fare), commission collected vs still outstanding,
 * and every expense type incl. advertising — plus the business/ad expense ledger.
 */
@Component({
  selector: 'app-earnings-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './earnings-expenses.component.html',
  styleUrl: './earnings-expenses.component.css',
})
export class EarningsExpensesComponent implements OnInit {
  period: Period = 'thisMonth';
  from = '';
  to = '';

  summary: any = null;
  loadingSummary = true;
  expenses: BusinessExpense[] = [];
  loadingExpenses = true;
  filterCategory = '';
  filterPlatform = '';

  categories: string[] = ['Advertising', 'Marketing', 'Software', 'Operational', 'Driver', 'Office', 'Other'];
  platforms: string[] = ['Google Ads', 'Meta Ads', 'Instagram', 'Facebook', 'YouTube', 'Justdial', 'Other'];
  paymentMethods: string[] = ['UPI', 'Card', 'Bank transfer', 'Cash', 'Other'];

  showForm = false;
  editingId: number | null = null;
  form: BusinessExpenseInput = this.blank();
  customCategory = '';
  saving = false;
  formError = '';

  constructor(
    private _svc: BusinessExpenseService,
    private _dialog: MatDialog,
    private _toastr: ToastrService,
    private _location: Location
  ) {}

  ngOnInit() {
    this.setPeriod('thisMonth');
    this._svc.options().subscribe({
      next: (o) => {
        if (o?.categories?.length) this.categories = o.categories;
        if (o?.platforms?.length) this.platforms = o.platforms;
        if (o?.paymentMethods?.length) this.paymentMethods = o.paymentMethods;
      },
    });
  }

  goBack() {
    this._location.back();
  }

  private iso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  setPeriod(p: Period) {
    this.period = p;
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    if (p === 'thisMonth') { this.from = this.iso(new Date(y, m, 1)); this.to = this.iso(new Date(y, m + 1, 0)); }
    if (p === 'lastMonth') { this.from = this.iso(new Date(y, m - 1, 1)); this.to = this.iso(new Date(y, m, 0)); }
    if (p === 'thisYear')  { this.from = this.iso(new Date(y, 0, 1));     this.to = this.iso(new Date(y, 11, 31)); }
    if (p !== 'custom') this.reload();
  }

  applyCustom() {
    if (this.from && this.to && this.from > this.to) {
      this._toastr.warning("'From' must be before 'To'.");
      return;
    }
    this.reload();
  }

  reload() {
    this.loadSummary();
    this.loadExpenses();
  }

  loadSummary() {
    this.loadingSummary = true;
    this._svc.earningsSummary(this.from, this.to).subscribe({
      next: (s) => { this.summary = s; this.loadingSummary = false; },
      error: () => { this.summary = null; this.loadingSummary = false; },
    });
  }

  loadExpenses() {
    this.loadingExpenses = true;
    this._svc.list({ from: this.from, to: this.to, category: this.filterCategory, platform: this.filterPlatform }).subscribe({
      next: (list) => { this.expenses = list ?? []; this.loadingExpenses = false; },
      error: () => { this.expenses = []; this.loadingExpenses = false; },
    });
  }

  get expenseTotal(): number {
    return this.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }

  get netClass(): string {
    return (this.summary?.netEarnings ?? 0) >= 0 ? 'pos' : 'neg';
  }

  isAd(e: { category: string; platform: string | null }): boolean {
    return !!e.platform || e.category === 'Advertising';
  }

  // ── Form ────────────────────────────────────────────────────────────────
  private blank(): BusinessExpenseInput {
    return {
      expenseDate: this.iso(new Date()),
      amount: 0,
      category: 'Advertising',
      platform: 'Google Ads',
      campaignName: '',
      description: '',
      paymentMethod: 'UPI',
    };
  }

  openCreate() {
    this.editingId = null;
    this.form = this.blank();
    this.customCategory = '';
    this.formError = '';
    this.showForm = true;
  }

  openEdit(e: BusinessExpense) {
    this.editingId = e.businessExpenseId;
    const known = this.categories.includes(e.category);
    this.form = {
      expenseDate: e.expenseDate,
      amount: e.amount,
      category: known ? e.category : '__custom',
      platform: e.platform,
      campaignName: e.campaignName ?? '',
      description: e.description ?? '',
      paymentMethod: e.paymentMethod,
    };
    this.customCategory = known ? '' : e.category;
    this.formError = '';
    this.showForm = true;
  }

  get formIsAd(): boolean {
    return this.form.category === 'Advertising' || this.form.category === 'Marketing';
  }

  save() {
    const category = this.form.category === '__custom' ? this.customCategory.trim() : this.form.category;
    const amount = Number(this.form.amount);
    if (!amount || amount <= 0) { this.formError = 'Enter an amount greater than zero.'; return; }
    if (!category) { this.formError = 'Choose or type a category.'; return; }
    if (!this.form.expenseDate) { this.formError = 'Choose a date.'; return; }

    const dto: BusinessExpenseInput = {
      ...this.form,
      amount,
      category,
      platform: this.formIsAd ? this.form.platform || null : null,
      campaignName: this.formIsAd ? (this.form.campaignName || '').trim() || null : null,
    };
    this.saving = true;
    this.formError = '';
    const req = this.editingId ? this._svc.update(this.editingId, dto) : this._svc.create(dto);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this._toastr.success(this.editingId ? 'Expense updated' : 'Expense added');
        if (!this.categories.includes(category)) this.categories = [...this.categories, category];
        this.reload();
      },
      error: (err) => {
        this.saving = false;
        this.formError = err?.error?.message || 'Could not save the expense.';
      },
    });
  }

  remove(e: BusinessExpense) {
    this._dialog
      .open(ConfirmDialogComponent, {
        width: '320px',
        data: { title: 'Delete expense', message: `Delete ₹${e.amount} ${e.category} expense of ${e.expenseDate}? It stays in the activity log.` },
      })
      .afterClosed()
      .subscribe((ok: boolean) => {
        if (!ok) return;
        this._svc.remove(e.businessExpenseId).subscribe({
          next: () => { this._toastr.success('Expense deleted'); this.reload(); },
          error: (err) => this._toastr.error(err?.error?.message || 'Could not delete the expense.'),
        });
      });
  }
}

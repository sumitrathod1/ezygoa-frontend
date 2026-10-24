import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogRow, AuditLogService } from '../../services/audit-log.service';

/** Read-only trail of changes to bookings, payments, expenses and partners. */
@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-log.component.html',
  styleUrl: './activity-log.component.css',
})
export class ActivityLogComponent implements OnInit {
  rows: AuditLogRow[] = [];
  total = 0;
  page = 1;
  readonly pageSize = 50;
  loading = true;
  error = '';

  entityType = '';
  search = '';
  bookingId: number | null = null;
  from = '';
  to = '';
  expanded = new Set<number>();

  readonly types: { value: string; label: string }[] = [
    { value: '', label: 'Everything' },
    { value: 'Booking', label: 'Bookings' },
    { value: 'SettlementPayment', label: 'Partner payments' },
    { value: 'PartnerSettlement', label: 'Partner settlements' },
    { value: 'PaymentAllocation', label: 'Customer / agent amounts' },
    { value: 'AgentPayment', label: 'Agent payments' },
    { value: 'BusinessExpense', label: 'Business & ad expenses' },
    { value: 'VehicleExpense', label: 'Vehicle expenses' },
    { value: 'Salary', label: 'Salaries' },
    { value: 'TravelAgent', label: 'Agents' },
    { value: 'Partner', label: 'Partners' },
  ];

  constructor(private _audit: AuditLogService, private _location: Location) {}

  ngOnInit() {
    this.load();
  }

  goBack() {
    this._location.back();
  }

  get pages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  apply() {
    this.page = 1;
    this.load();
  }

  go(p: number) {
    if (p < 1 || p > this.pages) return;
    this.page = p;
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this._audit
      .get({
        entityType: this.entityType,
        search: this.search.trim(),
        bookingId: this.bookingId || undefined,
        from: this.from,
        to: this.to,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.rows = res?.rows ?? [];
          this.total = res?.total ?? 0;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Could not load the activity log.';
        },
      });
  }

  toggle(r: AuditLogRow) {
    this.expanded.has(r.auditLogId) ? this.expanded.delete(r.auditLogId) : this.expanded.add(r.auditLogId);
  }

  /** Field-level detail for the expanded row. */
  details(r: AuditLogRow): { field: string; value: string }[] {
    if (!r.changes) return [];
    try {
      const obj = JSON.parse(r.changes);
      const fmt = (v: any) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
      return Object.entries(obj).map(([field, v]: [string, any]) => ({
        field,
        value: v && typeof v === 'object' && 'from' in v ? `${fmt(v.from)} → ${fmt(v.to)}` : fmt(v),
      }));
    } catch {
      return [];
    }
  }

  icon(r: AuditLogRow): string {
    return r.action === 'Created' ? 'bi-plus-circle' : r.action === 'Deleted' ? 'bi-trash' : 'bi-pencil';
  }
}

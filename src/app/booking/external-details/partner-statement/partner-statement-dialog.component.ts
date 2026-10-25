import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { BookingService } from '../../../services/booking.service';
import { PdfDownloadService } from '../../../services/pdf-download.service';

export interface PartnerStatementDialogData {
  vendorId: number;
  vendorName: string;
  /** Opens with this booking's customer chosen under "One customer". */
  bookingId?: number | null;
}

/** What goes on the statement. */
export type StatementScope = 'customer' | 'dates' | 'all';
type Preset = 'thisMonth' | 'lastMonth' | 'last3' | 'custom';

/** One of the partner's bookings, with where its money stands. */
export interface PartnerBookingRow {
  bookingId: number;
  customerId: number;
  customerName: string;
  date: string;
  route: string;
  due: number;
  settled: number;
  remaining: number;
  cancelled: boolean;
  status: 'paid' | 'part' | 'unpaid' | 'none' | 'cancelled';
  statusText: string;
}

/** A customer and all their bookings with this partner. */
export interface PartnerCustomerGroup {
  customerId: number;
  customerName: string;
  bookings: PartnerBookingRow[];
  firstDate: string;
  lastDate: string;
  due: number;
  settled: number;
  remaining: number;
  status: PartnerBookingRow['status'];
  statusText: string;
}

const rs = (v: number) => '₹' + v.toLocaleString('en-IN');

/** Pick one customer, a date range or everything, then download or share the partner's PDF statement. */
@Component({
  selector: 'app-partner-statement-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-statement-dialog.component.html',
  styleUrl: './partner-statement-dialog.component.css',
})
export class PartnerStatementDialogComponent implements OnInit {
  scope: StatementScope = 'dates';
  preset: Preset = 'thisMonth';
  from = '';
  to = '';
  onlyOpen = false;
  maskCustomer = true;
  showFare = true;
  busy: 'download' | 'share' | null = null;
  error = '';

  // "One customer" = all of that customer's bookings with this partner
  rows: PartnerBookingRow[] = [];
  customers: PartnerCustomerGroup[] = [];
  loadingRows = false;
  search = '';
  selectedCustomerId: number | null = null;

  readonly presets: { key: Preset; label: string }[] = [
    { key: 'thisMonth', label: 'This month' },
    { key: 'lastMonth', label: 'Last month' },
    { key: 'last3', label: 'Last 3 months' },
    { key: 'custom', label: 'Custom' },
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PartnerStatementDialogData,
    private _ref: MatDialogRef<PartnerStatementDialogComponent>,
    private _bookingService: BookingService,
    private _pdf: PdfDownloadService,
    private _toastr: ToastrService
  ) {
    this.applyPreset('thisMonth');
    if (data.bookingId) this.scope = 'customer';
  }

  ngOnInit() {
    this.loadingRows = true;
    this._bookingService.getVendorBookings(this.data.vendorId).subscribe({
      next: (res: any) => {
        const list: any[] = Array.isArray(res) ? res : res?.data ?? [];
        this.rows = list
          .filter((r) => !r.vendorId || r.vendorId === this.data.vendorId)
          .map((r) => PartnerStatementDialogComponent.toRow(r))
          .sort((a, b) => b.date.localeCompare(a.date) || b.bookingId - a.bookingId);
        this.customers = PartnerStatementDialogComponent.group(this.rows);
        // Opened from a booking: that booking's customer is pre-selected
        if (this.data.bookingId) {
          this.selectedCustomerId = this.rows.find((r) => r.bookingId === this.data.bookingId)?.customerId ?? null;
        }
        this.loadingRows = false;
      },
      error: () => (this.loadingRows = false),
    });
  }

  /** Paid / part paid / not paid, from the partner settlement of one booking. */
  static toRow(r: any): PartnerBookingRow {
    const fromPartner = r.settlementDirection === 'VendorToOwner';
    const settled = Number(fromPartner ? r.receivedFromVendor : r.totalPaidToVendor) || 0;
    const remaining = Number(r.remaining) || 0;
    const due = settled + remaining;
    const cancelled = r.bookingStatus === 'Canceled';
    let status: PartnerBookingRow['status'];
    let statusText: string;
    if (cancelled) { status = 'cancelled'; statusText = 'Cancelled'; }
    else if (due === 0) { status = 'none'; statusText = 'Nothing due'; }
    else if (remaining === 0) { status = 'paid'; statusText = 'Paid'; }
    else if (settled > 0) { status = 'part'; statusText = `Part paid ${rs(settled)} of ${rs(due)}`; }
    else { status = 'unpaid'; statusText = `Not paid · ${rs(due)}`; }
    return {
      bookingId: r.bookingId,
      customerId: Number(r.customerId) || 0,
      customerName: r.customerName || 'Customer',
      date: String(r.bookingDate ?? '').slice(0, 10),
      route: [r.from, r.to].filter(Boolean).join(' → '),
      due, settled, remaining, cancelled, status, statusText,
    };
  }

  /** One entry per customer; status adds up all their (not cancelled) bookings. */
  static group(rows: PartnerBookingRow[]): PartnerCustomerGroup[] {
    const map = new Map<number, PartnerBookingRow[]>();
    for (const r of rows) {
      if (!map.has(r.customerId)) map.set(r.customerId, []);
      map.get(r.customerId)!.push(r);
    }
    const groups = [...map.entries()].map(([customerId, bookings]) => {
      const live = bookings.filter((b) => !b.cancelled);
      const due = live.reduce((s, b) => s + b.due, 0);
      const settled = live.reduce((s, b) => s + b.settled, 0);
      const remaining = live.reduce((s, b) => s + b.remaining, 0);
      const dates = bookings.map((b) => b.date).sort();
      let status: PartnerBookingRow['status'];
      let statusText: string;
      if (!live.length) { status = 'cancelled'; statusText = 'Cancelled'; }
      else if (due === 0) { status = 'none'; statusText = 'Nothing due'; }
      else if (remaining === 0) { status = 'paid'; statusText = 'Paid'; }
      else if (settled > 0) { status = 'part'; statusText = `Part paid ${rs(settled)} of ${rs(due)}`; }
      else { status = 'unpaid'; statusText = `Not paid · ${rs(due)}`; }
      return {
        customerId, customerName: bookings[0].customerName, bookings,
        firstDate: dates[0], lastDate: dates[dates.length - 1],
        due, settled, remaining, status, statusText,
      };
    });
    // Newest activity first
    return groups.sort((a, b) => b.lastDate.localeCompare(a.lastDate));
  }

  get filteredCustomers(): PartnerCustomerGroup[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.customers;
    return this.customers.filter(
      (c) => c.customerName.toLowerCase().includes(q) || c.bookings.some((b) => String(b.bookingId).includes(q))
    );
  }

  get selectedCustomer(): PartnerCustomerGroup | undefined {
    return this.customers.find((c) => c.customerId === this.selectedCustomerId);
  }

  rangeLabel(c: PartnerCustomerGroup): string {
    return c.firstDate === c.lastDate ? this.dateLabel(c.firstDate) : `${this.dateLabel(c.firstDate)} – ${this.dateLabel(c.lastDate)}`;
  }

  setScope(s: StatementScope) {
    this.scope = s;
    this.error = '';
  }

  dateLabel(iso: string): string {
    return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  }

  private iso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  applyPreset(p: Preset) {
    this.preset = p;
    this.error = '';
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    if (p === 'thisMonth') { this.from = this.iso(new Date(y, m, 1)); this.to = this.iso(new Date(y, m + 1, 0)); }
    if (p === 'lastMonth') { this.from = this.iso(new Date(y, m - 1, 1)); this.to = this.iso(new Date(y, m, 0)); }
    if (p === 'last3')     { this.from = this.iso(new Date(y, m - 2, 1)); this.to = this.iso(new Date(y, m + 1, 0)); }
  }

  get fileName(): string {
    const name = (this.data.vendorName || 'Partner').replace(/[^A-Za-z0-9]+/g, '_');
    const part = this.scope === 'customer'
      ? `${(this.selectedCustomer?.customerName ?? 'Customer').replace(/[^A-Za-z0-9]+/g, '_')}`
      : this.scope === 'dates' ? `${this.from}_to_${this.to}` : 'All';
    return `Statement_${name}_${part}${this.onlyOpen && this.scope !== 'customer' ? '_unpaid' : ''}.pdf`;
  }

  run(mode: 'download' | 'share') {
    if (this.scope === 'customer' && !this.selectedCustomerId) {
      this.error = 'Choose the customer for the statement.';
      return;
    }
    if (this.scope === 'dates') {
      if (!this.from || !this.to) { this.error = 'Choose both dates.'; return; }
      if (this.from > this.to) { this.error = "'From' must be before 'To'."; return; }
    }
    this.error = '';
    this.busy = mode;
    this._bookingService
      .getPartnerStatement(this.data.vendorId, {
        from: this.scope === 'dates' ? this.from : null,
        to: this.scope === 'dates' ? this.to : null,
        customerId: this.scope === 'customer' ? this.selectedCustomerId : null,
        onlyOpen: this.scope !== 'customer' && this.onlyOpen,
        maskCustomer: this.maskCustomer,
        showFare: this.showFare,
      })
      .subscribe({
        next: async (blob) => {
          try {
            if (mode === 'share') {
              const shared = await this._pdf.shareBlob(blob, this.fileName, `Statement — ${this.data.vendorName}`);
              if (!shared) this._toastr.info('Sharing isn\'t available in this browser — the PDF was downloaded instead.');
            } else {
              await this._pdf.downloadBlob(blob, this.fileName);
            }
            this._ref.close(true);
          } finally {
            this.busy = null;
          }
        },
        error: async (err) => {
          this.busy = null;
          // Errors on a blob request arrive as a Blob too
          let msg = 'Could not create the statement.';
          try {
            const body = err?.error instanceof Blob ? JSON.parse(await err.error.text()) : err?.error;
            msg = body?.message || msg;
          } catch {}
          this.error = msg;
        },
      });
  }

  close() {
    this._ref.close(false);
  }
}

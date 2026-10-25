import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { PdfDownloadService } from '../../services/pdf-download.service';

import { BookingTypePipe } from '../../pipes/booking-type.pipe';
export type InvoiceScope = 'booking' | 'trip' | 'customer';

/**
 * Invoice preview. The invoice is built on the server with the booking's own organisation
 * (name, phone, email) and can cover one booking, the whole trip, or every booking of the
 * customer. Share sends the PDF file itself (WhatsApp etc.), not just a text message.
 */
@Component({
  selector: 'app-invoice-preview',
  standalone: true,
  imports: [BookingTypePipe, CommonModule],
  templateUrl: './invoice-preview.component.html',
  styleUrl: './invoice-preview.component.css',
})
export class InvoicePreviewComponent implements OnInit {
  booking: any;
  inv: any = null;
  scope: InvoiceScope = 'booking';
  loading = true;
  error = '';
  busy: 'download' | 'share' | null = null;
  /** Print terms & conditions — ticked automatically when the invoice has a Full Day booking. */
  includeTerms = false;
  private termsTouched = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _ref: MatDialogRef<InvoicePreviewComponent>,
    private _bookingService: BookingService,
    private _pdf: PdfDownloadService,
    private _toastr: ToastrService,
    private _router: Router
  ) {
    this.booking = data.booking;
  }

  /** What the organisation hasn't set up yet — e.g. ['logo', 'phone number'] */
  get missingOrgDetails(): string[] {
    if (!this.inv) return [];
    return [!this.inv.orgLogo && 'logo', !this.inv.orgPhone && 'phone number'].filter((x): x is string => !!x);
  }

  /** Business Hub → My organisation, where the logo and contact details are set */
  openMyOrganization() {
    this._ref.close();
    this._router.navigate(['/business-hub/my-organization']);
  }

  get bookingId(): number {
    return this.booking?.bookingId ?? this.booking?.BookingId;
  }

  ngOnInit() {
    // First open: the whole trip, else all the customer's bookings when there are several
    this.load('auto');
  }

  load(scope: InvoiceScope | 'auto') {
    this.loading = true;
    this.error = '';
    this._bookingService.getInvoiceData(this.bookingId, scope).subscribe({
      next: (res: any) => {
        this.inv = res?.data ?? res;
        this.scope = this.inv?.scope ?? 'booking';
        if (!this.termsTouched) this.includeTerms = !!this.inv?.hasFullDay;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Could not load the invoice.';
      },
    });
  }

  toggleTerms(on: boolean) {
    this.includeTerms = on;
    this.termsTouched = true;
  }

  /** Anything to print in the terms section? */
  get hasTerms(): boolean {
    const t = this.inv?.terms;
    return !!t && (t.nightCharges?.length || t.extraRates?.length || t.otherTerms?.length);
  }

  /** "(Full Day)" after a night charge — left out when the row's own name already says it. */
  appliesLabel(a: string, label = ''): string {
    const l = label.toLowerCase();
    if (a === 'FullDay') return l.includes('full day') ? '' : 'Full Day';
    if (a === 'Transfer') return l.includes('airport') || l.includes('station') ? '' : 'airport / station pickup or drop';
    return '';
  }

  setScope(s: InvoiceScope) {
    if (s !== this.scope) this.load(s);
  }

  get fileName(): string {
    const who = String(this.inv?.customerName ?? 'Customer').replace(/[^A-Za-z0-9]+/g, '_');
    return `Invoice_${this.inv?.invoiceNo ?? this.bookingId}_${who}.pdf`;
  }

  run(mode: 'download' | 'share') {
    this.busy = mode;
    this._bookingService.getInvoicePdf(this.bookingId, this.scope, this.includeTerms).subscribe({
      next: async (blob) => {
        try {
          if (mode === 'share') {
            const text = `Invoice ${this.inv?.invoiceNo} from ${this.inv?.orgName}`;
            const shared = await this._pdf.shareBlob(blob, this.fileName, text);
            if (!shared) this._toastr.info('This browser can\'t share files — the PDF was downloaded. Attach it in WhatsApp.');
          } else {
            await this._pdf.downloadBlob(blob, this.fileName);
          }
        } finally {
          this.busy = null;
        }
      },
      error: async (err) => {
        this.busy = null;
        let msg = 'Could not create the invoice.';
        try {
          const body = err?.error instanceof Blob ? JSON.parse(await err.error.text()) : err?.error;
          msg = body?.message || msg;
        } catch {}
        this._toastr.error(msg);
      },
    });
  }

  close() {
    this._ref.close();
  }

  dateLabel(iso: string): string {
    return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  }

  formatTime(time?: string | null): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  /** wa.me link for the organisation's phone (10-digit Indian numbers get +91). */
  waLink(phone: string | null | undefined): string | null {
    let digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.length === 10) digits = '91' + digits;
    return digits.length >= 11 ? `https://wa.me/${digits}` : null;
  }

  /** "AirportPickup" → "Airport Pickup" */
  pretty(type: string): string {
    return (type || '').replace(/([a-z])([A-Z])/g, '$1 $2');
  }
}

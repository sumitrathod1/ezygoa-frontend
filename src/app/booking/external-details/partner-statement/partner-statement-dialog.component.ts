import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { BookingService } from '../../../services/booking.service';
import { PdfDownloadService } from '../../../services/pdf-download.service';

export interface PartnerStatementDialogData {
  vendorId: number;
  vendorName: string;
  /** Set to make a statement for a single booking. */
  bookingId?: number | null;
}

type Preset = 'thisMonth' | 'lastMonth' | 'last3' | 'all' | 'custom';

/** Pick a period + privacy options, then download or share the partner's PDF statement. */
@Component({
  selector: 'app-partner-statement-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-statement-dialog.component.html',
  styleUrl: './partner-statement-dialog.component.css',
})
export class PartnerStatementDialogComponent {
  preset: Preset = 'thisMonth';
  from = '';
  to = '';
  maskCustomer = true;
  showFare = true;
  busy: 'download' | 'share' | null = null;
  error = '';

  readonly presets: { key: Preset; label: string }[] = [
    { key: 'thisMonth', label: 'This month' },
    { key: 'lastMonth', label: 'Last month' },
    { key: 'last3', label: 'Last 3 months' },
    { key: 'all', label: 'All time' },
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
  }

  get singleBooking(): boolean {
    return !!this.data.bookingId;
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
    if (p === 'all')       { this.from = ''; this.to = ''; }
  }

  get fileName(): string {
    const name = (this.data.vendorName || 'Partner').replace(/[^A-Za-z0-9]+/g, '_');
    const part = this.singleBooking ? `Booking${this.data.bookingId}` : this.from || this.to ? `${this.from}_to_${this.to}` : 'All';
    return `Statement_${name}_${part}.pdf`;
  }

  run(mode: 'download' | 'share') {
    if (!this.singleBooking && this.from && this.to && this.from > this.to) {
      this.error = "'From' must be before 'To'.";
      return;
    }
    this.error = '';
    this.busy = mode;
    this._bookingService
      .getPartnerStatement(this.data.vendorId, {
        from: this.singleBooking ? null : this.from || null,
        to: this.singleBooking ? null : this.to || null,
        bookingId: this.data.bookingId ?? null,
        maskCustomer: this.maskCustomer,
        showFare: this.showFare,
      })
      .subscribe({
        next: async (blob) => {
          try {
            if (mode === 'share') {
              const shared = await this._pdf.shareBlob(blob, this.fileName, `Commission statement — ${this.data.vendorName}`);
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

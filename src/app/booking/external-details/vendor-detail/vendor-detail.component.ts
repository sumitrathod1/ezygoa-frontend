import { newRequestId } from '../../../shared/request-id';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../../services/booking.service';
import { AuditLogRow, AuditLogService } from '../../../services/audit-log.service';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { PartnerStatementDialogComponent } from '../partner-statement/partner-statement-dialog.component';
import { InvoicePreviewComponent } from '../../../calendar/invoice-preview/invoice-preview.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-vendor-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vendor-detail.component.html',
  styleUrl: './vendor-detail.component.css',
})
export class VendorDetailComponent implements OnInit {
  booking: any;
  history: any = null;
  activity: AuditLogRow[] = [];
  loadingHistory = true;
  historyError = '';
  showActivity = false;

  reversingId: number | null = null;
  reverseReason = '';
  saving = false;
  /** Tells the list to reload when the dialog closes. */
  private changed = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _ref: MatDialogRef<VendorDetailComponent>,
    private _bookingService: BookingService,
    private _audit: AuditLogService,
    private _dialog: MatDialog,
    private _toastr: ToastrService
  ) {
    this.booking = data;
  }

  ngOnInit() {
    this.loadHistory();
  }

  get isVendorToOwner(): boolean {
    return (this.history?.direction ?? this.booking?.settlementDirection) === 'VendorToOwner';
  }

  get statusText(): string {
    return this.history?.isSettled ?? this.booking?.isSettled ? 'Settled' : 'Pending';
  }

  loadHistory() {
    this.loadingHistory = true;
    this.historyError = '';
    this._bookingService.getSettlementHistory(this.booking.bookingId).subscribe({
      next: (h) => {
        this.history = h;
        this.loadingHistory = false;
      },
      error: (err) => {
        this.loadingHistory = false;
        this.historyError = err?.error?.message || 'Could not load payment history.';
      },
    });
    this._audit.get({ bookingId: this.booking.bookingId, pageSize: 30 }).subscribe({
      next: (res) => (this.activity = res?.rows ?? []),
      error: () => (this.activity = []),
    });
  }

  typeLabel(p: any): string {
    if (p.entryType === 'Reversal') return 'Reversal';
    return p.direction === 'VendorToOwner' ? 'Received from partner' : 'Paid to partner';
  }

  startReverse(p: any) {
    this.reversingId = p.settlementPaymentId;
    this.reverseReason = '';
  }

  cancelReverse() {
    this.reversingId = null;
    this.reverseReason = '';
  }

  confirmReverse(p: any) {
    if (!this.reverseReason.trim()) {
      this._toastr.warning('Please give a reason for the reversal.');
      return;
    }
    this._dialog
      .open(ConfirmDialogComponent, {
        width: '320px',
        data: {
          title: 'Reverse payment',
          message: `Reverse the ₹${p.amount} payment of ${p.paidOn}? It stays in the history and the balance re-opens.`,
        },
      })
      .afterClosed()
      .subscribe((ok: boolean) => {
        if (!ok) return;
        this.saving = true;
        this._bookingService.reverseSettlementPayment(p.settlementPaymentId, this.reverseReason.trim()).subscribe({
          next: () => {
            this.saving = false;
            this.changed = true;
            this.cancelReverse();
            this._toastr.success('Payment reversed.');
            this.loadHistory();
          },
          error: (err) => {
            this.saving = false;
            this._toastr.error(err?.error?.message || 'Could not reverse the payment.');
          },
        });
      });
  }

  settleRemaining() {
    const left = this.history?.remaining ?? 0;
    if (left <= 0) return;
    this._dialog
      .open(ConfirmDialogComponent, {
        width: '320px',
        data: {
          title: 'Settle booking',
          message: `${this.isVendorToOwner ? 'Record' : 'Pay'} the remaining ₹${left} ${this.isVendorToOwner ? 'received from' : 'to'} ${this.booking.vendorName}?`,
        },
      })
      .afterClosed()
      .subscribe((ok: boolean) => {
        if (!ok) return;
        this.saving = true;
        this._bookingService.settleSettlement(this.booking.bookingId, left, { requestId: newRequestId() }).subscribe({
          next: () => {
            this.saving = false;
            this.changed = true;
            this._toastr.success('Booking settled.');
            this.loadHistory();
          },
          error: (err) => {
            this.saving = false;
            this._toastr.error(err?.error?.message || 'Could not record the payment.');
          },
        });
      });
  }

  openStatement() {
    if (!this.booking?.vendorId) return;
    this._dialog.open(PartnerStatementDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      data: { vendorId: this.booking.vendorId, vendorName: this.booking.vendorName, bookingId: this.booking.bookingId },
    });
  }

  /** Customer invoice for this partner booking — your organisation's details, never the partner's. */
  openInvoice() {
    this._dialog.open(InvoicePreviewComponent, {
      data: { booking: { bookingId: this.booking.bookingId } },
      maxWidth: '500px',
      width: '95vw',
      maxHeight: '92vh',
    });
  }

  callCustomer(number: string) {
    window.open(`tel:${number}`, '_self');
  }

  closeDialog() {
    this._ref.close(this.changed);
  }
}

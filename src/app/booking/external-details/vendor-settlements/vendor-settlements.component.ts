import { newRequestId } from '../../../shared/request-id';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../../services/booking.service';
import { MatDialog } from '@angular/material/dialog';
import { VendorDetailComponent } from '../vendor-detail/vendor-detail.component';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { RouterModule } from '@angular/router';
import { PartnerStatementDialogComponent } from '../partner-statement/partner-statement-dialog.component';
import { InvoicePreviewComponent } from '../../../calendar/invoice-preview/invoice-preview.component';

@Component({
  selector: 'app-vendor-settlements',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './vendor-settlements.component.html',
  styleUrl: './vendor-settlements.component.css',
})
export class VendorSettlementsComponent {
  vendorBookings: any[] = [];
  allVendorBookings: any[] = [];
  isLoading = true;
  selectedStatus: 'all' | 'pending' | 'settled' = 'all';
  selectedVendor = '';
  searchText = '';

  vendors: { key: string; name: string }[] = [];
  totals = { owedToYou: 0, youOwe: 0, commission: 0, collected: 0, open: 0 };

  /** Booking whose payment panel is open, and the amount being entered. */
  payingId: number | null = null;
  payAmount: number | null = null;
  payMethod = 'Cash';
  payReference = '';
  payDate = '';
  /** One key per opened payment form: a double-tapped Save is recorded once. */
  private payRequestId = '';
  saving = false;
  readonly paymentMethods = ['Cash', 'UPI', 'Bank transfer', 'Other'];

  constructor(
    private _bookingService: BookingService,
    private _dialog: MatDialog,
    private _toastr: ToastrService
  ) {}

  ngOnInit() {
    this.loadVendorBookings();
  }

  callCustomer(number: string) {
    window.open(`tel:${number}`, '_self');
  }

  loadVendorBookings() {
    this.isLoading = true;
    this._bookingService.getVendorBookings().subscribe({
      next: (res) => {
        this.allVendorBookings = res || [];
        const seen = new Map<string, string>();
        this.allVendorBookings.forEach((b) => seen.set(this.vendorKey(b), b.vendorName || b.vendorNumber));
        this.vendors = [...seen].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  vendorKey(b: any): string {
    return String(b.vendorId ?? b.vendorNumber ?? b.vendorName);
  }

  isCancelled(b: any): boolean {
    return b.bookingStatus === 'Canceled';
  }

  /** What is still open on this booking (falls back for older API responses). */
  remaining(b: any): number {
    if (b.remaining != null) return b.remaining;
    return b.settlementDirection === 'VendorToOwner' ? b.ownerReceivable : b.pendingVendorPayment;
  }

  /** Total due on this booking in its settlement direction. */
  due(b: any): number {
    return b.settlementDirection === 'VendorToOwner' ? b.ownerReceivable : b.vendorPayable;
  }

  settledSoFar(b: any): number {
    return b.settlementDirection === 'VendorToOwner' ? b.receivedFromVendor ?? 0 : b.totalPaidToVendor ?? 0;
  }

  progress(b: any): number {
    const d = this.due(b);
    return d > 0 ? Math.min(100, Math.round((this.settledSoFar(b) / d) * 100)) : 100;
  }

  onStatusFilterChange(event: Event) {
    this.selectedStatus = (event.target as HTMLSelectElement).value as any;
    this.applyFilters();
  }

  applyFilters() {
    const q = this.searchText.trim().toLowerCase();
    this.vendorBookings = this.allVendorBookings.filter((b) => {
      if (this.selectedVendor && this.vendorKey(b) !== this.selectedVendor) return false;
      if (this.selectedStatus === 'pending' && b.isSettled) return false;
      if (this.selectedStatus === 'settled' && !b.isSettled) return false;
      if (!q) return true;
      return [b.bookingId, b.vendorName, b.vendorNumber, b.customerName, b.from, b.to]
        .some((v) => String(v ?? '').toLowerCase().includes(q));
    });

    // Totals follow the current filter, so picking a partner gives their statement view
    const t = { owedToYou: 0, youOwe: 0, commission: 0, collected: 0, open: 0 };
    this.vendorBookings.forEach((b) => {
      if (!this.isCancelled(b)) t.commission += b.commission || 0;
      t.collected += b.receivedFromVendor || 0;
      if (b.isSettled) return;
      t.open++;
      if (b.settlementDirection === 'VendorToOwner') t.owedToYou += this.remaining(b);
      else t.youOwe += this.remaining(b);
    });
    this.totals = t;
  }

  viewDetail(b: any) {
    this._dialog
      .open(VendorDetailComponent, {
        width: '460px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        panelClass: 'booking-detail-dialog',
        data: b,
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) this.loadVendorBookings();
      });
  }

  /** Numeric partner id of the current partner filter (statements need it). */
  get selectedVendorId(): number | null {
    if (!this.selectedVendor) return null;
    const row = this.allVendorBookings.find((b) => this.vendorKey(b) === this.selectedVendor);
    return row?.vendorId ?? null;
  }

  get selectedVendorName(): string {
    return this.vendors.find((v) => v.key === this.selectedVendor)?.name ?? '';
  }

  openStatement() {
    const id = this.selectedVendorId;
    if (!id) {
      this._toastr.info('Choose a partner first to create their statement.');
      return;
    }
    this._dialog.open(PartnerStatementDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      data: { vendorId: id, vendorName: this.selectedVendorName },
    });
  }

  /** Customer invoice for a partner booking — your organisation's details, never the partner's. */
  openInvoice(b: any) {
    this._dialog.open(InvoicePreviewComponent, {
      data: { booking: { bookingId: b.bookingId } },
      maxWidth: '500px',
      width: '95vw',
      maxHeight: '92vh',
    });
  }

  openPayment(b: any) {
    if (!b || b.isSettled) return;
    this.payingId = b.bookingId;
    this.payAmount = this.remaining(b);
    this.payMethod = 'Cash';
    this.payReference = '';
    const d = new Date();
    this.payDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.payRequestId = newRequestId();
  }

  cancelPayment() {
    this.payingId = null;
    this.payAmount = null;
  }

  confirmPayment(b: any) {
    const left = this.remaining(b);
    const amount = Number(this.payAmount);
    if (!amount || amount <= 0) {
      this._toastr.warning('Enter an amount greater than zero.');
      return;
    }
    if (amount > left + 0.009) {
      this._toastr.warning(`Only ₹${left} is still due on this booking.`);
      return;
    }

    const fromVendor = b.settlementDirection === 'VendorToOwner';
    const full = Math.abs(amount - left) < 0.01;
    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '320px',
      data: {
        title: full ? 'Settle booking' : 'Record part payment',
        message: fromVendor
          ? `Record ₹${amount} received from ${b.vendorName} for Booking #${b.bookingId}?${full ? '' : ` ₹${(left - amount).toFixed(0)} will still be due.`}`
          : `Record ₹${amount} paid to ${b.vendorName} for Booking #${b.bookingId}?${full ? '' : ` ₹${(left - amount).toFixed(0)} will still be due.`}`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.saving = true;
      this._bookingService
        .settleSettlement(b.bookingId, amount, {
          paymentMethod: this.payMethod,
          reference: this.payReference.trim(),
          paidOn: this.payDate,
          requestId: this.payRequestId,
        })
        .subscribe({
        next: () => {
          this._toastr.success(full ? 'Booking settled.' : 'Part payment recorded.');
          this.saving = false;
          this.cancelPayment();
          this.loadVendorBookings(); // always show the server's figures
        },
        error: (err) => {
          this.saving = false;
          this._toastr.error(err?.error?.message || 'Could not record the payment.');
        },
      });
    });
  }
}

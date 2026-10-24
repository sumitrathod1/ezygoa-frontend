import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { DispatchService, TransferTarget } from '../../services/dispatch.service';
import { BookingService } from '../../services/booking.service';

export interface TransferBookingDialogData {
  bookingId: number;
  /** One line describing the booking, shown so the right one is sent */
  summary?: string;
}

/** Send a booking to a linked organisation. Closes with true when transferred. */
@Component({
  selector: 'app-transfer-booking-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './transfer-booking-dialog.component.html',
  styleUrl: './transfer-booking-dialog.component.css',
})
export class TransferBookingDialogComponent implements OnInit {
  targets: TransferTarget[] = [];
  selected: TransferTarget | null = null;
  loading = true;
  busy = false;
  error = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TransferBookingDialogData,
    private _ref: MatDialogRef<TransferBookingDialogComponent>,
    private _dispatch: DispatchService,
    private _bookingService: BookingService,
    private _toastr: ToastrService
  ) {}

  ngOnInit() {
    this._dispatch.getTransferTargets().subscribe({
      next: (t) => {
        this.targets = t;
        if (t.length === 1) this.selected = t[0];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load organisations. Check your connection and try again.';
      },
    });
  }

  transfer() {
    if (!this.selected || this.busy) return;
    this.busy = true;
    this.error = '';
    this._dispatch.transfer(this.data.bookingId, this.selected.orgId).subscribe({
      next: (r) => {
        this.busy = false;
        this._toastr.success(`Booking #${r.bookingId} is now with ${r.toOrgName}. They have been notified.`, 'Transferred');
        this._bookingService.notifyBookingUpdated();
        this._ref.close(true);
      },
      error: (err) => {
        this.busy = false;
        this.error = err?.error?.message || 'Could not transfer the booking. Please try again.';
      },
    });
  }

  close() {
    this._ref.close(false);
  }
}

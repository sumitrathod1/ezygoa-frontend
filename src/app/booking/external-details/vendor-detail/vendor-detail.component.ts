import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../../services/booking.service';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-vendor-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vendor-detail.component.html',
  styleUrl: './vendor-detail.component.css',
})
export class VendorDetailComponent {
  booking: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _bookingService: BookingService,
    private _dialog: MatDialog,
    private _toastr: ToastrService
  ) {
    this.booking = data;
  }

  get statusText(): string {
    return this.booking?.isSettled ? 'Settled' : 'Pending Settlement';
  }

  get statusClass(): string {
    return this.booking?.isSettled ? 'settled' : 'pending';
  }

  markAsSettled() {
    if (!this.booking?.bookingId) return;

    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Settle Payment',
        message: `Confirm settlement for ${this.booking.vendorName}?`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this._bookingService.settleSettlement(this.booking.bookingId).subscribe({
        next: () => {
          this._dialog.closeAll();
          this._toastr.success('Settlement marked successfully.');
        },
        error: () => {},
      });
    });
  }

  callCustomer(number: string) {
    window.open(`tel:${number}`, '_self');
  }

  closeDialog() {
    this._dialog.closeAll();
  }
}

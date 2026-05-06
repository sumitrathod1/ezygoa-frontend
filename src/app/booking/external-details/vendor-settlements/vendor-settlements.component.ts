import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../../services/booking.service';
import { MatDialog } from '@angular/material/dialog';
import { VendorDetailComponent } from '../vendor-detail/vendor-detail.component';
import { ConfirmDialogComponent } from '../../../confirm-dialog/confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { RouterModule } from '@angular/router';

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

  loadVendorBookings(vendorId?: number) {
    this.isLoading = true;

    this._bookingService.getVendorBookings(vendorId).subscribe({
      next: (res) => {
        this.allVendorBookings = res;
        this.applyStatusFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }
  onStatusFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedStatus = value as any;

    this.applyStatusFilter();
  }

  applyStatusFilter() {
    if (this.selectedStatus === 'all') {
      this.vendorBookings = [...this.allVendorBookings];
      return;
    }

    if (this.selectedStatus === 'pending') {
      this.vendorBookings = this.allVendorBookings.filter((b) => !b.isSettled);
      return;
    }

    if (this.selectedStatus === 'settled') {
      this.vendorBookings = this.allVendorBookings.filter((b) => b.isSettled);
    }
  }

  viewDetail(b: any) {
    this._dialog.open(VendorDetailComponent, {
      width: '420px',
      maxWidth: '95vw',
      height: '90vh',
      panelClass: 'booking-detail-dialog',
      data: b,
    });
  }

  settle(b: any) {
    if (!b || b.isSettled) return;

    const dialogRef = this._dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        title: 'Settle Payment',
        message: `Are you sure you want to settle Booking #${b.bookingId}?`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this._bookingService.settleSettlement(b.bookingId).subscribe({
        next: () => {
          this._toastr.success('Settlement marked successfully.');
          b.isSettled = true;
          b.settledAt = new Date();
          b.pendingVendorPayment = 0;
          b.totalPaidToVendor = b.vendorPayable;
        },
        error: () => {},
      });
    });
  }
}

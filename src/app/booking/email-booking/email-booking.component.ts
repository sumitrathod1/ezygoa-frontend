import { Component } from '@angular/core';
import { EmailServiceService } from '../../services/email-service.service';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-email-booking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-booking.component.html',
  styleUrl: './email-booking.component.css',
})
export class EmailBookingComponent {
  inquiries: any = []; // backend se load karo

  constructor(
    private _emailService: EmailServiceService,
    private _toaster: ToastrService
  ) {}

  ngOnInit() {
    this.loadInquiries();
    this._emailService.emailUpdated$.subscribe(() => {
      this.loadInquiries();
    });
  }
  loadInquiries() {
    this._emailService.getAllAgents().subscribe({
      next: (data: any) => {
        this.inquiries = data;
      },
      error: (error: any) => {
        console.error('Error fetching inquiries:', error);
      },
    });
  }
  // toggleConfirm(inquiry: any) {
  //   inquiry.isConfirmed = !inquiry.isConfirmed;
  //   if (inquiry.isConfirmed) inquiry.isRejected = false;
  // }

  toggleReject(inquiry: any) {
    inquiry.isRejected = !inquiry.isRejected;
    if (inquiry.isRejected) inquiry.isConfirmed = false;
    if (!inquiry.isRejected) return;

    this._emailService.rejectInquiry(inquiry.id).subscribe({
      next: (res) => {
        this._toaster.success('Inquiry rejected:');
        inquiry.isRejected = true;
      },
      error: (err) => {
        console.error('Error rejecting inquiry:', err);
      },
    });
  }

  callCustomer(number: string) {
    window.open(`tel:${number}`, '_self');
  }
  toggleConfirm(inquiry: any) {
    if (inquiry.isConfirmed) return;

    this._emailService.confirmInquiry(inquiry.id).subscribe({
      next: (res) => {
        this._toaster.success('Inquiry confirmed:');
        inquiry.isConfirmed = true;
      },
      error: (err) => {
        console.error('Error confirming inquiry:', err);
      },
    });
  }
}

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
  }
  loadInquiries() {
    this._emailService.getAllAgents().subscribe({
      next: (data: any) => {
        console.log(data);
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
  }

  callCustomer(number: string) {
    window.open(`tel:${number}`, '_self');
  }
  toggleConfirm(inquiry: any) {
    if (inquiry.isConfirmed) return;

    this._emailService.confirmInquiry(inquiry.id).subscribe({
      next: (res) => {
        this._toaster.success('Inquiry confirmed:');
        inquiry.isConfirmed = true; // UI me instantly reflect karne ke liye
      },
      error: (err) => {
        this._toaster.error('Error confirming inquiry:', err);
        alert('Failed to confirm inquiry');
      },
    });
  }
}

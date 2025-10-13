import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { BookingFormComponent } from '../booking-form/booking-form.component';
import { BookingService } from '../../services/booking.service';
import { EmailBookingComponent } from '../email-booking/email-booking.component';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-booking-table',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './booking-table.component.html',
  styleUrl: './booking-table.component.css',
})
export class BookingTableComponent {
  constructor(
    private _dialog: MatDialog,
    private _bookingservice: BookingService
  ) {}

  bookings: any[] = [];

  ngOnInit() {
    // this.loadAllbookings();
    // this._bookingservice.bookingUpdated$.subscribe(() => {
    //   this.loadAllbookings();
    // });
    this.applyFilter();
    this._bookingservice.bookingUpdated$.subscribe(() => {
      this.applyFilter();
    });
  }

  loadAllbookings() {
    this._bookingservice.loadBookings().subscribe({
      next: (data) => {
        this.bookings = data.bookings;
        this._bookingservice.updateBookingCount(this.bookings.length);
        console.log('Bookings :' + data);
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
      },
    });
  }

  onBookingClick(booking: any) {
    console.log('Booking clicked:', booking);
    this._dialog.open(BookingFormComponent, {
      data: booking,
    });
  }
  editBooking(booking: any) {
    console.log('Edit booking:', booking);
    this._dialog.open(BookingFormComponent, {
      data: booking,
    });
  }

  bookingss: any[] = [];
  pagination: any = {
    pageNumber: 1,
    pageSize: 15,
    totalCount: 0,
    totalPages: 0,
  };

  showFilter = false;

  filter: any = {
    particularDate: null,
    startDate: null,
    endDate: null,
    from: '',
    to: '',
    status: '',
    vehicleId: null,
    userId: null,
    bookingType: null,
    travelTime: null,
  };

  applyFilter() {
    this._bookingservice
      .filterBookings(
        this.filter,
        this.pagination.pageNumber,
        this.pagination.pageSize
      )
      .subscribe((res: any) => {
        this.bookings = res.data;
        this.pagination = res.pagination;
      });
  }
  changePage(page: number) {
    if (page < 1 || page > this.pagination.totalPages) return;
    this.pagination.pageNumber = page;
    this.applyFilter();
  }

  formatTime(time?: string | null): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m} ${suffix}`;
  }
}

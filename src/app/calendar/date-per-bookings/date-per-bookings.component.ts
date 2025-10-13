import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BookingFormComponent } from '../../booking/booking-form/booking-form.component';

@Component({
  selector: 'app-date-per-bookings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-per-bookings.component.html',
  styleUrl: './date-per-bookings.component.css',
})
export class DatePerBookingsComponent {
  @Input() bookings: any[] = [];
  //@Input() selectedDate!: Date;
  @Input() selectedDate: Date | null = null;
  @Output() close = new EventEmitter<void>();

  constructor(private _dialog: MatDialog) {}
  get formattedDate(): string {
    return this.selectedDate ? this.selectedDate.toDateString() : '';
  }
  ngOninit() {
    console.log('bookings in date per bookings component: ' + this.bookings);
  }
  onClose() {
    this.close.emit();
  }
  // callCustomer(phone: string) {
  //   window.open(`tel:${phone}`, '_self');
  // }

  callCustomer(number: string) {
    console.log(number);
    window.open(`tel:${number}`, '_self');
  }

  editBooking(booking: any) {
    console.log('Edit booking:', booking);
    this._dialog.open(BookingFormComponent, {
      data: booking,
    });
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

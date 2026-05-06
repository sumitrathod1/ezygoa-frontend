import { Component } from '@angular/core';
import { BookingService } from '../../services/booking.service';
import { CommonModule } from '@angular/common';
import { co } from '@fullcalendar/core/internal-common';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.css',
})
export class BookingListComponent {
  allBookngs: any[] = [];

  constructor(private _bookingService: BookingService) {}
  ngOnInit() {
    this._bookingService.bookingAdded$.subscribe(() => {
      this.loadAllBookings();
    });
    this.loadAllBookings();
  }

  loadAllBookings() {
    this._bookingService.loadBookings().subscribe({
      next: (data) => {
        this.allBookngs = data.bookings;
      },
    });
  }
}

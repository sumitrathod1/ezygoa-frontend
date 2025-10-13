import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePerBookingsComponent } from './date-per-bookings/date-per-bookings.component';

const VEHICLE_COLOR_MAP: Record<string, string> = {
  Swift_Dezire: '#ffff00ff',
  ERTIGA: '#003cffff',
  TT20Seater: '#22c55e',
  // Crysta: '#a78bfa',
  // TT17: '#6366f1',
};

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DatePerBookingsComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
})
export class CalendarComponent implements OnChanges {
  @Input() newBookings: any[] = [];
  bookings: any[] = [];

  months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  calendarDates: Date[] = [];
  showPopup = false;
  selectedDate: Date | null = null;
  selectedBookings: any[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['newBookings']) {
      this.bookings = this.newBookings.map((b) => ({
        ...b,
        color:
          VEHICLE_COLOR_MAP[b.vehicle?.vehicleName] ||
          VEHICLE_COLOR_MAP['Default'],
        //date: b.travelDate,
        date: new Date(b.travelDate),
      }));
    }
  }

  constructor() {
    this.generateCalendar();
  }

  generateCalendar() {
    this.calendarDates = [];
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(
      this.currentYear,
      this.currentMonth + 1,
      0
    ).getDate();

    for (let i = 0; i < startDay; i++) {
      this.calendarDates.push(null as any);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      this.calendarDates.push(new Date(this.currentYear, this.currentMonth, i));
    }
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  isToday(date: Date | null) {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  getBookingColors(date: Date | null) {
    if (!date) return [];
    return this.bookings
      .filter((b) => new Date(b.date).toDateString() === date.toDateString())
      .map((b) => b.color);
  }

  // getBookingsForDate(date: Date | null) {
  //   if (!date) return [];
  //   return this.bookings.filter(
  //     (b) => b.date.toDateString() === date.toDateString()
  //   );
  // }
  getBookingsForDate(date: Date | null) {
    if (!date) return [];
    return this.bookings.filter(
      (b) => new Date(b.date).toDateString() === date.toDateString()
    );
  }

  // openDayPopup(date: Date | null) {
  //   if (!date) return;
  //   this.selectedDate = date;
  //   this.showPopup = true;
  // }

  closePopup() {
    this.showPopup = false;
    this.selectedDate = null;
  }
  openDayPopup(date: Date | null) {
    if (!date) return;
    this.selectedDate = date;
    this.selectedBookings = this.getBookingsForDate(date);
    this.showPopup = true;
  }
}

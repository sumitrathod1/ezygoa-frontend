import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePerBookingsComponent } from './date-per-bookings/date-per-bookings.component';

const VEHICLE_COLOR_MAP: Record<string, string> = {
  Swift_Dezire: 'red',
  ERTIGA: '#003cffff',
  TT20Seater: '#22c55e',
  External: 'brown',
  Urbania: 'Black',
};

const DEFAULT_COLOR = 'brown';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DatePerBookingsComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
})
export class CalendarComponent implements OnChanges {
  // ── Legacy input (full booking objects) ──────────────────────
  @Input() newBookings: any[] = [];

  // ── Lazy-load inputs ──────────────────────────────────────────
  // Lightweight per-date summary: {date: "yyyy-MM-dd", count, vehicleNames[]}
  @Input() calendarSummary: any[] = [];
  // Full bookings for the selected date — loaded by parent on demand
  @Input() popupBookings: any[] = [];
  // True while parent is fetching bookings for the selected date
  @Input() popupLoading = false;

  // ── Events ────────────────────────────────────────────────────
  // Emits "yyyy-MM-dd" when user taps a date (lazy mode only)
  @Output() dateSelected  = new EventEmitter<string>();
  // Emits {month, year} (1-based) when user navigates months
  @Output() monthChanged  = new EventEmitter<{ month: number; year: number }>();

  // ── Internal state ────────────────────────────────────────────
  // Legacy mode: mapped full bookings
  bookings: any[] = [];
  // Summary mode: quick-lookup map keyed by "yyyy-MM-dd"
  private summaryMap = new Map<string, { count: number; colors: string[] }>();

  months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  currentMonth = new Date().getMonth();
  currentYear  = new Date().getFullYear();
  calendarDates: Date[] = [];
  showPopup      = false;
  selectedDate: Date | null = null;
  selectedBookings: any[] = []; // legacy mode only

  // Summary mode when calendarSummary input is wired up
  get isSummaryMode(): boolean { return this.calendarSummary.length > 0 || this.popupLoading; }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['newBookings'] && !this.isSummaryMode) {
      this.bookings = this.newBookings.map(b => ({
        ...b,
        date:  new Date(b.travelDate),
        color: this.resolveBookingColor(b),
      }));
    }

    if (changes['calendarSummary']) {
      this.summaryMap.clear();
      for (const item of this.calendarSummary) {
        const colors = (item.vehicleNames as string[])
          .map(n => VEHICLE_COLOR_MAP[n] ?? DEFAULT_COLOR);
        this.summaryMap.set(item.date, { count: item.count, colors });
      }
    }
  }

  resolveBookingColor(b: any): string {
    if (!b.vehicle || b.externalEmployee || b.externalEmployeeNumber) return DEFAULT_COLOR;
    return VEHICLE_COLOR_MAP[b.vehicle?.vehicleName] ?? DEFAULT_COLOR;
  }

  constructor() { this.generateCalendar(); }

  generateCalendar() {
    this.calendarDates = [];
    const firstDay    = new Date(this.currentYear, this.currentMonth, 1);
    const startDay    = firstDay.getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    for (let i = 0; i < startDay; i++) this.calendarDates.push(null as any);
    for (let i = 1; i <= daysInMonth; i++)
      this.calendarDates.push(new Date(this.currentYear, this.currentMonth, i));
  }

  prevMonth() {
    if (this.currentMonth === 0) { this.currentMonth = 11; this.currentYear--; }
    else this.currentMonth--;
    this.generateCalendar();
    this.monthChanged.emit({ month: this.currentMonth + 1, year: this.currentYear });
  }

  nextMonth() {
    if (this.currentMonth === 11) { this.currentMonth = 0; this.currentYear++; }
    else this.currentMonth++;
    this.generateCalendar();
    this.monthChanged.emit({ month: this.currentMonth + 1, year: this.currentYear });
  }

  isToday(date: Date | null) {
    if (!date) return false;
    const t = new Date();
    return date.getDate() === t.getDate() &&
           date.getMonth() === t.getMonth() &&
           date.getFullYear() === t.getFullYear();
  }

  getBookingColors(date: Date | null): string[] {
    if (!date) return [];
    if (this.calendarSummary.length > 0) {
      return this.summaryMap.get(this.toIsoDate(date))?.colors ?? [];
    }
    const bookingsForDate = this.bookings.filter(
      b => new Date(b.date).toDateString() === date.toDateString()
    );
    const unique = new Set<string>();
    bookingsForDate.forEach(b => { if (b.color) unique.add(b.color); });
    return Array.from(unique);
  }

  getBookingCount(date: Date | null): number {
    if (!date) return 0;
    if (this.calendarSummary.length > 0) {
      return this.summaryMap.get(this.toIsoDate(date))?.count ?? 0;
    }
    return this.bookings.filter(
      b => new Date(b.date).toDateString() === date.toDateString()
    ).length;
  }

  isSelected(date: Date | null): boolean {
    if (!date || !this.selectedDate) return false;
    return date.toDateString() === this.selectedDate.toDateString();
  }

  openDayPopup(date: Date | null) {
    if (!date) return;
    this.selectedDate = date;
    this.showPopup    = true;

    if (this.calendarSummary.length > 0) {
      // Lazy mode: ask parent to load full bookings for this date
      this.dateSelected.emit(this.toIsoDate(date));
    } else {
      // Legacy mode: bookings already in memory
      this.selectedBookings = this.bookings.filter(
        b => new Date(b.date).toDateString() === date.toDateString()
      );
    }
  }

  closePopup() {
    this.showPopup    = false;
    this.selectedDate = null;
  }

  getPopupBookings(): any[] {
    return this.calendarSummary.length > 0 ? this.popupBookings : this.selectedBookings;
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

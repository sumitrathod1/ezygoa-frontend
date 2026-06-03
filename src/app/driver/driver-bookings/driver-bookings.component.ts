import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../services/employee.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-driver-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './driver-bookings.component.html',
  styleUrl: './driver-bookings.component.css',
})
export class DriverBookingsComponent {
  allPast:     any[] = [];
  pastBookings: any[] = [];

  searchText    = '';
  selectedMonth = '';   // 'YYYY-MM' or ''
  monthOptions: { label: string; value: string }[] = [];

  constructor(private _employeeService: EmployeeService) {}

  ngOnInit() {
    this.loadDriverData();
  }

  loadDriverData() {
    this._employeeService
      .getEmployeeBookings()
      .pipe(
        map((response) => {
          const bookings     = response ?? [];
          const todayDateStr = new Date().toLocaleDateString('en-CA');
          this.allPast = bookings
            .filter((b: any) => b.travelDate < todayDateStr)
            .sort((a: any, b: any) => b.travelDate.localeCompare(a.travelDate));
          this.buildMonthOptions();
          this.applyFilter();
          return bookings;
        })
      )
      .subscribe({ next: () => {} });
  }

  private buildMonthOptions() {
    const months = new Set<string>();
    this.allPast.forEach(b => {
      if (b.travelDate) months.add(b.travelDate.slice(0, 7));
    });
    this.monthOptions = Array.from(months)
      .sort((a, b) => b.localeCompare(a))
      .map(ym => {
        const [y, m] = ym.split('-');
        const label = new Date(+y, +m - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
        return { label, value: ym };
      });
  }

  applyFilter() {
    let list = this.allPast;
    if (this.selectedMonth) {
      list = list.filter(b => b.travelDate?.startsWith(this.selectedMonth));
    }
    const q = this.searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(b =>
        b.customer?.customerName?.toLowerCase().includes(q) ||
        b.from?.toLowerCase().includes(q) ||
        b.to?.toLowerCase().includes(q)
      );
    }
    this.pastBookings = list;
  }

  clearFilters() {
    this.searchText    = '';
    this.selectedMonth = '';
    this.applyFilter();
  }

  mapsUrl(location: string): string {
    if (!location) return '#';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
  }

  formatTime(time?: string | null): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const h   = parseInt(parts[0], 10);
    const m   = parts[1].padStart(2, '0');
    const sfx = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 === 0 ? 12 : h % 12}:${m} ${sfx}`;
  }
}

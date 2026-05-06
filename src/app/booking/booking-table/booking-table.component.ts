import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { BookingFormComponent } from '../booking-form/booking-form.component';
import { BookingService } from '../../services/booking.service';
import { VehicleService } from '../../services/vehicle.service';
import { EmployeeService } from '../../services/employee.service';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IndianCurrencyPipe } from '../../pipes/indian-currency.pipe';

type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom' | '';

@Component({
  selector: 'app-booking-table',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, IndianCurrencyPipe],
  templateUrl: './booking-table.component.html',
  styleUrl: './booking-table.component.css',
})
export class BookingTableComponent implements OnInit {
  bookings: any[] = [];
  vehicles: any[] = [];
  employees: any[] = [];

  // Summary KPIs from current result
  resultTotal = 0;
  resultRevenue = 0;
  resultPending = 0;
  resultCompleted = 0;
  resultCancelled = 0;

  pagination: any = {
    pageNumber: 1,
    pageSize: 15,
    totalCount: 0,
    totalPages: 0,
  };

  showFilter = true;
  selectedPeriod: Period = '';
  showCustom = false;

  filter: any = {
    particularDate: '',
    startDate: '',
    endDate: '',
    from: '',
    to: '',
    status: '',
    vehicleId: '',
    userId: '',
    bookingType: '',
    travelTime: '',
  };

  statusOptions = ['', 'Pending', 'Completed', 'Cancelled', 'InProgress'];

  constructor(
    private _dialog: MatDialog,
    private _bookingservice: BookingService,
    private _vehicleService: VehicleService,
    private _employeeService: EmployeeService
  ) {}

  ngOnInit() {
    this.applyFilter();
    this._bookingservice.bookingUpdated$.subscribe(() => this.applyFilter());

    this._vehicleService.getAllVehicles().subscribe({
      next: (data: any) => {
        this.vehicles = Array.isArray(data) ? data : data?.vehicles || [];
      },
    });

    this._employeeService.getAllEmployees().subscribe({
      next: (data: any) => {
        this.employees = Array.isArray(data) ? data : data?.users || data?.employees || [];
      },
    });
  }

  selectPeriod(p: Period) {
    this.selectedPeriod = p;
    this.showCustom = p === 'custom';
    if (p === 'custom') return;

    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    if (p === '') {
      this.filter.startDate = '';
      this.filter.endDate = '';
    } else if (p === 'week') {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      this.filter.startDate = fmt(from);
      this.filter.endDate = fmt(now);
    } else if (p === 'month') {
      this.filter.startDate = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
      this.filter.endDate = fmt(now);
    } else if (p === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      this.filter.startDate = fmt(new Date(now.getFullYear(), q * 3, 1));
      this.filter.endDate = fmt(now);
    } else if (p === 'year') {
      this.filter.startDate = fmt(new Date(now.getFullYear(), 0, 1));
      this.filter.endDate = fmt(now);
    }

    this.pagination.pageNumber = 1;
    this.applyFilter();
  }

  applyFilter() {
    this._bookingservice
      .filterBookings(this.filter, this.pagination.pageNumber, this.pagination.pageSize)
      .subscribe({
        next: (res: any) => {
          this.bookings = res.data || [];
          this.pagination = res.pagination || this.pagination;
          this.computeSummary();
        },
      });
  }

  applyCustomRange() {
    this.pagination.pageNumber = 1;
    this.applyFilter();
  }

  clearFilter() {
    this.selectedPeriod = '';
    this.showCustom = false;
    this.filter = {
      particularDate: '', startDate: '', endDate: '',
      from: '', to: '', status: '', vehicleId: '',
      userId: '', bookingType: '', travelTime: '',
    };
    this.pagination.pageNumber = 1;
    this.applyFilter();
  }

  computeSummary() {
    this.resultTotal     = this.bookings.length;
    this.resultRevenue   = this.bookings.reduce((s, b) => s + (b.amount || 0), 0);
    this.resultPending   = this.bookings.filter((b) => b.status === 'Pending').length;
    this.resultCompleted = this.bookings.filter((b) => b.status === 'Completed').length;
    this.resultCancelled = this.bookings.filter((b) => b.status === 'Cancelled').length;
  }

  changePage(page: number) {
    if (page < 1 || page > this.pagination.totalPages) return;
    this.pagination.pageNumber = page;
    this.applyFilter();
  }

  editBooking(booking: any) {
    this._dialog.open(BookingFormComponent, { data: booking });
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

  get pages(): number[] {
    const total = this.pagination.totalPages;
    const current = this.pagination.pageNumber;
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  showLeftDots(): boolean  { return this.pagination.pageNumber > 3; }
  showRightDots(): boolean { return this.pagination.pageNumber < this.pagination.totalPages - 2; }
}

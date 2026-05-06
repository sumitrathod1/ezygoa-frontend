import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../services/booking.service';
import { VehicleService } from '../services/vehicle.service';
import { SalaryService } from '../services/salary.service';
import { DashboardService } from '../services/dashboard.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { ToastrService } from 'ngx-toastr';
import { IndianCurrencyPipe } from '../pipes/indian-currency.pipe';
import { Router, RouterModule } from '@angular/router';

interface CacheEntry { data: any; ts: number; }
const CACHE_TTL_MS = 2 * 60 * 1000;

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterModule,
    CalendarComponent, IndianCurrencyPipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  calendarSummary: any[] = [];

  isLoadingKpi   = true;
  totalBookings  = 0;
  todayBookings  = 0;
  todayEarning   = 0;
  totalRevenue   = 0;

  availableDrivers:  any[] = [];
  availableVehicles: any[] = [];

  popupBookings: any[] = [];
  popupLoading  = false;

  docExpiredCount  = 0;
  docExpiringCount = 0;
  maintenanceAlerts: any[] = [];
  showMarkDoneForm  = false;
  selectedMaint: any = null;
  markDoneData = { servieDate: '', nextduedate: '', cost: 0, description: '', maintenanceType: 'Service' };
  monthlySalaryTotal = 0;
  monthlyEmiTotal    = 0;
  emiVehicleCount    = 0;
  today = new Date();

  private cache = new Map<string, CacheEntry>();
  private calMonth = new Date().getMonth() + 1;
  private calYear  = new Date().getFullYear();

  private destroyRef = inject(DestroyRef);
  private cdr        = inject(ChangeDetectorRef);

  constructor(
    private _bookingService:   BookingService,
    private _vehicleService:   VehicleService,
    private _salaryService:    SalaryService,
    private _dashboardService: DashboardService,
    private _toastr:           ToastrService,
    private router:            Router
  ) {}

  ngOnInit() {
    this._bookingService.bookingUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.cache.clear();
        this.loadCalendarSummary(this.calMonth, this.calYear, true);
      });

    this.loadCalendarSummary(this.calMonth, this.calYear);

    setTimeout(() => {
      this.loadDocStats();
      this.loadMaintenanceAlerts();
      this.loadFinancialSummary();
    }, 0);
  }

  onMonthChanged(ev: { month: number; year: number }) {
    this.calMonth = ev.month;
    this.calYear  = ev.year;
    this.loadCalendarSummary(ev.month, ev.year);
    const nm = ev.month === 12 ? 1  : ev.month + 1;
    const ny = ev.month === 12 ? ev.year + 1 : ev.year;
    this.prefetch(nm, ny);
  }

  onDateSelected(isoDate: string) {
    this.popupBookings = [];
    this.popupLoading  = true;
    this.cdr.markForCheck();

    this._bookingService.getBookingsByDate(isoDate).subscribe({
      next: (bookings) => {
        this.popupBookings = bookings;
        this.popupLoading  = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.popupLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadCalendarSummary(month: number, year: number, forceRefresh = false) {
    const key = `${year}-${month}`;

    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        this.applyCalendarData(cached.data);
        this.prefetch(month === 12 ? 1 : month + 1, month === 12 ? year + 1 : year);
        return;
      }
    }

    this.isLoadingKpi = true;
    this.cdr.markForCheck();

    this._dashboardService.getCalendarSummary(month, year).subscribe({
      next: (data) => {
        this.cache.set(key, { data, ts: Date.now() });
        this.applyCalendarData(data);
        this.prefetch(month === 12 ? 1 : month + 1, month === 12 ? year + 1 : year);
      },
      error: () => {
        this.isLoadingKpi = false;
        this._toastr.error('Failed to load dashboard', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  private applyCalendarData(data: any) {
    this.totalBookings     = data.totalBookings   ?? 0;
    this.todayBookings     = data.todayBookings   ?? 0;
    this.todayEarning      = data.todayEarning    ?? 0;
    this.totalRevenue      = data.totalRevenue    ?? 0;
    this.calendarSummary   = data.calendarData    ?? [];
    this.availableDrivers  = data.availableDrivers  ?? [];
    this.availableVehicles = data.availableVehicles ?? [];
    this.isLoadingKpi      = false;
    this.cdr.markForCheck();
  }

  private prefetch(month: number, year: number) {
    const key = `${year}-${month}`;
    if (this.cache.has(key) && Date.now() - this.cache.get(key)!.ts < CACHE_TTL_MS) return;
    this._dashboardService.getCalendarSummary(month, year).subscribe({
      next: (data) => this.cache.set(key, { data, ts: Date.now() })
    });
  }

  loadDocStats() {
    this._vehicleService.getAllDocuments().subscribe({
      next: (data: any) => {
        const docs: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        const now = Date.now();
        this.docExpiredCount = docs.filter(d => {
          if (!d.expiryDate || d.hasExpiry === false) return false;
          return new Date(d.expiryDate).getTime() < now;
        }).length;
        this.docExpiringCount = docs.filter(d => {
          if (!d.expiryDate || d.hasExpiry === false) return false;
          const days = (new Date(d.expiryDate).getTime() - now) / 86400000;
          return days >= 0 && days <= 30;
        }).length;
        this.cdr.markForCheck();
      },
    });
  }

  loadMaintenanceAlerts() {
    this._vehicleService.getAllMaintenances().subscribe({
      next: (res: any) => {
        const all: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        const byVehicle: Record<number, any> = {};
        for (const m of all) {
          const vid  = m.vehicleID ?? m.VehicleID;
          const prev = byVehicle[vid];
          const mDate = new Date(m.servieDate ?? m.ServieDate).getTime();
          if (!prev || mDate > new Date(prev.servieDate ?? prev.ServieDate).getTime())
            byVehicle[vid] = m;
        }
        const now = Date.now();
        this.maintenanceAlerts = Object.values(byVehicle)
          .map(m => ({
            ...m,
            daysUntilDue: Math.floor(
              (new Date(m.nextduedate ?? m.Nextduedate).getTime() - now) / 86400000
            ),
          }))
          .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
        this.cdr.markForCheck();
      },
    });
  }

  maintUrgencyClass(m: any): string {
    if (m.daysUntilDue < 0)   return 'maint-overdue';
    if (m.daysUntilDue <= 30) return 'maint-critical';
    if (m.daysUntilDue <= 60) return 'maint-warning';
    return 'maint-ok';
  }

  maintUrgencyLabel(m: any): string {
    if (m.daysUntilDue < 0)   return `Overdue by ${Math.abs(m.daysUntilDue)}d`;
    if (m.daysUntilDue === 0) return 'Due today';
    return `${m.daysUntilDue}d left`;
  }

  openMarkDone(m: any) {
    this.selectedMaint = m;
    this.markDoneData  = {
      servieDate: new Date().toISOString().substring(0, 10),
      nextduedate: '', cost: 0, description: '',
      maintenanceType: m.maintenanceType ?? 'Service',
    };
    this.showMarkDoneForm = true;
    this.cdr.markForCheck();
  }

  submitMarkDone() {
    if (!this.selectedMaint || !this.markDoneData.nextduedate) return;
    this._vehicleService.addMaintenance({
      vehicleID:       this.selectedMaint.vehicleID ?? this.selectedMaint.VehicleID,
      servieDate:      new Date(this.markDoneData.servieDate),
      nextduedate:     new Date(this.markDoneData.nextduedate),
      cost:            this.markDoneData.cost,
      description:     this.markDoneData.description,
      maintenanceType: this.markDoneData.maintenanceType,
    }).subscribe({ next: () => { this.showMarkDoneForm = false; this.selectedMaint = null; this.loadMaintenanceAlerts(); } });
  }

  cancelMarkDone() {
    this.showMarkDoneForm = false;
    this.selectedMaint   = null;
    this.cdr.markForCheck();
  }

  loadFinancialSummary() {
    const now = new Date(); const month = now.getMonth() + 1; const year = now.getFullYear();
    this._salaryService.getAll().subscribe({
      next: (records) => {
        this.monthlySalaryTotal = records
          .filter(r => r.month === month && r.year === year)
          .reduce((s: number, r: any) => s + (r.netSalaey ?? 0), 0);
        this.cdr.markForCheck();
      },
    });
    this._vehicleService.getAllVehicles().subscribe({
      next: (res: any) => {
        const vehicles: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        const emi = vehicles.filter(v => v.hasEMI || v.HasEMI);
        this.emiVehicleCount = emi.length;
        this.monthlyEmiTotal = emi.reduce((s, v) => s + (v.emiAmount ?? v.eMIAmount ?? 0), 0);
        this.cdr.markForCheck();
      },
    });
  }

  goToEarnings() { this.router.navigate(['/earnings']); }
  goTo(path: string) { this.router.navigate([path]); }
}

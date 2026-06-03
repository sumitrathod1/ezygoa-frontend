import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../services/vehicle.service';

const CATEGORIES = [
  { value: 'Fuel',    label: 'Fuel',    icon: 'bi-fuel-pump-fill',     color: '#f97316' },
  { value: 'CNG',     label: 'CNG',     icon: 'bi-wind',               color: '#10b981' },
  { value: 'Service', label: 'Service', icon: 'bi-tools',               color: '#6366f1' },
  { value: 'Tyre',    label: 'Tyre',    icon: 'bi-circle',              color: '#64748b' },
  { value: 'Repair',  label: 'Repair',  icon: 'bi-wrench-adjustable',   color: '#ef4444' },
  { value: 'Towing',  label: 'Towing',  icon: 'bi-truck',               color: '#8b5cf6' },
  { value: 'Other',   label: 'Other',   icon: 'bi-three-dots',          color: '#6b7280' },
];

@Component({
  selector: 'app-driver-expense',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './driver-expense.component.html',
  styleUrl:    './driver-expense.component.css',
})
export class DriverExpenseComponent implements OnInit {
  @Output() closed  = new EventEmitter<void>();
  @Output() saved   = new EventEmitter<void>();

  private cdr = inject(ChangeDetectorRef);

  categories = CATEGORIES;
  selectedCategory = 'Fuel';

  vehicles: any[]          = [];
  selectedVehicleId: number | null = null;
  vehiclesLoading          = false;

  amount  = '';
  notes   = '';
  expDate = new Date().toISOString().split('T')[0];

  saving  = false;
  error   = '';
  success = false;

  constructor(private _vehicleService: VehicleService) {}

  ngOnInit() {
    this.vehiclesLoading = true;
    this.cdr.markForCheck();

    this._vehicleService.getAllVehicles().subscribe({
      next: (data: any) => {
        // Interceptor already unwraps ApiResponse, but handle both cases
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];

        this.vehicles        = list;
        this.vehiclesLoading = false;

        // Auto-select first vehicle
        if (this.vehicles.length > 0) {
          this.selectedVehicleId = this.vehicleId(this.vehicles[0]);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.vehiclesLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectCategory(val: string) {
    this.selectedCategory = val;
  }

  selectVehicle(id: number) {
    // Toggle off if already selected, otherwise select
    this.selectedVehicleId = this.selectedVehicleId === id ? null : id;
  }

  vehicleName(v: any): string {
    return v.vehicleName ?? v.registrationNumber ?? v.vehicleNumber ?? v.name ?? 'Vehicle';
  }

  vehicleId(v: any): number {
    return v.vehicleID ?? v.vehicleId ?? v.id;
  }

  get activeCat() {
    return this.categories.find(c => c.value === this.selectedCategory)!;
  }

  submit() {
    if (!this.amount || isNaN(+this.amount) || +this.amount <= 0) {
      this.error = 'Please enter a valid amount.';
      this.cdr.markForCheck();
      return;
    }
    this.error  = '';
    this.saving = true;
    this.cdr.markForCheck();

    const payload = {
      expenseDate:  this.expDate,
      amount:       +this.amount,
      categoryType: this.selectedCategory,
      vehicleID:    this.selectedVehicleId,
      notes:        this.notes || null,
    };

    this._vehicleService.addExpence(payload).subscribe({
      next: () => {
        this.saving  = false;
        this.success = true;
        this.cdr.markForCheck();
        setTimeout(() => { this.saved.emit(); this.close(); }, 1200);
      },
      error: () => {
        this.saving = false;
        this.error  = 'Could not save expense. Please try again.';
        this.cdr.markForCheck();
      },
    });
  }

  close() { this.closed.emit(); }
}

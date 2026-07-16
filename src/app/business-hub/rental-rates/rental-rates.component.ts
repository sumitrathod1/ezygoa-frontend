import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RentalRatesService } from '../../services/rental-rates.service';
import { VehicleService } from '../../services/vehicle.service';
import { EmployeeService } from '../../services/employee.service';
import { RentalRate, RentalRateUpsertDTO } from '../../models/rental-rate.model';

@Component({
  selector: 'app-rental-rates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rental-rates.component.html',
  styleUrl: './rental-rates.component.css',
})
export class RentalRatesComponent implements OnInit {
  rates:    RentalRate[] = [];
  vehicles: any[]        = [];
  loading   = false;
  saving    = false;
  error     = '';
  saveError = '';
  isAdmin   = false;
  showInactive = false;

  showForm  = false;
  editingId: number | null = null;
  form: RentalRateUpsertDTO = this._blankForm();

  constructor(
    private _rrSvc:  RentalRatesService,
    private _vSvc:   VehicleService,
    private _empSvc: EmployeeService,
    private _router: Router,
  ) {}

  ngOnInit() {
    this.isAdmin = this._empSvc.getRoleFromToken() === 'Admin';
    this._vSvc.getAllVehicles().subscribe({ next: (v: any) => this.vehicles = v });
    this.load();
  }

  load() {
    this.loading = true;
    this.error   = '';
    this._rrSvc.getAll(this.showInactive).subscribe({
      next: (data) => { this.rates = data; this.loading = false; },
      error: () => { this.error = 'Failed to load rental rates.'; this.loading = false; },
    });
  }

  toggleInactive() { this.showInactive = !this.showInactive; this.load(); }

  vehicleName(id: number): string {
    const v = this.vehicles.find((v: any) => v.vehicleId === id);
    return v ? `${v.vehicleName} (${v.vehicleNumber ?? ''})` : `#${id}`;
  }

  openCreate() {
    this.editingId = null;
    this.form = this._blankForm();
    this.saveError = '';
    this.showForm  = true;
  }

  openEdit(r: RentalRate) {
    this.editingId = r.rentalRateId;
    this.form = {
      vehicleId:       r.vehicleId,
      pricePerDay:     r.pricePerDay,
      weeklyRate:      r.weeklyRate,
      securityDeposit: r.securityDeposit,
      minDays:         r.minDays,
      kmPerDay:        r.kmPerDay,
      extraKmRate:     r.extraKmRate,
      isActive:        r.isActive,
    };
    this.saveError = '';
    this.showForm  = true;
  }

  closeForm() { this.showForm = false; }

  save() {
    if (!this.form.vehicleId) {
      this.saveError = 'Vehicle is required.'; return;
    }
    if (!this.form.pricePerDay || this.form.pricePerDay <= 0) {
      this.saveError = 'Price per day must be greater than zero.'; return;
    }
    if (this.form.securityDeposit < 0) {
      this.saveError = 'Security deposit cannot be negative.'; return;
    }

    this.saving    = true;
    this.saveError = '';

    const req = this.editingId
      ? this._rrSvc.update(this.editingId, this.form)
      : this._rrSvc.create(this.form);

    req.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); },
      error: (err) => {
        this.saving    = false;
        const msg = err?.error?.message ?? err?.error?.Message ?? '';
        this.saveError = msg || 'Save failed. A rate for this vehicle may already exist.';
      },
    });
  }

  goBack() { this._router.navigate(['/business-hub']); }

  private _blankForm(): RentalRateUpsertDTO {
    return {
      vehicleId:       0,
      pricePerDay:     0,
      weeklyRate:      null,
      securityDeposit: 0,
      minDays:         1,
      kmPerDay:        null,
      extraKmRate:     null,
      isActive:        true,
    };
  }
}

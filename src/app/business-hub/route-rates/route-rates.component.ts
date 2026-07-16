import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouteRatesService } from '../../services/route-rates.service';
import { PlacesService } from '../../services/places.service';
import { EmployeeService } from '../../services/employee.service';
import { RouteRate, RouteRateUpsertDTO, QuoteResult, VEHICLE_TYPES } from '../../models/route-rate.model';
import { Place } from '../../models/place.model';

@Component({
  selector: 'app-route-rates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './route-rates.component.html',
  styleUrl: './route-rates.component.css',
})
export class RouteRatesComponent implements OnInit {
  rates:  RouteRate[] = [];
  places: Place[]     = [];
  loading  = false;
  saving   = false;
  error    = '';
  saveError = '';
  isAdmin  = false;

  // Filters
  filterFrom: number | '' = '';
  filterTo:   number | '' = '';
  filterVehicle = '';

  readonly vehicleTypes = VEHICLE_TYPES;

  // Form
  showForm  = false;
  editingId: number | null = null;
  form: RouteRateUpsertDTO = this._blankForm();

  // Quote tester
  quoteFrom: number | '' = '';
  quoteTo:   number | '' = '';
  quoteResult: QuoteResult | null = null;
  quoteError  = '';
  quoteLoading = false;

  constructor(
    private _rrSvc:  RouteRatesService,
    private _plSvc:  PlacesService,
    private _empSvc: EmployeeService,
    private _router: Router,
  ) {}

  ngOnInit() {
    this.isAdmin = this._empSvc.getRoleFromToken() === 'Admin';
    this._plSvc.getAll().subscribe({ next: (p) => this.places = p });
    this.load();
  }

  load() {
    this.loading = true;
    this.error   = '';
    const params: any = {};
    if (this.filterFrom !== '')    params.fromPlaceId  = this.filterFrom;
    if (this.filterTo   !== '')    params.toPlaceId    = this.filterTo;
    if (this.filterVehicle)        params.vehicleType  = this.filterVehicle;

    this._rrSvc.getAll(params).subscribe({
      next: (data) => { this.rates = data; this.loading = false; },
      error: () => { this.error = 'Failed to load rates.'; this.loading = false; },
    });
  }

  clearFilters() {
    this.filterFrom    = '';
    this.filterTo      = '';
    this.filterVehicle = '';
    this.load();
  }

  placeName(id: number): string {
    return this.places.find(p => p.placeId === id)?.name ?? `#${id}`;
  }

  // ── Form ──────────────────────────────────────────────────
  openCreate() {
    this.editingId = null;
    this.form = this._blankForm();
    this.saveError = '';
    this.showForm  = true;
  }

  openEdit(r: RouteRate) {
    this.editingId = r.routeRateId;
    this.form = {
      fromPlaceId: r.fromPlaceId,
      toPlaceId:   r.toPlaceId,
      vehicleType: r.vehicleType,
      price:       r.price,
      peakPrice:   r.peakPrice,
      floorPrice:  r.floorPrice,
      isActive:    r.isActive,
    };
    this.saveError = '';
    this.showForm  = true;
  }

  closeForm() { this.showForm = false; }

  save() {
    if (!this.form.fromPlaceId || !this.form.toPlaceId) {
      this.saveError = 'From and To places are required.'; return;
    }
    if (!this.form.vehicleType) {
      this.saveError = 'Vehicle type is required.'; return;
    }
    if (!this.form.price || this.form.price <= 0) {
      this.saveError = 'Price must be greater than zero.'; return;
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
        this.saveError = msg || 'Save failed. A rate for this route and vehicle type may already exist.';
      },
    });
  }

  // ── Quote tester ──────────────────────────────────────────
  getQuote() {
    if (!this.quoteFrom || !this.quoteTo) return;
    this.quoteLoading = true;
    this.quoteResult  = null;
    this.quoteError   = '';

    this._rrSvc.getQuote(+this.quoteFrom, +this.quoteTo).subscribe({
      next: (res) => { this.quoteResult = res; this.quoteLoading = false; },
      error: (err) => {
        this.quoteLoading = false;
        this.quoteError = err?.error?.message ?? 'Could not get quote for this route.';
      },
    });
  }

  clearQuote() {
    this.quoteFrom   = '';
    this.quoteTo     = '';
    this.quoteResult = null;
    this.quoteError  = '';
  }

  goBack() { this._router.navigate(['/business-hub']); }

  private _blankForm(): RouteRateUpsertDTO {
    return {
      fromPlaceId: 0,
      toPlaceId:   0,
      vehicleType: '',
      price:       0,
      peakPrice:   null,
      floorPrice:  null,
      isActive:    true,
    };
  }
}

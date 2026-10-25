import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ExtraRate, InvoiceTerms, InvoiceTermsService, NightCharge } from '../../services/invoice-terms.service';
import { VehicleService } from '../../services/vehicle.service';

/**
 * Business Hub → Invoice terms: night charges, extra hour / km after Full Day packages,
 * other terms — and which rate row each vehicle uses.
 */
@Component({
  selector: 'app-invoice-terms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './invoice-terms.component.html',
  styleUrl: './invoice-terms.component.css',
})
export class InvoiceTermsComponent implements OnInit {
  terms: InvoiceTerms | null = null;
  vehicles: any[] = [];
  loading = true;
  saving = false;
  dirty = false;
  savingVehicle: number | null = null;

  readonly appliesOptions = [
    { value: 'FullDay', label: 'Full Day' },
    { value: 'Transfer', label: 'Airport / station pickup & drop' },
    { value: 'All', label: 'All bookings' },
  ];

  constructor(
    private _termsService: InvoiceTermsService,
    private _vehicleService: VehicleService,
    private _toastr: ToastrService
  ) {}

  ngOnInit() {
    this._termsService.get().subscribe({
      next: (t) => {
        this.terms = { nightCharges: t.nightCharges ?? [], extraRates: t.extraRates ?? [], otherTerms: t.otherTerms ?? '' };
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this._toastr.error('Could not load the invoice terms.');
      },
    });
    this._vehicleService.getAllVehicles().subscribe({
      next: (res: any) => (this.vehicles = Array.isArray(res) ? res : res?.data ?? []),
    });
  }

  changed() {
    this.dirty = true;
  }

  addNight() {
    this.terms!.nightCharges.push({ label: '', from: '19:00', to: '00:00', amount: 0, appliesTo: 'FullDay' } as NightCharge);
    this.changed();
  }

  removeNight(i: number) {
    this.terms!.nightCharges.splice(i, 1);
    this.changed();
  }

  addRate() {
    this.terms!.extraRates.push({ category: '', perHour: 0, perKm: 0 } as ExtraRate);
    this.changed();
  }

  removeRate(i: number) {
    this.terms!.extraRates.splice(i, 1);
    this.changed();
  }

  get categories(): string[] {
    return (this.terms?.extraRates ?? []).map((r) => r.category).filter((c) => !!c?.trim());
  }

  save() {
    if (!this.terms) return;
    this.saving = true;
    this._termsService.save(this.terms).subscribe({
      next: (t) => {
        this.terms = { nightCharges: t.nightCharges, extraRates: t.extraRates, otherTerms: t.otherTerms ?? '' };
        this.saving = false;
        this.dirty = false;
        this._toastr.success('Invoice terms saved');
      },
      error: (err) => {
        this.saving = false;
        this._toastr.error(err?.error?.message || 'Could not save the invoice terms.');
      },
    });
  }

  /** Which rate row a vehicle is charged by — saved straight away. */
  setCategory(v: any, category: string) {
    this.savingVehicle = v.vehicleId;
    const payload = { ...v, rateCategory: category || null };
    this._vehicleService.updateVehicle(payload).subscribe({
      next: () => {
        v.rateCategory = category || null;
        this.savingVehicle = null;
        this._toastr.success(`${v.vehicleName}: ${category || 'no rate category'}`, '', { timeOut: 2000 });
      },
      error: () => {
        this.savingVehicle = null;
        this._toastr.error('Could not save the vehicle.');
      },
    });
  }

  trackIndex = (i: number) => i;
}

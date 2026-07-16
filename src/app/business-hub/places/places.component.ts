import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlacesService } from '../../services/places.service';
import { EmployeeService } from '../../services/employee.service';
import { Place, PlaceUpsertDTO, PlaceZone, PLACE_ZONE_LABELS } from '../../models/place.model';

@Component({
  selector: 'app-places',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './places.component.html',
  styleUrl: './places.component.css',
})
export class PlacesComponent implements OnInit {
  places: Place[] = [];
  loading = false;
  saving  = false;
  error   = '';
  saveError = '';

  showInactive = false;
  searchQuery  = '';
  isAdmin = false;

  showForm = false;
  editingId: number | null = null;

  form: PlaceUpsertDTO = this._blankForm();

  readonly zoneOptions: { value: PlaceZone; label: string }[] = [
    { value: 0, label: 'North' },
    { value: 1, label: 'South' },
    { value: 2, label: 'Hub'   },
  ];

  readonly zoneLabels = PLACE_ZONE_LABELS;

  constructor(
    private _svc: PlacesService,
    private _empSvc: EmployeeService,
    private _router: Router,
  ) {}

  ngOnInit() {
    this.isAdmin = this._empSvc.getRoleFromToken() === 'Admin';
    this.load();
  }

  load() {
    this.loading = true;
    this.error   = '';
    this._svc.getAll(this.showInactive).subscribe({
      next: (data) => { this.places = data; this.loading = false; },
      error: () => { this.error = 'Failed to load places.'; this.loading = false; },
    });
  }

  get filtered(): Place[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.places.filter(p =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.aliases ?? '').toLowerCase().includes(q)
    );
  }

  openCreate() {
    this.editingId = null;
    this.form = this._blankForm();
    this.saveError = '';
    this.showForm  = true;
  }

  openEdit(p: Place) {
    this.editingId = p.placeId;
    this.form = {
      name:               p.name,
      aliases:            p.aliases ?? '',
      zone:               this._parseZone(p.zone),
      pickupAllowed:      p.pickupAllowed,
      dropAllowed:        p.dropAllowed,
      restrictionMessage: p.restrictionMessage ?? '',
      isActive:           p.isActive,
    };
    this.saveError = '';
    this.showForm  = true;
  }

  closeForm() { this.showForm = false; }

  save() {
    if (!this.form.name.trim()) { this.saveError = 'Name is required.'; return; }
    this.saving    = true;
    this.saveError = '';

    const dto: PlaceUpsertDTO = {
      ...this.form,
      aliases:            this.form.aliases            || null,
      restrictionMessage: this.form.restrictionMessage || null,
    };

    const req = this.editingId
      ? this._svc.update(this.editingId, dto)
      : this._svc.create(dto);

    req.subscribe({
      next: () => { this.saving = false; this.showForm = false; this.load(); },
      error: (err) => {
        this.saving    = false;
        this.saveError = err?.error?.message ?? 'Save failed.';
      },
    });
  }

  toggleInactive() {
    this.showInactive = !this.showInactive;
    this.load();
  }

  zoneBadgeClass(zone: PlaceZone): string {
    return zone === 0 ? 'zone-north' : zone === 1 ? 'zone-south' : 'zone-hub';
  }

  goBack() { this._router.navigate(['/business-hub']); }

  private _parseZone(zone: any): PlaceZone {
    if (typeof zone === 'number') return zone as PlaceZone;
    const match = this.zoneOptions.find(z => z.label.toLowerCase() === String(zone).toLowerCase());
    return (match?.value ?? 0) as PlaceZone;
  }

  private _blankForm(): PlaceUpsertDTO {
    return {
      name: '', aliases: '', zone: 0,
      pickupAllowed: true, dropAllowed: true,
      restrictionMessage: '', isActive: true,
    };
  }
}

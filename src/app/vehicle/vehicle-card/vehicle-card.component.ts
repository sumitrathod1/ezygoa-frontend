import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleService } from '../../services/vehicle.service';
import { MatDialog } from '@angular/material/dialog';
import { MaintenanceFormComponent } from '../maintenance-form/maintenance-form.component';
import { ExpenseFormComponent } from '../expense-form/expense-form.component';
import { DocumentFormComponent } from '../document-form/document-form.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vehicle-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-card.component.html',
  styleUrl: './vehicle-card.component.css',
})
export class VehicleCardComponent {
  vehicleList: any[] = [];
  searchQuery = '';

  showEmiForm = false;
  emiVehicle: any = null;
  emiData = { hasEMI: true, emiAmount: 0, emiDay: 1, emiStartDate: '', emiEndDate: '', emiLender: '', totalEMIs: 0, paidEMIs: 0 };

  showEmiStatement = false;
  emiStatement: any = null;
  emiStatementLoading = false;

  constructor(
    private _vechicleService: VehicleService,
    private _dialog: MatDialog,
    private _vehicleService: VehicleService
  ) {}

  ngOnInit() {
    this.loadVehicles();
    this._vehicleService.vehicleUpdated$.subscribe(() => {
      this.loadVehicles();
    });
  }

  loadVehicles() {
    this._vechicleService.getAllVehicles().subscribe({
      next: (data: any) => {
        this.vehicleList = data;
      },
    });
  }

  get filteredVehicles() {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.vehicleList;
    return this.vehicleList.filter(
      (v) =>
        v.vehicleName?.toLowerCase().includes(q) ||
        v.vehicleNumber?.toLowerCase().includes(q) ||
        v.vehicleType?.toLowerCase().includes(q)
    );
  }

  getVehicleAge(registrationDate: string): string {
    if (!registrationDate) return '—';
    const reg = new Date(registrationDate);
    const now = new Date();
    const totalMonths =
      (now.getFullYear() - reg.getFullYear()) * 12 +
      (now.getMonth() - reg.getMonth());
    if (totalMonths < 1) return 'New';
    if (totalMonths < 12) return `${totalMonths}m old`;
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    return m > 0 ? `${y}y ${m}m` : `${y}y old`;
  }

  getVehicleGradient(type: string): string {
    const map: Record<string, string> = {
      SUV: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      Sedan: 'linear-gradient(135deg, #22c55e, #15803d)',
      TT: 'linear-gradient(135deg, #f59e0b, #b45309)',
      Tempo: 'linear-gradient(135deg, #f59e0b, #b45309)',
      Bus: 'linear-gradient(135deg, #ef4444, #b91c1c)',
      Bike: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      Hatchback: 'linear-gradient(135deg, #06b6d4, #0e7490)',
    };
    return map[type] || 'linear-gradient(135deg, #6366f1, #4f46e5)';
  }

  maintenance(vehicleId: number) {
    this._dialog.open(MaintenanceFormComponent, {
      data: { vehicleID: vehicleId },
    });
  }

  expence(vehicleId: number) {
    this._dialog.open(ExpenseFormComponent, {
      data: { vehicleID: vehicleId },
    });
  }

  documentShedule(vehicleId: number) {
    this._dialog.open(DocumentFormComponent, {
      data: { vehicleID: vehicleId },
    });
  }

  openEmi(vehicle: any) {
    this.emiVehicle = vehicle;
    this.emiData = {
      hasEMI: vehicle.hasEMI ?? false,
      emiAmount: vehicle.emiAmount ?? vehicle.eMIAmount ?? 0,
      emiDay: vehicle.emiDay ?? vehicle.eMIDay ?? 1,
      emiStartDate: vehicle.emiStartDate ?? vehicle.eMIStartDate ?? '',
      emiEndDate: vehicle.emiEndDate ?? vehicle.eMIEndDate ?? '',
      emiLender: vehicle.emiLender ?? vehicle.eMILender ?? '',
      totalEMIs: vehicle.totalEMIs ?? vehicle.eMIs ?? 0,
      paidEMIs: vehicle.paidEMIs ?? vehicle.paidEMIs ?? 0,
    };
    this.showEmiForm = true;
  }

  saveEmi() {
    if (!this.emiVehicle) return;
    const payload = {
      ...this.emiVehicle,
      hasEMI: this.emiData.hasEMI,
      eMIAmount: this.emiData.emiAmount,
      eMIDay: this.emiData.emiDay,
      eMIStartDate: this.emiData.emiStartDate || null,
      eMIEndDate: this.emiData.emiEndDate || null,
      eMILender: this.emiData.emiLender,
      totalEMIs: this.emiData.totalEMIs,
      paidEMIs: this.emiData.paidEMIs,
    };
    this._vehicleService.updateVehicle(payload).subscribe({
      next: () => { this.showEmiForm = false; this.emiVehicle = null; },
    });
  }

  emiProgressPct(vehicle: any): number {
    const total = vehicle.totalEMIs ?? vehicle.eMIs ?? 0;
    const paid = vehicle.paidEMIs ?? 0;
    return total > 0 ? Math.round((paid / total) * 100) : 0;
  }

  emiDaysUntil(vehicle: any): number {
    const day = vehicle.emiDay ?? vehicle.eMIDay ?? 1;
    const now = new Date();
    const due = new Date(now.getFullYear(), now.getMonth(), day);
    if (due < now) due.setMonth(due.getMonth() + 1);
    return Math.ceil((due.getTime() - now.getTime()) / 86400000);
  }

  openEmiStatement(vehicle: any) {
    this.emiStatement = null;
    this.emiStatementLoading = true;
    this.showEmiStatement = true;
    this._vehicleService.getEmiStatement(vehicle.vehicleId).subscribe({
      next: (data: any) => { this.emiStatement = data; this.emiStatementLoading = false; },
      error: ()          => { this.emiStatementLoading = false; },
    });
  }

  emiStatementProgressPct(): number {
    if (!this.emiStatement?.totalEMIs) return 0;
    return Math.round((this.emiStatement.paidEMIs / this.emiStatement.totalEMIs) * 100);
  }
}

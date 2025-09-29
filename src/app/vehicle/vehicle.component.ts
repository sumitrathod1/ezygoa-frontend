import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ExpenseFormComponent } from './expense-form/expense-form.component';
import { MaintenanceFormComponent } from './maintenance-form/maintenance-form.component';
import { RouterModule } from '@angular/router';
import { VehicleService } from '../services/vehicle.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-vehicle-form',
  standalone: true,
  imports: [CommonModule, MatCardModule, RouterModule],
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.css',
})
export class VehicleComponent {
  vehicleDocuments: any = [];
  expenses: any = [];
  vehicleMaintenances: any = [];

  totlalMaintenanceCost: number = 0;
  totalExpenseCost: number = 0;

  //allExpenses = this.totalExpenseCost + this.totlalMaintenanceCost;
  get allExpenses() {
    return this.totalExpenseCost + this.totlalMaintenanceCost;
  }
  constructor(
    private _dilog: MatDialog,
    private _vehicleService: VehicleService,
    private _toastr: ToastrService
  ) {}

  documentForm() {
    //this._dilog.open(VehicleCardComponent);
  }

  expexnseForm() {
    this._dilog.open(ExpenseFormComponent);
  }
  maintenanceForm() {
    this._dilog.open(MaintenanceFormComponent);
  }

  ngOnInit() {
    this.loadAllDocuments();
    this.loadExpenses();
    this.loadMaintenance();
  }

  loadAllDocuments() {
    this._vehicleService.getAllDocuments().subscribe({
      next: (data) => {
        this.vehicleDocuments = Array.isArray(data) ? data : [];
      },
      error: (err) => {
        console.error('Error loading documents:', err);
      },
    });
  }

  loadExpenses() {
    this._vehicleService.getAllExpences().subscribe({
      next: (data) => {
        this.expenses = Array.isArray(data) ? data : [];
        this.totalExpenseCost = this.expenses.reduce(
          (total: number, exp: any) => {
            return total + (exp.amount || 0);
          },
          0
        );
      },
      error: (error) => {
        console.error('Error loading expenses:', error);
      },
    });
  }

  loadMaintenance() {
    this._vehicleService.getAllMaintenances().subscribe({
      next: (data) => {
        this.vehicleMaintenances = Array.isArray(data) ? data : [];
        this.totlalMaintenanceCost = this.vehicleMaintenances.reduce(
          (total: number, maintenance: any) => {
            return total + (maintenance.cost || 0);
          },
          0
        );
      },
      error: (err) => {
        console.error('Error loading expenses:', err);
      },
    });
  }

  getExpenseDisplay(exp: any) {
    switch (exp.categoryType) {
      case 'Accident':
        return {
          icon: 'bi-car-front-fill',
          iconBg: 'bg-red-light',
        };
      case 'Repair':
        return {
          icon: 'bi-gear-fill',
          iconBg: 'bg-blue-light',
        };
      case 'Fuel':
        return {
          icon: 'bi-droplet-half',
          iconBg: 'bg-orange-light',
        };
      case 'DocumentRenew':
        return {
          icon: 'bi-file-earmark-text',
          iconBg: 'bg-green-light',
        };
      default:
        return {
          icon: 'bi-cash-stack',
          iconBg: 'bg-gray-200',
        };
    }
  }

  getDocumentStatus(doc: any): {
    status: string;
    statusClass: string;
    icon: string;
    iconBg: string;
  } {
    const daysLeft = this.getDaysLeftNumber(doc.expiryDate);
    if (daysLeft > 30) {
      return {
        status: 'Valid',
        statusClass: 'badge-valid',
        icon: 'bi-credit-card-2-front-fill',
        iconBg: 'bg-green-light',
      };
    } else if (daysLeft > 0 && daysLeft < 20) {
      return {
        status: 'Soon',
        statusClass: 'badge-warning',
        icon: 'bi-shield-exclamation',
        iconBg: 'bg-orange-light',
      };
    } else {
      return {
        status: 'Expired',
        statusClass: 'badge-expired',
        icon: 'bi-award-fill',
        iconBg: 'bg-red-light',
      };
    }
  }

  getStatusByDate(
    obj: any,
    dateField: string
  ): {
    status: string;
    statusClass: string;
    icon: string;
    iconBg: string;
  } {
    const dateStr = obj[dateField];
    const daysLeft = this.getDaysLeftNumber(dateStr);

    if (isNaN(daysLeft)) {
      return {
        status: 'Unknown',
        statusClass: 'badge-unknown',
        icon: 'bi-question-circle',
        iconBg: 'bg-gray-200',
      };
    }
    if (daysLeft > 30) {
      return {
        status: 'Valid',
        statusClass: 'badge-valid',
        icon: 'bi-credit-card-2-front-fill',
        iconBg: 'bg-green-light',
      };
    } else if (daysLeft < 20 && daysLeft >= 0) {
      return {
        status: 'Soon',
        statusClass: 'badge-warning',
        icon: 'bi-shield-exclamation',
        iconBg: 'bg-orange-light',
      };
    } else {
      return {
        status: 'Expired',
        statusClass: 'badge-expired',
        icon: 'bi-award-fill',
        iconBg: 'bg-red-light',
      };
    }
  }

  getDaysLeftNumber(dateStr: string): number {
    if (!dateStr) return NaN;
    const today = new Date();
    const target = new Date(dateStr);
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  getDaysLeft(expiryDate: string): string {
    const today = new Date();
    const expiry = new Date(expiryDate);

    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diff = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff > 0) {
      return `${diff} days`;
    } else if (diff === 0) {
      return 'Today';
    } else {
      return `${Math.abs(diff)} Expired`;
    }
  }
  getMaintenanceDisplay(exp: any): any {
    let maintenanceDetails;
    switch (exp.maintenanceType) {
      case 'oilChange':
        maintenanceDetails = { icon: 'bi-droplet-half', iconBg: 'bg-orange' };
        break;
      case 'TireChange':
        maintenanceDetails = { icon: 'bi-circle-fill', iconBg: 'bg-blue' };
        break;
      case 'Fuel':
        maintenanceDetails = {
          icon: 'bi-fuel-pump',
          iconBg: 'bg-yellow-light',
        };
        break;
      case 'Service':
        maintenanceDetails = { icon: 'bi-gear-fill', iconBg: 'bg-green' };
        break;
      default:
        maintenanceDetails = { icon: 'bi-gear-fill', iconBg: 'bg-green' };
        break;
    }

    const daysLeft = this.getDaysLeftNumber(exp.nextduedate);

    let maintenanceStatus;
    if (daysLeft < 0) {
      maintenanceStatus = { status: 'ORdue', statusClass: 'badge-expired' };
    } else if (daysLeft >= 0 && daysLeft <= 20) {
      maintenanceStatus = { status: 'due', statusClass: 'bg-orange-light' };
    } else if (daysLeft <= 30) {
      maintenanceStatus = { status: 'Soon', statusClass: 'badge-warning' };
    } else {
      maintenanceStatus = { status: 'Valid', statusClass: 'badge-valid' };
    }

    return { ...maintenanceDetails, ...maintenanceStatus };
  }

  get top4Documents() {
    //return this.vehicleDocuments.slice(0, 4);

    return [...this.vehicleDocuments]
      .sort((a, b) => {
        const daysLeftA = this.getDaysLeftNumber(a.expiryDate);
        const daysLeftB = this.getDaysLeftNumber(b.expiryDate);
        return daysLeftA - daysLeftB;
      })
      .slice(0, 4);
  }
  get top4Expenses() {
    return this.expenses.slice(0, 4);
  }

  get top4Maintenances() {
    //return this.vehicleMaintenances.slice(0, 4);
    return [...this.vehicleMaintenances]
      .sort((a, b) => {
        const daysLeftA = this.getDaysLeftNumber(a.nextduedate);
        const daysLeftB = this.getDaysLeftNumber(b.nextduedate);
        return daysLeftA - daysLeftB;
      })
      .slice(0, 4);
  }
}

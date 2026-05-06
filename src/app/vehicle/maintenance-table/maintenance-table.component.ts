import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../services/vehicle.service';

@Component({
  selector: 'app-maintenance-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './maintenance-table.component.html',
  styleUrl: './maintenance-table.component.css',
})
export class MaintenanceTableComponent {
  maintenances: any[] = [];
  searchQuery = '';
  selectedType = '';
  maintenanceTypes = ['oilChange', 'TireChange', 'Service'];

  constructor(private _vehicleService: VehicleService) {}

  ngOnInit() {
    this.loadMaintenances();
  }

  loadMaintenances() {
    this._vehicleService.getAllMaintenances().subscribe({
      next: (data: any) => {
        this.maintenances = Array.isArray(data) ? data : [];
      },
    });
  }

  get filteredMaintenances() {
    let result = this.maintenances;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.vehicle?.vehicleName?.toLowerCase().includes(q) ||
          m.maintenanceType?.toLowerCase().includes(q)
      );
    }
    if (this.selectedType) {
      result = result.filter((m) => m.maintenanceType === this.selectedType);
    }
    return result;
  }

  getDaysLeft(dateStr: string): number | null {
    if (!dateStr) return null;
    const due = new Date(dateStr);
    const now = new Date();
    return Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  getStatusInfo(dateStr: string): { label: string; cls: string } {
    const days = this.getDaysLeft(dateStr);
    if (days === null) return { label: '—', cls: 'status-unknown' };
    if (days < 0) return { label: 'Overdue', cls: 'status-overdue' };
    if (days <= 7) return { label: `${days}d left`, cls: 'status-critical' };
    if (days <= 30) return { label: `${days}d left`, cls: 'status-soon' };
    return { label: `${days}d left`, cls: 'status-ok' };
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleService } from '../../services/vehicle.service';
import { MatDialog } from '@angular/material/dialog';
import { MaintenanceFormComponent } from '../maintenance-form/maintenance-form.component';
import { ExpenseFormComponent } from '../expense-form/expense-form.component';
import { DocumentFormComponent } from '../document-form/document-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-vehicle-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vehicle-card.component.html',
  styleUrl: './vehicle-card.component.css',
})
export class VehicleCardComponent {
  vehicleList: any[] = [];
  constructor(
    private _vechicleService: VehicleService,
    private _dialog: MatDialog,
    private _toastr: ToastrService,
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
        console.log(data);
        this.vehicleList = data;
      },
      error: (err) => {
        console.error('Error fetching vehicle data:', err);
      },
    });
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
}

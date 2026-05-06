import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BookingFormComponent } from '../booking/booking-form/booking-form.component';
import { VehicleFormComponent } from '../vehicle/vehicle-form/vehicle-form.component';
import { AddemployeeFormComponent } from '../employee/addemployee-form/addemployee-form.component';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { EmployeeService } from '../services/employee.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatToolbarModule,
    RouterModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  constructor(
    private _dialog: MatDialog,
    private _employeService: EmployeeService,
  ) {}

  addBooking() {
    this._dialog.open(BookingFormComponent);
  }

  addVehicle() {
    this._dialog.open(VehicleFormComponent);
  }

  addEmploye() {
    this._dialog.open(AddemployeeFormComponent);
  }

  onLogout() {
    this._employeService.logout();
  }
}

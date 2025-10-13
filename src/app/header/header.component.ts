import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FullCalendarModule } from '@fullcalendar/angular';

import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BookingFormComponent } from '../booking/booking-form/booking-form.component';
import { VehicleFormComponent } from '../vehicle/vehicle-form/vehicle-form.component';
import { AddemployeeFormComponent } from '../employee/addemployee-form/addemployee-form.component';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { EmployeeService } from '../services/employee.service';
import { NotificationComponent } from '../notification/notification.component';

import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatButtonModule,
    MatToolbarModule,
    MatCardModule,
    MatTooltipModule,
    FullCalendarModule,
    CommonModule,
    MatDatepickerModule,
    RouterModule,
    NotificationComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  showNotifications = false;
  unreadCount: number = 5;
  constructor(
    private _dialog: MatDialog,
    private _employeService: EmployeeService
  ) {}
  addBooking() {
    console.log('Clicked!');
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

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  closeOnOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.classList.contains('notification-slide')) {
      this.showNotifications = false;
    }
  }
}

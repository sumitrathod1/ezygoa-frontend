import { ChangeDetectionStrategy, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { debounceTime, merge, skip, switchMap, timer, catchError, EMPTY, Observable } from 'rxjs';
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
import { BookingService } from '../services/booking.service';
import { DispatchService, PendingAssignmentCount } from '../services/dispatch.service';
import { MyOrganization, MyOrgService } from '../services/my-org.service';

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
    AsyncPipe,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  /** Upcoming bookings still missing a driver or vehicle. */
  pending$: Observable<PendingAssignmentCount | null>;
  /** Signed-in organisation: name + logo in the header */
  org$: Observable<MyOrganization | null>;

  constructor(
    private _dialog: MatDialog,
    private _employeService: EmployeeService,
    private _bookingService: BookingService,
    private _dispatch: DispatchService,
    private _destroyRef: DestroyRef,
    private _myOrg: MyOrgService,
  ) {
    this.pending$ = this._dispatch.pending$;
    this.org$ = this._myOrg.org$;
  }

  ngOnInit() {
    this._myOrg.load();
    // Any booking change (live from the server or local) plus a slow timer, so the
    // count also rolls over at midnight without a reload
    // (skip the value bookingUpdated$ replays on subscribe — the timer already loads at start)
    merge(this._bookingService.bookingUpdated$.pipe(skip(1), debounceTime(400)), timer(0, 5 * 60 * 1000))
      .pipe(
        debounceTime(200),
        switchMap(() => this._dispatch.refreshPending().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this._destroyRef)
      )
      .subscribe();
  }

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

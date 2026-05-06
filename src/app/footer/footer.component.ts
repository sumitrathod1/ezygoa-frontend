import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { BookingFormComponent } from '../booking/booking-form/booking-form.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  constructor(private _dialog: MatDialog, private router: Router) {}

  addBooking() {
    // this._dialog.open(BookingFormComponent);
    (document.activeElement as HTMLElement)?.blur();

    this._dialog.open(BookingFormComponent, {
      width: '95vw',
      maxWidth: '420px',
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
    });
  }
}

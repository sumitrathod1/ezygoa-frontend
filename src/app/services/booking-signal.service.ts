import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BookingService } from './booking.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BookingSignalService {
  private hubConnection!: signalR.HubConnection;

  constructor(
    private bookingService: BookingService,
    private toastr: ToastrService
  ) {}

  startConnection() {
    if (this.hubConnection) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(
        `${environment.signalRUrl}/BookingHub`,
        {
          accessTokenFactory: () => localStorage.getItem('token') || '',
        }
      )
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {})
      .catch(() => {});

    this.hubConnection.on('ReceiveBookingUpdate', (_data) => {
      this.toastr.info('New booking update!', 'Booking Update');
      this.bookingService.loadBookings().subscribe();
    });
  }

  stopConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}
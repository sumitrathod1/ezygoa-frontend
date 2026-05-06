import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  baseUrl: string = `${environment.apiUrl}/Booking/`;

  private bookingsSubject = new BehaviorSubject<any[]>([]);
  bookings$ = this.bookingsSubject.asObservable();
  private bookingsCache$?: Observable<any>;

  private bookingCountSubject = new BehaviorSubject<number>(0);
  bookingCount$ = this.bookingCountSubject.asObservable();

  private bookingAddedSubject = new Subject<any>();
  bookingAdded$ = this.bookingAddedSubject.asObservable();

  private bookingUpdatedSubject = new BehaviorSubject<void>(undefined);
  bookingUpdated$ = this.bookingUpdatedSubject.asObservable();

  private agentBookingCountSubject = new BehaviorSubject<number>(0);
  agentBookingCount$ = this.agentBookingCountSubject.asObservable();
  hubConnection: any;

  constructor(private _http: HttpClient) {}

  connectSignalRAfterLogin() {
    if (this.hubConnection) return;
    this.startConnection();
  }
  disconnectSignalR() {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.hubConnection = null;
    }
  }

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

    this.hubConnection.on('ReceiveBookingUpdate', (_data: any) => {
      this.bookingUpdatedSubject.next();
    });
  }

  newBooking(booking: any): Observable<any> {
    const convertTo24Hour = (time12h: string): string => {
      if (!time12h || time12h.trim() === '') return '00:00:00';

      if (time12h.includes('AM') || time12h.includes('PM')) {
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');
        let h = parseInt(hours, 10);

        if (modifier === 'PM' && h < 12) h += 12;
        if (modifier === 'AM' && h === 12) h = 0;

        return `${h.toString().padStart(2, '0')}:${minutes.padStart(
          2,
          '0'
        )}:00`;
      }

      const parts = time12h.split(':');
      if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
      if (parts.length === 3) return time12h;

      return '00:00:00';
    };

    const formatDateOnly = (d: any) => {
      if (!d) return null;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      dt.setHours(12, 0, 0, 0);
      return dt.toISOString().split('T')[0];
    };

    const isExternalBooking =
      typeof booking.externalEmployeeNumber === 'string' &&
      booking.externalEmployeeNumber.trim() !== '';

    const basePayload: any = {
      bookingId: booking.bookingId ?? null,

      customerName: booking.customerName,
      customerNumber: booking.customerNumber ?? '',
      alternateNumber: booking.alternateNumber ?? null,

      bookingDate: formatDateOnly(booking.travelDate ?? booking.bookingDate),
      bookingTime: convertTo24Hour(booking.travelTime),

      from: booking.from ?? null,
      to: booking.to ?? null,
      pax: booking.pax,

      bookingType: booking.bookingType ?? 'Notspecified',
      bookingStatus: 'Pending',

      amount: Number(booking.amount) || 0,
      payment: booking.payment ?? 'Admin',

      vehicleId: isExternalBooking
        ? null
        : booking.vehicleId ?? booking.vehicle,
      userId: isExternalBooking ? null : booking.userId ?? booking.driver,

      travelAgentId: booking.agent ? Number(booking.agent) : null,

      customerWillPay: Number(booking.customerPay) || 0,
      ownerWillPay: isExternalBooking ? 0 : Number(booking.ownerPay) || 0,
      AdvancePay: Number(booking.advancePaid) || 0,

      externalEmployee: isExternalBooking ? booking.externalEmployee : null,
      externalEmployeeNumber: isExternalBooking
        ? booking.externalEmployeeNumber
        : null,
      commissionAmount: isExternalBooking
        ? Number(booking.commissionAmount) || 0
        : null,
    };

    // PACKAGE BOOKING
    if (
      Array.isArray(booking.dayWiseBookings) &&
      booking.dayWiseBookings.length
    ) {
      const payload = {
        ...basePayload,
        dayWiseBookings: booking.dayWiseBookings.map((d: any) => ({
          travelDate: formatDateOnly(d.travelDate),
          from: d.from,
          to: d.to,
          travelTime: convertTo24Hour(d.travelTime),
          bookingType: d.bookingType,
          amount: Number(d.amount) || 0,
        })),
        travelTime: null,
      };

      return this._http.post(`${this.baseUrl}New-Booking`, payload);
    }

    // SINGLE BOOKING
    const payload = {
      ...basePayload,
      dayWiseBookings: [],
    };

    return this._http.post(`${this.baseUrl}New-Booking`, payload);
  }

  loadBookings(): Observable<any> {
    return this._http.get<any>(`${this.baseUrl}View-Bookings`).pipe(
      tap((data) => {
        if (data && data.bookings) {
          this.bookingsSubject.next(data.bookings);
        }
      })
    );
  }

  getBookingsByDate(isoDate: string): Observable<any[]> {
    return this._http.get<any>(`${this.baseUrl}by-date/${isoDate}`).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }

  getVendorBookings(vendorId?: number): Observable<any[]> {
    const params: any = {};

    if (vendorId) {
      params.vendorId = vendorId;
    }

    return this._http.get<any[]>(`${this.baseUrl}vendors/bookings`, { params });
  }

  getExternalEmployees(): Observable<any[]> {
    return this._http.get<any[]>(`${this.baseUrl}externalEmployees`);
  }

  reassignToExternal(payload: any) {
    return this._http.post(`${this.baseUrl}reassign-to-external`, payload);
  }

  settleSettlement(bookingId: number) {
    const payload = {
      bookingId: bookingId,
    };

    return this._http.post(`${this.baseUrl}settle-settlement`, payload);
  }

  updateBookingCount(count: number) {
    this.bookingCountSubject.next(count);
  }
  notifyBookingUpdated() {
    this.bookingUpdatedSubject.next();
  }
  filterBookings(
    filter: any,
    pageNumber: number,
    pageSize: number
  ): Observable<any> {
    return this._http.get(`${this.baseUrl}BookingFilter`, {
      params: {
        particularDate: filter.particularDate || '',
        startDate: filter.startDate || '',
        endDate: filter.endDate || '',
        from: filter.from || '',
        to: filter.to || '',
        status: filter.status || '',
        vehicleId: filter.vehicleId || '',
        userId: filter.userId || '',
        bookingType: filter.bookingType || '',
        travelTime: filter.travelTime || '',
        pageNumber: pageNumber.toString(),
        pageSize: pageSize.toString(),
      },
    });
  }
  updateAgentBookingCount(count: number) {
    this.agentBookingCountSubject.next(count);
  }

  cancelBooking(bookingId: number, selectedDate: string, type: string) {
    return this._http
      .put(`${this.baseUrl}cancel-booking`, {
        bookingId: bookingId,
        selectedDate: selectedDate,
        type: type,
      })
      .pipe(tap(() => this.notifyBookingUpdated()));
  }
}

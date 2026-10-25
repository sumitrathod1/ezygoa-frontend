import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { SILENT_ERRORS } from './error.interceptor';

export interface TripStay {
  name: string;
  lat?: number | null;
  lng?: number | null;
  mapsLink?: string | null;
}

export interface TripSummary {
  tripId: number;
  startDate: string;
  endDate: string;
  stayName: string | null;
  stayLat: number | null;
  stayLng: number | null;
  stayMapsLink: string | null;
  pax: number;
  bookings: number;
}

export interface ReturningCustomer {
  customer: { customersId: number; customerName: string; customerNumber: string } | null;
  trips: TripSummary[];
  looseUpcoming?: number;
}

export interface TripBooking {
  bookingId: number;
  travelDate: string;
  travelTime: string | null;
  returnDate: string | null;
  from: string | null;
  to: string | null;
  endDrop?: string | null;
  startPickup?: string | null;
  fullDayHours?: number | null;
  pax: number;
  amount: number;
  bookingType: string;
  status: string;
  vehicleId: number | null;
  vehicleName: string | null;
  userId: number | null;
  driverName: string | null;
  externalEmployeeId: number | null;
  partnerName: string | null;
  advance: number;
}

export interface TripDetail {
  tripId: number;
  startDate: string;
  endDate: string;
  pax: number;
  notes: string | null;
  stayName: string | null;
  stayLat: number | null;
  stayLng: number | null;
  stayMapsLink: string | null;
  customer: { customersId: number; customerName: string; customerNumber: string } | null;
  bookings: TripBooking[];
  total: number;
  advance: number;
  balance: number;
}

const unwrap = <T>(r: any): T => (r && typeof r === 'object' && 'data' in r ? r.data : r) as T;

/** Trips: a customer's multi-day visit — its bookings and the hotel entered once. */
@Injectable({ providedIn: 'root' })
export class TripService {
  private baseUrl = `${environment.apiUrl}/Trip/`;

  constructor(private _http: HttpClient) {}

  /** Returning-customer lookup while typing a phone number (quiet on failure). */
  byCustomer(phone: string): Observable<ReturningCustomer> {
    return this._http
      .get<any>(`${this.baseUrl}by-customer`, { params: { phone }, context: new HttpContext().set(SILENT_ERRORS, true) })
      .pipe(map((r) => unwrap<ReturningCustomer>(r)));
  }

  get(tripId: number): Observable<TripDetail> {
    return this._http.get<any>(`${this.baseUrl}${tripId}`).pipe(map((r) => unwrap<TripDetail>(r)));
  }

  updateStay(tripId: number, stay: TripStay | null): Observable<any> {
    return this._http.put<any>(`${this.baseUrl}${tripId}/stay`, stay ?? { name: null }).pipe(map((r) => unwrap<any>(r)));
  }

  assignAll(tripId: number, change: { userId?: number | null; vehicleId?: number | null }): Observable<{
    updated: number; warnings: string[]; skipped: string[];
  }> {
    return this._http
      .post<any>(`${this.baseUrl}${tripId}/assign-all`, { userId: change.userId ?? null, vehicleId: change.vehicleId ?? null })
      .pipe(map((r) => unwrap<any>(r)));
  }
}

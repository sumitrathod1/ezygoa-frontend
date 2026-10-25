import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

/** A self-drive rental — with one of our cars or a partner's car. */
export interface RentalRow {
  bookingId: number;
  pickupDate: string;
  pickupTime: string | null;
  returnDate: string;
  returnTime: string | null;
  days: number;
  pickupLocation: string | null;
  returnLocation: string | null;
  pax: number;
  amount: number;
  paid: number;
  balance: number;
  securityDeposit: number | null;
  status: string;
  /** upcoming | out | overdue | returned */
  state: 'upcoming' | 'out' | 'overdue' | 'returned';
  vehicleId: number | null;
  vehicleName: string | null;
  vehicleNumber: string | null;
  externalEmployeeId: number | null;
  partnerName: string | null;
  partnerNumber: string | null;
  commission: number | null;
  cashWithPartner: boolean;
  customerName: string | null;
  customerNumber: string | null;
  tripId: number | null;
  travelAgentId: number | null;
}

const unwrap = <T>(r: any): T => (r && typeof r === 'object' && 'data' in r ? r.data : r) as T;

@Injectable({ providedIn: 'root' })
export class RentalService {
  private baseUrl = `${environment.apiUrl}/Rental`;

  constructor(private _http: HttpClient) {}

  list(): Observable<RentalRow[]> {
    return this._http.get<any>(this.baseUrl).pipe(map((r) => unwrap<RentalRow[]>(r) ?? []));
  }

  markReturned(bookingId: number): Observable<any> {
    return this._http.post<any>(`${this.baseUrl}/${bookingId}/returned`, {});
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { RentalRate, RentalRateUpsertDTO } from '../models/rental-rate.model';

const API = `${environment.apiUrl}/rentalrates`;

@Injectable({ providedIn: 'root' })
export class RentalRatesService {
  constructor(private _http: HttpClient) {}

  getAll(includeInactive = false): Observable<RentalRate[]> {
    const params: Record<string, string> = {};
    if (includeInactive) params['includeInactive'] = 'true';
    return this._http.get<any>(API, { params }).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }

  getById(id: number): Observable<RentalRate> {
    return this._http.get<any>(`${API}/${id}`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  create(dto: RentalRateUpsertDTO): Observable<RentalRate> {
    return this._http.post<any>(API, dto).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  update(id: number, dto: RentalRateUpsertDTO): Observable<RentalRate> {
    return this._http.put<any>(`${API}/${id}`, dto).pipe(
      map((res: any) => res?.data ?? res)
    );
  }
}

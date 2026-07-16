import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { RouteRate, RouteRateUpsertDTO, QuoteResult } from '../models/route-rate.model';

const API = `${environment.apiUrl}/routerates`;

@Injectable({ providedIn: 'root' })
export class RouteRatesService {
  constructor(private _http: HttpClient) {}

  getAll(params: {
    fromPlaceId?: number;
    toPlaceId?: number;
    vehicleType?: string;
    includeInactive?: boolean;
  } = {}): Observable<RouteRate[]> {
    const p: any = {};
    if (params.fromPlaceId)    p['fromPlaceId']    = params.fromPlaceId;
    if (params.toPlaceId)      p['toPlaceId']      = params.toPlaceId;
    if (params.vehicleType)    p['vehicleType']    = params.vehicleType;
    if (params.includeInactive) p['includeInactive'] = 'true';
    return this._http.get<any>(API, { params: p }).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.data ?? []))
    );
  }

  getQuote(fromPlaceId: number, toPlaceId: number): Observable<QuoteResult> {
    return this._http.get<any>(`${API}/quote`, {
      params: { fromPlaceId, toPlaceId }
    }).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  getById(id: number): Observable<RouteRate> {
    return this._http.get<any>(`${API}/${id}`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  create(dto: RouteRateUpsertDTO): Observable<RouteRate> {
    return this._http.post<any>(API, dto).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  update(id: number, dto: RouteRateUpsertDTO): Observable<RouteRate> {
    return this._http.put<any>(`${API}/${id}`, dto).pipe(
      map((res: any) => res?.data ?? res)
    );
  }
}

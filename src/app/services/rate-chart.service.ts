import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { RateChart, DEFAULT_RATE_CHART } from '../models/rate-chart.model';

const LS_KEY = 'ezy_rate_charts';
const API = `${environment.apiUrl}/RateChart`;

@Injectable({ providedIn: 'root' })
export class RateChartService {
  constructor(private _http: HttpClient) {}

  getAll(): Observable<RateChart[]> {
    return this._http.get<any>(API).pipe(
      map((res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        const charts = raw.map((r) => this._fromApi(r));
        this._saveToLS(charts);
        return charts;
      }),
      catchError(() => of(this._loadFromLS()))
    );
  }

  getById(id: string): Observable<RateChart | undefined> {
    return this._http.get<any>(`${API}/${id}`).pipe(
      map((res: any) => this._fromApi(res?.data ?? res)),
      catchError(() => {
        const chart = this._loadFromLS().find((c) => c.id === id);
        return of(chart);
      })
    );
  }

  save(chart: RateChart): Observable<RateChart> {
    const payload = this._toApi({ ...chart, updatedAt: new Date().toISOString() });
    const req = chart.id
      ? this._http.put<any>(`${API}/${chart.id}`, payload)
      : this._http.post<any>(API, payload);

    return req.pipe(
      map((res: any) => {
        const saved = this._fromApi(res?.data ?? res);
        this._upsertInLS(saved);
        return saved;
      }),
      catchError(() => {
        this._upsertInLS(chart);
        return of(chart);
      })
    );
  }

  delete(id: string): Observable<void> {
    return this._http.delete<void>(`${API}/${id}`).pipe(
      map(() => { this._deleteFromLS(id); }),
      catchError(() => {
        this._deleteFromLS(id);
        return of(undefined);
      })
    );
  }

  buildNew(templateName = 'New Rate Chart'): RateChart {
    return {
      ...DEFAULT_RATE_CHART,
      id: '',
      templateName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  duplicate(chart: RateChart): RateChart {
    return {
      ...JSON.parse(JSON.stringify(chart)),
      id: '',
      templateName: `${chart.templateName} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  isExpired(chart: RateChart): boolean {
    if (!chart.validTo) return false;
    return new Date(chart.validTo) < new Date();
  }

  isExpiringSoon(chart: RateChart, days = 30): boolean {
    if (!chart.validTo) return false;
    const expiry = new Date(chart.validTo);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return expiry <= threshold && expiry >= new Date();
  }

  // ── API ↔ Frontend mapping ─────────────────────────────────
  private _fromApi(rc: any): RateChart {
    return {
      id: rc.id ?? '',
      templateName: rc.templateName ?? 'Rate Chart',
      agentName: rc.agentName ?? '',
      agentNumber: rc.agentNumber ?? '',
      companyName: rc.companyName ?? 'EZY GOA TRAVELS',
      tagline: rc.tagline ?? '',
      validFrom: rc.validFrom ? rc.validFrom.substring(0, 10) : '',
      validTo: rc.validTo ? rc.validTo.substring(0, 10) : '',
      specialDaysNote: rc.specialDaysNote ?? '',
      locations: rc.locations ?? '',
      vehicles:    this._tryParse(rc.vehiclesJson,   []),
      routes:      this._tryParse(rc.routesJson,     []),
      surcharges:  this._tryParse(rc.surchargesJson, []),
      notes:       this._tryParse(rc.notesJson,      []),
      footer:      this._tryParse(rc.footerJson,     DEFAULT_RATE_CHART.footer),
      currency:    rc.currency    ?? 'INR',
      seasonMode:  rc.seasonMode  ?? 'regular',
      peakSeasonDates: rc.peakSeasonDates ?? '',
      createdAt: rc.createdAt ?? new Date().toISOString(),
      updatedAt: rc.updatedAt ?? new Date().toISOString(),
    };
  }

  private _toApi(chart: RateChart): any {
    return {
      id:              chart.id,
      templateName:    chart.templateName,
      agentName:       chart.agentName,
      agentNumber:     chart.agentNumber,
      companyName:     chart.companyName,
      tagline:         chart.tagline,
      validFrom:       chart.validFrom,
      validTo:         chart.validTo,
      specialDaysNote: chart.specialDaysNote,
      locations:       chart.locations,
      vehiclesJson:    JSON.stringify(chart.vehicles   ?? []),
      routesJson:      JSON.stringify(chart.routes     ?? []),
      surchargesJson:  JSON.stringify(chart.surcharges ?? []),
      notesJson:       JSON.stringify(chart.notes      ?? []),
      footerJson:      JSON.stringify(chart.footer     ?? {}),
      currency:        chart.currency,
      seasonMode:      chart.seasonMode,
      peakSeasonDates: chart.peakSeasonDates,
      createdAt:       chart.createdAt,
      updatedAt:       chart.updatedAt,
    };
  }

  private _tryParse(json: string | null | undefined, fallback: any): any {
    if (!json) return fallback;
    try { return JSON.parse(json); } catch { return fallback; }
  }

  // ── LocalStorage helpers ──────────────────────────────────
  private _loadFromLS(): RateChart[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private _saveToLS(charts: RateChart[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(charts));
  }

  private _upsertInLS(chart: RateChart) {
    const charts = this._loadFromLS();
    const idx = charts.findIndex((c) => c.id === chart.id);
    if (idx >= 0) charts[idx] = chart;
    else {
      if (!chart.id) chart.id = `rc_${Date.now()}`;
      charts.unshift(chart);
    }
    this._saveToLS(charts);
  }

  private _deleteFromLS(id: string) {
    this._saveToLS(this._loadFromLS().filter((c) => c.id !== id));
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditLogRow {
  auditLogId: number;
  createdAt: string;
  userName: string | null;
  action: 'Created' | 'Updated' | 'Deleted';
  entityType: string;
  entityId: string | null;
  bookingId: number | null;
  summary: string;
  changes: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private base = `${environment.apiUrl}/AuditLog`;
  constructor(private _http: HttpClient) {}

  get(params: { bookingId?: number; entityType?: string; from?: string; to?: string; search?: string; page?: number; pageSize?: number } = {}):
    Observable<{ total: number; page: number; pageSize: number; rows: AuditLogRow[] }> {
    const p: any = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p[k] = String(v); });
    return this._http.get<any>(this.base, { params: p });
  }
}

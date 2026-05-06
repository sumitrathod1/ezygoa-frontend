import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/Salary`;

@Injectable({ providedIn: 'root' })
export class SalaryService {
  constructor(private _http: HttpClient) {}

  getAll(): Observable<any[]> {
    return this._http.get<any>(API).pipe(
      map((res) => Array.isArray(res) ? res : (res?.data ?? [])),
      catchError(() => of([]))
    );
  }

  getByUser(userId: number): Observable<any[]> {
    return this._http.get<any>(`${API}/user/${userId}`).pipe(
      map((res) => Array.isArray(res) ? res : (res?.data ?? [])),
      catchError(() => of([]))
    );
  }

  create(salary: any): Observable<any> {
    return this._http.post<any>(API, salary).pipe(
      map((res) => res?.data ?? res)
    );
  }

  generateMonth(month: number, year: number): Observable<any[]> {
    return this._http.post<any>(`${API}/generate?month=${month}&year=${year}`, {}).pipe(
      map((res) => Array.isArray(res) ? res : (res?.data ?? [])),
      catchError(() => of([]))
    );
  }

  markPaid(id: number, notes?: string): Observable<any> {
    const q = notes ? `?notes=${encodeURIComponent(notes)}` : '';
    return this._http.put<any>(`${API}/${id}/pay${q}`, {}).pipe(
      map((res) => res?.data ?? res)
    );
  }
}

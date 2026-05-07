import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = `${environment.apiUrl}/Dashboard`;

  constructor(private http: HttpClient) {}

  getCalendarSummary(month: number, year: number): Observable<any> {
    return this.http.get<any>(`${this.base}/calendar-summary`, {
      params: { month: month.toString(), year: year.toString() }
    });
  }

  getExpenseSummary(month: number, year: number): Observable<any> {
    return this.http.get<any>(`${this.base}/expense-summary`, {
      params: { month: month.toString(), year: year.toString() }
    });
  }
}

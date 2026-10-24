import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BusinessExpense {
  businessExpenseId: number;
  expenseDate: string;
  amount: number;
  category: string;
  platform: string | null;
  campaignName: string | null;
  description: string | null;
  paymentMethod: string | null;
}

export type BusinessExpenseInput = Omit<BusinessExpense, 'businessExpenseId'>;

@Injectable({ providedIn: 'root' })
export class BusinessExpenseService {
  private base = `${environment.apiUrl}/BusinessExpenses`;
  constructor(private _http: HttpClient) {}

  list(params: { from?: string; to?: string; category?: string; platform?: string } = {}): Observable<BusinessExpense[]> {
    const p: any = {};
    Object.entries(params).forEach(([k, v]) => { if (v) p[k] = v; });
    return this._http.get<BusinessExpense[]>(this.base, { params: p });
  }
  options(): Observable<{ categories: string[]; platforms: string[]; paymentMethods: string[] }> {
    return this._http.get<any>(`${this.base}/options`);
  }
  create(dto: BusinessExpenseInput) { return this._http.post<BusinessExpense>(this.base, dto); }
  update(id: number, dto: BusinessExpenseInput) { return this._http.put<BusinessExpense>(`${this.base}/${id}`, dto); }
  remove(id: number) { return this._http.delete(`${this.base}/${id}`); }

  /** Earned revenue, commission collected/outstanding, expenses, ad spend for a period. */
  earningsSummary(from?: string, to?: string): Observable<any> {
    const p: any = {};
    if (from) p.from = from;
    if (to) p.to = to;
    return this._http.get<any>(`${environment.apiUrl}/Dashboard/earnings-summary`, { params: p });
  }
}

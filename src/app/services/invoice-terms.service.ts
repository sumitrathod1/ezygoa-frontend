import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NightCharge {
  label: string;
  /** "HH:mm" */
  from: string;
  /** "HH:mm" — may be past midnight */
  to: string;
  amount: number;
  /** FullDay | Transfer (airport / station pickup or drop) | All */
  appliesTo: 'FullDay' | 'Transfer' | 'All';
}

export interface ExtraRate {
  category: string;
  perHour: number;
  perKm: number;
}

export interface InvoiceTerms {
  nightCharges: NightCharge[];
  extraRates: ExtraRate[];
  otherTerms: string | null;
}

const unwrap = <T>(r: any): T => (r && typeof r === 'object' && 'data' in r ? r.data : r) as T;

/** Terms & conditions printed on customer invoices (per organisation). */
@Injectable({ providedIn: 'root' })
export class InvoiceTermsService {
  private url = `${environment.apiUrl}/InvoiceTerms`;

  constructor(private _http: HttpClient) {}

  get(): Observable<InvoiceTerms> {
    return this._http.get<any>(this.url).pipe(map((r) => unwrap<InvoiceTerms>(r)));
  }

  save(terms: InvoiceTerms): Observable<InvoiceTerms> {
    return this._http.put<any>(this.url, terms).pipe(map((r) => unwrap<InvoiceTerms>(r)));
  }
}

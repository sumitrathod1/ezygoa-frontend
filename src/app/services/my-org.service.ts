import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SILENT_ERRORS } from './error.interceptor';

export interface MyOrganization {
  orgId: number;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  /** data:image/… — uploaded by the organisation's admin */
  logoUrl: string | null;
}

const unwrap = <T>(r: any): T => (r && typeof r === 'object' && 'data' in r ? r.data : r) as T;

/** The signed-in user's organisation: header name + logo, invoice contact details. */
@Injectable({ providedIn: 'root' })
export class MyOrgService {
  private url = `${environment.apiUrl}/MyOrganization`;
  private orgSubject = new BehaviorSubject<MyOrganization | null>(null);
  /** Latest organisation details (null until loaded). */
  org$ = this.orgSubject.asObservable();
  private loadedFor: string | null = null;

  constructor(private _http: HttpClient) {}

  /** Loads once per login (re-loads when another user signs in). Quiet on failure. */
  load(force = false): void {
    const token = localStorage.getItem('token');
    if (!token || (!force && this.loadedFor === token)) return;
    this.loadedFor = token;
    this._http
      .get<any>(this.url, { context: new HttpContext().set(SILENT_ERRORS, true) })
      .pipe(map((r) => unwrap<MyOrganization>(r)))
      .subscribe({ next: (o) => this.orgSubject.next(o), error: () => (this.loadedFor = null) });
  }

  updateDetails(d: { phone: string | null; email: string | null; address: string | null }): Observable<MyOrganization> {
    return this._http.put<any>(this.url, d).pipe(
      map((r) => unwrap<MyOrganization>(r)),
      tap((o) => this.orgSubject.next(o))
    );
  }

  /** Data URL of the (already shrunk) logo; null removes it. */
  setLogo(logo: string | null): Observable<any> {
    return this._http.put<any>(`${this.url}/logo`, { logo }).pipe(
      tap(() => {
        const cur = this.orgSubject.value;
        if (cur) this.orgSubject.next({ ...cur, logoUrl: logo });
      })
    );
  }
}

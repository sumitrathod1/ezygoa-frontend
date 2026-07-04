import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private baseUrl = `${environment.apiUrl}/Organization`;

  private orgUpdated$ = new Subject<void>();
  orgUpdated = this.orgUpdated$.asObservable();

  constructor(private http: HttpClient) {}

  /** List all organizations (SuperAdmin only) */
  getAll(): Observable<any> {
    return this.http.get(`${this.baseUrl}`);
  }

  /** Get single org by id */
  getById(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  /** Create a new organization */
  create(payload: {
    name: string;
    code?: string;
    email?: string;
    phone?: string;
    address?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}`, payload).pipe(
      tap(() => this.orgUpdated$.next())
    );
  }

  /** Update an existing organization */
  update(id: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, payload).pipe(
      tap(() => this.orgUpdated$.next())
    );
  }

  /** Create the first admin user for an org */
  createAdmin(orgId: number, payload: {
    employeeName?: string;
    userName: string;
    password: string;
    number?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/${orgId}/admin`, payload);
  }

  /** List users inside an org */
  getOrgUsers(orgId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/${orgId}/users`);
  }
}

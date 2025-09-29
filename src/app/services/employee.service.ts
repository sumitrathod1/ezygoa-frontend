import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  //private baseUrl: string = 'https://localhost:7183/api/User/';
  baseUrl: string =
    'https://ezytravel-axengwe4fzgtehg0.centralus-01.azurewebsites.net/api/User/';

  private employeeCountSubject = new BehaviorSubject<number>(0);
  employeCount$ = this.employeeCountSubject.asObservable();

  private employeUpdatedSubject = new Subject<void>();
  employeeUpdated$ = this.employeUpdatedSubject.asObservable();

  private userRoleSubject = new BehaviorSubject<string | null>(null);
  public userRole$ = this.userRoleSubject.asObservable();

  constructor(private _http: HttpClient, private router: Router) {
    this.updateUserRole();
  }

  addEmployee(employees: any): Observable<any> {
    const emp = {
      ...employees,
      EmployeeDOB: employees.DOB
        ? new Date(employees.DOB).toISOString().split('T')[0]
        : null,

      Role: employees.Role === 'Admin' ? 1 : 0,
      Licence:
        employees.Licence === 'LMVC'
          ? 0
          : employees.Licence === 'Badge'
          ? 1
          : employees.Licence === 'HeavyBadge'
          ? 2
          : null,
    };

    return this._http.post(`${this.baseUrl}Register`, emp).pipe(
      tap(() => {
        this.employeUpdatedSubject.next();
      })
    );
  }

  getAllEmployees(): Observable<any> {
    return this._http.get(`${this.baseUrl}getall-Users`);
  }

  updateEmployeeCount(count: number) {
    this.employeeCountSubject.next(count);
  }

  loginUser(data: any): Observable<any> {
    return this._http.post(`${this.baseUrl}authenticate`, data);
  }

  storeTokan(tokenValue: string) {
    localStorage.setItem('token', tokenValue);
    this.updateUserRole();
  }

  getToken() {
    return localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    this.userRoleSubject.next(null);
    this.router.navigate(['/login']);
  }

  isloggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
  decodeToken() {
    const jwthlper = new JwtHelperService();
    const token = this.getToken()!;
    return jwthlper.decodeToken(token);
  }

  updateUserRole() {
    const token = this.getToken();
    if (token) {
      const helper = new JwtHelperService();
      const decodedToken = helper.decodeToken(token);
      const role =
        decodedToken[
          'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
        ];
      this.userRoleSubject.next(role);
    } else {
      this.userRoleSubject.next(null);
    }
  }
  getRoleFromToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const decoded = new JwtHelperService().decodeToken(token);
    return (
      decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
      null
    );
  }

  getUserIdFromToken(): string | null {
    const decoded = this.decodeToken();
    return decoded
      ? decoded[
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
        ] || null
      : null;
  }
  getEmployeeBookings(): Observable<any> {
    const id = this.getUserIdFromToken();
    // const dumyID = 2;
    if (!id) throw new Error('User ID not found in token');
    // return this._http.get(`${this.baseUrl}ViewBookings`, {
    //   params: { id},
    // });

    return this._http.get(`${this.baseUrl}ViewBookings`, { params: { id } });
  }
}

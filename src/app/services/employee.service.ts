import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import { BookingService } from './booking.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  baseUrl: string = `${environment.apiUrl}/User/`;

  private employeeCountSubject = new BehaviorSubject<number>(0);
  employeCount$ = this.employeeCountSubject.asObservable();

  private employeUpdatedSubject = new Subject<void>();
  employeeUpdated$ = this.employeUpdatedSubject.asObservable();

  private userRoleSubject = new BehaviorSubject<string | null>(null);
  public userRole$ = this.userRoleSubject.asObservable();

  constructor(
    private _http: HttpClient,
    private router: Router,
    private bookingService: BookingService
  ) {
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

  getUserById(id: number): Observable<any> {
    return this._http.get(`${this.baseUrl}get-user`, { params: { id } });
  }

  getDeletedEmployees(): Observable<any> {
    return this._http.get(`${this.baseUrl}getall-deleted`);
  }

  deleteEmployee(id: number): Observable<any> {
    return this._http.delete(`${this.baseUrl}${id}`).pipe(
      tap(() => this.employeUpdatedSubject.next())
    );
  }

  restoreEmployee(id: number): Observable<any> {
    return this._http.post(`${this.baseUrl}restore/${id}`, {}).pipe(
      tap(() => this.employeUpdatedSubject.next())
    );
  }

  getAvailableDrivers(date: string): Observable<any> {
    return this._http.get(`${this.baseUrl}available`, { params: { date } });
  }

  getAvailableVehicles(date: string): Observable<any> {
    return this._http.get(`${environment.apiUrl}/Vehicle/available`, { params: { date } });
  }

  updateEmployee(id: string | number, data: any): Observable<any> {
    const emp: any = {
      EmployeeName:   data.EmployeeName,
      UserName:       data.UserName,
      Address:        data.Address    ?? null,
      Email:          data.Email      ?? null,
      Number:         data.Number     ?? null,
      BankAccount:    data.BankAccount?? null,
      EmployeeDOB:    data.DOB ? new Date(data.DOB).toISOString().split('T')[0] : null,
      Role:           data.Role === 'Admin' ? 1 : 0,
      Licence:        data.Licence === 'LMVC' ? 0 : data.Licence === 'Badge' ? 1 : data.Licence === 'HeavyBadge' ? 2 : null,
      Salary:         data.Salary         ?? 0,
      SalaryDay:      data.SalaryDay      ?? 1,
      IsSalaryActive: data.IsSalaryActive ?? false,
    };
    if (data.Password) emp.Password = data.Password;
    return this._http.put(`${this.baseUrl}Update/${id}`, emp).pipe(
      tap(() => this.employeUpdatedSubject.next())
    );
  }

  updateEmployeeCount(count: number) {
    this.employeeCountSubject.next(count);
  }

  loginUser(data: any): Observable<any> {
    return this._http.post(`${this.baseUrl}authenticate`, data);
  }

  changePassword(data: any): Observable<any> {
    const pasData = {
      UserName: data.UserName,
      OldPassword: data.oldPassword,
      NewPassword: data.newPassword,
    };
    return this._http.post(`${this.baseUrl}changePassword`, pasData);
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
    this.bookingService.disconnectSignalR();
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

  forgotPassword(data: { email: string }) {
    return this._http.post(`${this.baseUrl}forgot-password`, data);
  }

  resetPassword(data: { email: string; otp: string; newPassword: string }) {
    return this._http.post(`${this.baseUrl}reset-password`, data);
  }
}

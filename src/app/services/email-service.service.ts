import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EmailServiceService {
  private baseUrl = `${environment.apiUrl}/Inquiry/`;
  private hubUrl = `${environment.signalRUrl}/notificationHub`;

  private hubConnection!: signalR.HubConnection;
  private emailUpdatedSubject = new Subject<void>();
  emailUpdated$ = this.emailUpdatedSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private _http: HttpClient) {
    this.startSignalRConnection();
    this.refreshCount();
  }

  private startSignalRConnection(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        // FIX: was 'jwtToken' — correct key is 'token'
        accessTokenFactory: () => localStorage.getItem('token') || '',
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {})
      .catch(() => {});

    this.hubConnection.on('ReceiveNotification', () => {
      this.refreshCount();
      this.emailUpdatedSubject.next();
    });

    this.hubConnection.onclose(() => {
      setTimeout(() => this.startSignalRConnection(), 5000);
    });
  }

  getAllAgents() {
    return this._http.get(`${this.baseUrl}GetAllEnqueries`);
  }

  confirmInquiry(id: number) {
    return this._http
      .post(`${this.baseUrl}confirm/${id}`, {})
      .pipe(tap(() => this.emailUpdatedSubject.next()));
  }

  rejectInquiry(id: number) {
    return this._http
      .post(`${this.baseUrl}reject/${id}`, {}, { responseType: 'text' })
      .pipe(tap(() => this.emailUpdatedSubject.next()));
  }

  getNotification(): Observable<any[]> {
    return this._http.get<any[]>(`${this.baseUrl}notifications`).pipe(
      tap((res) => {
        const count = res.filter((n) => !n.isRead).length;
        this.unreadCountSubject.next(count);
      })
    );
  }

  refreshCount() {
    this.getNotification().subscribe();
  }

  markNotificationRead(id: number) {
    return this._http
      .put(`${this.baseUrl}notifications/mark-read/${id}`, {})
      .pipe(tap(() => this.refreshCount()));
  }

  markAllNotificationsRead() {
    return this._http
      .put(`${this.baseUrl}notifications/mark-all-read`, {})
      .pipe(tap(() => this.refreshCount()));
  }
}
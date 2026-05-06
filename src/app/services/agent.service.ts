import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AgentService {
  baseUrl: string = `${environment.apiUrl}/TravelAgents/`;

  private agentCountSubject = new BehaviorSubject<number>(0);
  agentCount$ = this.agentCountSubject.asObservable();

  private agentUpdatedSubject = new Subject<void>();
  agentUpdated$ = this.agentUpdatedSubject.asObservable();

  constructor(private _http: HttpClient) {}

  public getAllAgents(): Observable<any> {
    return this._http.get(`${this.baseUrl}GetAllAgent`);
  }

  public getBookingByAgentsID(id: number): Observable<any> {
    return this._http.get(`${this.baseUrl}${id}`);
  }

  public addAgetn(agent: any): Observable<any> {
    return this._http.post(`${this.baseUrl}AddAgent`, agent).pipe(
      tap((res: any) => {
        this.agentUpdatedSubject.next();
      })
    );
  }

  public updateAgent(id: number, agent: any): Observable<any> {
    return this._http.put(`${this.baseUrl}${id}`, agent).pipe(
      tap(() => this.agentUpdatedSubject.next())
    );
  }

  public addPayment(paymentData: any): Observable<any> {
    return this._http.post(`${this.baseUrl}ApplyAgentPayment`, paymentData);
  }

  public downloadAgentReport(id: number, fromDateStr: any, toDateStr: any) {
    let url = `${this.baseUrl}ExportAgentBookingsPdf/${id}`;

    const params: any = {};
    if (fromDateStr) params.fromDate = fromDateStr;
    if (toDateStr) params.toDate = toDateStr;

    return this._http.get(url, {
      params,
      responseType: 'blob',
    });
  }
}

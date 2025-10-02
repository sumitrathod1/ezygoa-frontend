import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AgentService {
  //baseUrl: string = 'https://localhost:7183/api/TravelAgents/';
  baseUrl: string =
    'https://ezytravel-axengwe4fzgtehg0.centralus-01.azurewebsites.net/api/TravelAgents/';

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

  public addPayment(paymentData: any): Observable<any> {
    console.log('Payment data to be sent:', paymentData);
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

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EmailServiceService {
  //private baseUrl: string = 'https://localhost:7183/api/Inquiry/';
  baseUrl: string =
    'https://ezytravel-axengwe4fzgtehg0.centralus-01.azurewebsites.net/api/Inquiry/';

  private emailUpdatedSubject = new Subject<void>();
  emailUpdated$ = this.emailUpdatedSubject.asObservable();

  constructor(private _http: HttpClient) {}
  public getAllAgents(): any {
    return this._http.get(`${this.baseUrl}GetAllEnqueries`);
  }

  confirmInquiry(id: number) {
    console.log(id);
    return this._http.post(`${this.baseUrl}confirm/${id}`, {}).pipe(
      tap((res: any) => {
        this.emailUpdatedSubject.next();
      })
    );
  }

  rejectInquiry(id: number) {
    return this._http
      .post(`${this.baseUrl}reject/${id}`, {}, { responseType: 'text' })
      .pipe(
        tap(() => {
          this.emailUpdatedSubject.next();
        })
      );
  }
}

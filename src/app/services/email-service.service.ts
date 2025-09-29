import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EmailServiceService {
  //private baseUrl: string = 'https://localhost:7183/api/Inquiry/';
  baseUrl: string =
    'https://ezytravel-axengwe4fzgtehg0.centralus-01.azurewebsites.net/api/Inquiry/';

  constructor(private _http: HttpClient) {}
  public getAllAgents(): any {
    return this._http.get(`${this.baseUrl}GetAllEnqueries`);
  }

  confirmInquiry(id: number) {
    console.log(id);
    return this._http.post(`${this.baseUrl}confirm/${id}`, {});
  }
}

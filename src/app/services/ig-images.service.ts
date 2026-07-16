import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const API = `${environment.apiUrl}/ig-images`;

export interface IgImage {
  name: string;
  url: string;
  sizeKb: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class IgImagesService {
  constructor(private _http: HttpClient) {}

  private headers(key: string): HttpHeaders {
    return new HttpHeaders({ 'X-Upload-Key': key });
  }

  getAll(key: string): Observable<IgImage[]> {
    return this._http.get<any>(API, { headers: this.headers(key) }).pipe(
      map((res: any) => (Array.isArray(res) ? res : (res?.data ?? [])))
    );
  }

  upload(key: string, file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this._http
      .post<any>(API, form, { headers: this.headers(key) })
      .pipe(map((res: any) => res?.data ?? res));
  }
}

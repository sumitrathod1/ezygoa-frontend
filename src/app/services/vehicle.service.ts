import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  //baseUrl: string = 'https://localhost:7183/api/Vehicle/';
  baseUrl: string =
    'https://ezytravel-axengwe4fzgtehg0.centralus-01.azurewebsites.net/api/Vehicle/';

  private vehicleUpdatedSubject = new Subject<void>();
  vehicleUpdated$ = this.vehicleUpdatedSubject.asObservable();

  constructor(private _http: HttpClient) {}

  getAllVehicles() {
    return this._http.get(`${this.baseUrl}GetallVehicles`);
  }

  getAllExpences() {
    return this._http.get(`${this.baseUrl}GetAllexpence`);
  }

  getAllDocuments() {
    return this._http.get(`${this.baseUrl}GetAllDocuments`);
  }
  getAllMaintenances() {
    return this._http.get(`${this.baseUrl}GetVehicleMaintenance`);
  }

  addMaintenance(data: any) {
    return this._http.post(`${this.baseUrl}AddVechicleMaintenance`, data);
  }

  addExpence(data: any) {
    return this._http.post(`${this.baseUrl}AddVehicleExpence`, data);
  }

  addDocument(data: any) {
    return this._http.post(`${this.baseUrl}AddDocumentDetails`, data);
  }

  addVehicle(data: any) {
    return this._http.post(`${this.baseUrl}AddVehcle`, data).pipe(
      tap((res: any) => {
        this.vehicleUpdatedSubject.next();
      })
    );
  }
}

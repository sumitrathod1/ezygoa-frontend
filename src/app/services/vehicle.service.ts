import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  baseUrl: string = `${environment.apiUrl}/Vehicle/`;

  private vehicleUpdatedSubject = new Subject<void>();
  vehicleUpdated$ = this.vehicleUpdatedSubject.asObservable();

  constructor(private _http: HttpClient) {}

  getAllVehicles() {
    return this._http.get(`${this.baseUrl}GetallVehicles`);
  }

  getAllExpences() {
    return this._http.get(`${this.baseUrl}GetAllexpence`);
  }

  getFilteredExpenses(params?: { vehicleId?: number; type?: string; startDate?: string; endDate?: string }) {
    return this._http.get(`${this.baseUrl}GetFilteredExpenses`, { params: params as any });
  }

  getCombinedExpenses(params?: { vehicleId?: number; type?: string; startDate?: string; endDate?: string }) {
    return this._http.get<any[]>(`${this.baseUrl}GetCombinedExpenses`, { params: params as any });
  }

  getExpenseSummary(params?: { vehicleId?: number; startDate?: string; endDate?: string }) {
    return this._http.get<any>(`${this.baseUrl}GetExpenseSummary`, { params: params as any });
  }

  updateExpense(id: number, data: any) {
    return this._http.put(`${this.baseUrl}UpdateExpense/${id}`, data);
  }

  deleteExpense(id: number) {
    return this._http.delete(`${this.baseUrl}DeleteExpense/${id}`);
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

  updateDocument(data: any) {
    return this._http.put(`${this.baseUrl}UpdateDocument`, data);
  }

  deleteDocument(id: number) {
    return this._http.delete(`${this.baseUrl}DeleteDocument/${id}`);
  }

  addVehicle(data: any) {
    return this._http.post(`${this.baseUrl}AddVehcle`, data).pipe(
      tap((res: any) => {
        this.vehicleUpdatedSubject.next();
      })
    );
  }

  updateVehicle(data: any) {
    return this._http.put(`${this.baseUrl}UpdateVehicle`, data).pipe(
      tap(() => this.vehicleUpdatedSubject.next())
    );
  }
}

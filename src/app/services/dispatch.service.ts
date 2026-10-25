import { HttpClient, HttpContext } from '@angular/common/http';
import { SILENT_ERRORS } from './error.interceptor';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BoardBooking {
  bookingId: number;
  travelDate: string;
  returnDate: string | null;
  travelTime: string | null;
  from: string | null;
  to: string | null;
  pax: number;
  amount: number;
  bookingType: string;
  status: string;
  customerName: string | null;
  customerNumber: string | null;
  vehicleId: number | null;
  vehicleName: string | null;
  vehicleNumber: string | null;
  userId: number | null;
  driverName: string | null;
  needsDriver: boolean;
  fullyAssigned: boolean;
  isOpen: boolean;
  /** Travel date has passed and it still has no driver / vehicle */
  isMissed: boolean;
  transferredFrom: string | null;
  /** Trip (multi-day package) this booking is part of: "day 2 of 4" */
  tripId?: number | null;
  /** Tour / full day ending with a drop elsewhere */
  endDrop?: string | null;
  startPickup?: string | null;
  fullDayHours?: number | null;
  tripDay?: number | null;
  tripDays?: number | null;
}

export interface BoardDriver { userId: number; name: string; number: string | null }
export interface BoardVehicle {
  vehicleId: number; vehicleName: string | null; vehicleNumber: string | null;
  vehicleType: string; seatingcapacity: number; rentalOnly: boolean;
}

export interface AssignmentBoard {
  from: string; to: string;
  bookings: BoardBooking[];
  drivers: BoardDriver[];
  vehicles: BoardVehicle[];
}

export interface PendingAssignmentCount {
  total: number; today: number; tomorrow: number; later: number; nextDate: string | null;
  /** Past (last 14 days) bookings that never got a driver / vehicle */
  missed: number;
}

export interface AssignResult {
  bookingId: number;
  vehicleId: number | null; vehicleName: string | null;
  userId: number | null; driverName: string | null;
  status: string; fullyAssigned: boolean;
  warnings: string[];
}

export interface TransferTarget { orgId: number; name: string; code: string }

export interface TransferResult {
  bookingId: number; fromOrgName: string; toOrgId: number; toOrgName: string; summary: string;
}

const unwrap = <T>(res: any): T => (res && typeof res === 'object' && 'data' in res ? res.data : res) as T;

/** Driver / vehicle assignment after booking, the header "to assign" badge, and transfers. */
@Injectable({ providedIn: 'root' })
export class DispatchService {
  private baseUrl = `${environment.apiUrl}/Booking/`;

  private pendingSubject = new BehaviorSubject<PendingAssignmentCount | null>(null);
  /** Latest "still to assign" count; refreshed by refreshPending(). */
  pending$ = this.pendingSubject.asObservable();

  constructor(private _http: HttpClient) {}

  private silent() {
    return new HttpContext().set(SILENT_ERRORS, true);
  }

  getBoard(from: string, to: string): Observable<AssignmentBoard> {
    return this._http
      .get<any>(`${this.baseUrl}assignment-board`, { params: { from, to } })
      .pipe(map((r) => unwrap<AssignmentBoard>(r)));
  }

  refreshPending(): Observable<PendingAssignmentCount> {
    return this._http.get<any>(`${this.baseUrl}pending-assignment-count`, { context: this.silent() }).pipe(
      map((r) => unwrap<PendingAssignmentCount>(r)),
      tap((c) => this.pendingSubject.next(c))
    );
  }

  assign(
    bookingId: number,
    change: { vehicleId?: number | null; userId?: number | null; clearVehicle?: boolean; clearDriver?: boolean }
  ): Observable<AssignResult> {
    return this._http
      .put<any>(`${this.baseUrl}${bookingId}/assign`, {
        vehicleId: change.vehicleId ?? null,
        userId: change.userId ?? null,
        clearVehicle: !!change.clearVehicle,
        clearDriver: !!change.clearDriver,
      })
      .pipe(
        map((r) => unwrap<AssignResult>(r)),
        tap(() => this.refreshPending().subscribe({ error: () => {} }))
      );
  }

  private targetsCache?: { token: string | null; list$: Observable<TransferTarget[]> };

  /** Linked organisations (cached per login — links change rarely). */
  getTransferTargets(): Observable<TransferTarget[]> {
    const token = localStorage.getItem('token');
    if (!this.targetsCache || this.targetsCache.token !== token) {
      const list$ = this._http.get<any>(`${this.baseUrl}transfer-targets`, { context: this.silent() }).pipe(
        map((r) => unwrap<TransferTarget[]>(r) ?? []),
        catchError((err) => {
          this.targetsCache = undefined;   // retry next time instead of caching the failure
          throw err;
        }),
        shareReplay(1)
      );
      this.targetsCache = { token, list$ };
    }
    return this.targetsCache.list$;
  }

  /** True when this organisation can transfer bookings anywhere (never errors). */
  canTransfer(): Observable<boolean> {
    return this.getTransferTargets().pipe(map((t) => t.length > 0), catchError(() => of(false)));
  }

  transfer(bookingId: number, targetOrgId: number): Observable<TransferResult> {
    return this._http.post<any>(`${this.baseUrl}${bookingId}/transfer`, { targetOrgId }).pipe(
      map((r) => unwrap<TransferResult>(r)),
      tap(() => this.refreshPending().subscribe({ error: () => {} }))
    );
  }
}

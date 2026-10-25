import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** One of our own cars over a period (from GET /Dashboard/fleet) */
export interface FleetVehicle {
  vehicleId: number;
  vehicleName: string | null;
  vehicleNumber: string | null;
  vehicleType: string;
  seats: number;
  trips: number;
  revenue: number;
  expenses: number;
  profit: number;
  fuel: number;
  emi: number;
  repairs: number;
  /** Days the car was out on a trip, up to today */
  busyDays: number;
  /** busyDays as % of the days so far in the period */
  utilisation: number;
  perTrip: number;
  outToday: boolean;
  nextTrip: { bookingId: number; travelDate: string; traveltime: string | null; from: string | null; to: string | null; customerName: string | null } | null;
  serviceDue: { type: string; due: string; daysLeft: number } | null;
  docsDue: number;
}

export interface FleetSummary {
  from: string;
  to: string;
  days: number;
  daysSoFar: number;
  totals: {
    vehicles: number;
    trips: number;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
    perTrip: number;
    utilisation: number;
    unlinked: number;
    previous: { trips: number; revenue: number; expenses: number; profit: number };
    /** % change against the same-length period just before */
    change: { revenue: number; expenses: number; profit: number; trips: number };
  };
  today: { out: number; free: number };
  vehicles: FleetVehicle[];
  byCategory: { category: string; amount: number }[];
  trend: { label: string; year: number; month: number; revenue: number; expenses: number; profit: number }[];
  alerts: {
    documents: { documentID: number; title: string; vehicleID: number | null; vehicleName: string | null; vehicleNumber: string | null; driverName: string | null; expiryDate: string; daysLeft: number }[];
    services: { vehicleID: number; vehicleName: string | null; vehicleNumber: string | null; type: string; due: string; daysLeft: number }[];
  };
}

/** Bookings screen figures (from GET /Dashboard/bookings-overview) */
export interface BookingsOverview {
  from: string;
  to: string;
  days: number;
  totals: {
    bookings: number;
    earned: number;
    gross: number;
    avgFare: number;
    completed: number;
    upcoming: number;
    cancelled: number;
    cancelRate: number;
    customers: number;
    returning: number;
    returningPct: number;
    partnerBookings: number;
    /** Fares of partner bookings (the partner's money) and our commission on them */
    partnerGross: number;
    partnerCommission: number;
    /** Partner bookings with no commission recorded — they add ₹0 to earned */
    partnerNoCommission: number;
    partnerNoCommissionValue: number;
    ownBookings: number;
    transferredIn: number;
    previous: { bookings: number; earned: number };
    change: { bookings: number; earned: number };
  };
  /** Today and the 6 days after; `open` = still needs a car / driver */
  nextDays: { date: string; count: number; open: number }[];
  byType: { type: string; count: number; amount: number }[];
  bySource: { source: string; count: number; amount: number }[];
  byWeekday: { day: string; count: number }[];
  busiestDay: string | null;
  trend: { label: string; year: number; month: number; count: number; earned: number }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = `${environment.apiUrl}/Dashboard`;

  constructor(private http: HttpClient) {}

  /** calendarOnly = just that month's calendar (1 query) — for other months / prefetch, the KPIs don't change */
  getCalendarSummary(month: number, year: number, calendarOnly = false): Observable<any> {
    const params: Record<string, string> = { month: month.toString(), year: year.toString() };
    if (calendarOnly) params['calendarOnly'] = 'true';
    return this.http.get<any>(`${this.base}/calendar-summary`, { params });
  }

  getExpenseSummary(month: number, year: number): Observable<any> {
    return this.http.get<any>(`${this.base}/expense-summary`, {
      params: { month: month.toString(), year: year.toString() }
    });
  }

  /** Bookings overview; no dates = this month so far */
  getBookingsOverview(from?: string, to?: string): Observable<BookingsOverview> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<BookingsOverview>(`${this.base}/bookings-overview`, { params });
  }

  /** Earned revenue, commission, every expense type and net earnings for a period */
  getEarningsSummary(from: string, to: string): Observable<any> {
    return this.http.get<any>(`${this.base}/earnings-summary`, { params: { from, to } });
  }

  /** Fleet KPIs; no dates = this month so far */
  getFleet(from?: string, to?: string, vehicleId?: number | null): Observable<FleetSummary> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    if (vehicleId) params['vehicleId'] = String(vehicleId);
    return this.http.get<FleetSummary>(`${this.base}/fleet`, { params });
  }
}

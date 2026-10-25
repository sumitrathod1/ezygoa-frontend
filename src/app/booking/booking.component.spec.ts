import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { BookingComponent, shortMoney } from './booking.component';
import { testProviders } from '../testing/test-providers';
import { BookingsOverview } from '../services/dashboard.service';
import { periodRange } from '../shared/period-chips/period-chips.component';

const overview = (): BookingsOverview => ({
  from: '2026-10-01', to: '2026-10-26', days: 26,
  totals: {
    bookings: 126, earned: 284500, gross: 391200, avgFare: 3105, completed: 98, upcoming: 21, cancelled: 7, cancelRate: 5,
    customers: 104, returning: 23, returningPct: 22, partnerBookings: 18, transferredIn: 4,
    partnerGross: 60000, partnerCommission: 9000, partnerNoCommission: 0, partnerNoCommissionValue: 0, ownBookings: 108,
    previous: { bookings: 112, earned: 251000 }, change: { bookings: 13, earned: 13 },
  },
  nextDays: Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${26 + i > 31 ? 31 : 26 + i}`, count: i, open: i === 4 ? 2 : 0 })),
  byType: [{ type: 'AirportPickup', count: 60, amount: 150000 }, { type: 'NorthGoaSightseeing', count: 30, amount: 90000 }],
  bySource: [{ source: 'Direct', count: 100, amount: 300000 }, { source: 'Hotel Sea Breeze', count: 26, amount: 91200 }],
  byWeekday: [], busiestDay: 'Saturday',
  trend: [{ label: 'Sep 26', year: 2026, month: 9, count: 112, earned: 251000 }, { label: 'Oct 26', year: 2026, month: 10, count: 126, earned: 284500 }],
});

describe('BookingComponent (bookings overview)', () => {
  let component: BookingComponent;
  let fixture: ComponentFixture<BookingComponent>;
  let http: HttpTestingController;
  const req = () => http.expectOne((r) => r.url.endsWith('/Dashboard/bookings-overview'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BookingComponent], providers: testProviders() }).compileComponents();
    fixture = TestBed.createComponent(BookingComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('loads this month from the server — not every booking — and shows the KPIs', () => {
    const r = req();
    expect(r.request.params.get('from')).toBe(periodRange('month').from);
    r.flush(overview());
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('126');
    expect(text).toContain('Returning customers');
    expect(text).toContain('Saturday');
    expect(text).toContain('Airport Pickup');
    expect(text).toContain('North Goa Sightseeing');
    expect(text).toContain('Hotel Sea Breeze');
    expect(text).toContain('2 to assign');
    http.expectNone((x) => x.url.includes('View-Bookings'));
  });

  it('explains a low "Earned": partner bookings without commission are flagged', () => {
    const d = overview();
    d.totals = { ...d.totals, earned: 0, gross: 1245900, partnerBookings: 401, partnerNoCommission: 401, partnerNoCommissionValue: 1245900, ownBookings: 0 };
    req().flush(d);
    fixture.detectChanges();
    const warn = fixture.nativeElement.querySelector('.bo-warn');
    expect(warn).not.toBeNull();
    expect(warn.textContent).toContain('401 partner bookings');
    expect(warn.textContent).toContain('no commission recorded');
    expect(fixture.nativeElement.textContent).toContain('booking value');
  });

  it('no warning when every partner booking has its commission', () => {
    req().flush(overview());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bo-warn')).toBeNull();
    expect(fixture.nativeElement.querySelector('.bo-info').textContent).toContain('18 with partners');
  });

  it('chart has bookings bars and an earned line on its own axis', () => {
    req().flush(overview());
    expect(component.trendData.datasets.map((d: any) => d.yAxisID)).toEqual(['count', 'money']);
    expect(component.share(60)).toBe(48);
    expect(shortMoney(284500)).toBe('2.8L');
  });

  it('picking another period asks for those dates', () => {
    req().flush(overview());
    component.onPeriod(periodRange('lastMonth'));
    const r = req();
    expect(r.request.params.get('from')).toBe(periodRange('lastMonth').from);
    expect(r.request.params.get('to')).toBe(periodRange('lastMonth').to);
    r.flush(overview());
  });
});

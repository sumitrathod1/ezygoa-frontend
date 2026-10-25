import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { EarningsComponent, previousRange } from './earnings.component';
import { testProviders } from '../../testing/test-providers';

const summary = (k = 1) => ({
  from: '2026-10-01', to: '2026-10-26', grossBookingValue: 391200 * k, ownBookingRevenue: 262300 * k, ownBookings: 108, partnerBookings: 18,
  commissionEarned: 22200 * k, commissionCollected: 15400, commissionOutstanding: 6800, payableToPartners: 12500, earnedRevenue: 284500 * k,
  expenses: { vehicle: 96000, salaries: 20000, advertising: 0, business: 4000, total: 120000 },
  advertising: { total: 0, earnedPerRupeeSpent: null }, netEarnings: 284500 * k - 120000,
  partners: [{ partnerId: 1, name: 'Goa Cabs', bookings: 8, commission: 9800, collected: 7000, outstanding: 2800, weOwe: 0 }],
});

describe('EarningsComponent', () => {
  let component: EarningsComponent;
  let fixture: ComponentFixture<EarningsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EarningsComponent], providers: testProviders() }).compileComponents();
    fixture = TestBed.createComponent(EarningsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  function flushAll(k = 1) {
    const sums = http.match((r) => r.url.endsWith('/Dashboard/earnings-summary'));
    expect(sums.length).toBe(2);
    // first = this period, second = the period before
    sums[0].flush(summary(k));
    sums[1].flush(summary(0.5));
    http.expectOne((r) => r.url.endsWith('/Dashboard/expense-summary')).flush({
      monthlyTrend: [{ label: 'Sep 26', revenue: 200000, expenses: 110000 }, { label: 'Oct 26', revenue: 284500, expenses: 120000 }],
    });
    fixture.detectChanges();
  }

  it('compares this period with the same number of days before', () => {
    const sums = http.match((r) => r.url.endsWith('/Dashboard/earnings-summary'));
    const cur = sums[0].request.params;
    const prev = sums[1].request.params;
    expect(previousRange(cur.get('from')!, cur.get('to')!)).toEqual({ from: prev.get('from')!, to: prev.get('to')! });
    sums.forEach((s) => s.flush(summary()));
    http.expectOne((r) => r.url.endsWith('/Dashboard/expense-summary')).flush({ monthlyTrend: [] });
  });

  it('shows net earnings, how it was earned and where it went', () => {
    flushAll();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Net earnings');
    expect(text).toContain('Partner commission');
    expect(text).toContain('Commission to collect');
    expect(text).toContain('Goa Cabs');
    expect(component.costs.map((c) => c.key)).toEqual(['vehicle', 'salaries', 'business']);  // nothing spent on ads → left out
    expect(component.ownShare).toBe(92);
    expect(component.trendData.datasets.length).toBe(3);
  });

  it('a loss turns the card red', () => {
    flushAll(0.2);
    expect(component.net).toBeLessThan(0);
    expect(fixture.nativeElement.querySelector('.ea-hero.neg')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Net loss');
  });

  it('previousRange', () => {
    expect(previousRange('2026-10-01', '2026-10-31')).toEqual({ from: '2026-08-31', to: '2026-09-30' });
    expect(previousRange('2026-10-20', '2026-10-26')).toEqual({ from: '2026-10-13', to: '2026-10-19' });
  });
});

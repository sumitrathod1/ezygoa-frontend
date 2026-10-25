import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { RentalsComponent } from './rentals.component';
import { testProviders } from '../../testing/test-providers';

describe('RentalsComponent', () => {
  const row = (o: any) => ({
    bookingId: 1, pickupDate: '2026-10-24', pickupTime: '10:00:00', returnDate: '2026-10-26', returnTime: '10:00:00', days: 2,
    pickupLocation: 'Mopa Airport', returnLocation: 'Mopa Airport', pax: 1, amount: 5000, paid: 1000, balance: 4000,
    securityDeposit: 5000, status: 'Assigned', state: 'out', vehicleId: 9, vehicleName: 'Thar', vehicleNumber: 'RENTAL-1',
    externalEmployeeId: null, partnerName: null, partnerNumber: null, commission: null, cashWithPartner: false,
    customerName: 'Arjun', customerNumber: '9886600011', tripId: null, travelAgentId: null, ...o,
  });

  let c: RentalsComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RentalsComponent], providers: testProviders() }).compileComponents();
    const f = TestBed.createComponent(RentalsComponent);
    c = f.componentInstance;
    http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/Rental')).flush({ data: [
      row({ bookingId: 1, state: 'out', returnDate: '2026-10-27' }),
      row({ bookingId: 2, state: 'overdue', returnDate: '2026-10-22' }),
      row({ bookingId: 3, state: 'upcoming', pickupDate: '2026-11-02', returnDate: '2026-11-04' }),
      row({ bookingId: 4, state: 'returned', status: 'Completed', externalEmployeeId: 5, partnerName: 'Shehensha', commission: 800, vehicleId: null }),
    ] });
  });

  it('"Out now" holds cars that are out, overdue ones first', () => {
    expect(c.count('out')).toBe(2);
    expect(c.overdueCount).toBe(1);
    expect(c.visible.map((r) => r.bookingId)).toEqual([2, 1]);
    c.tab = 'upcoming';
    expect(c.visible.map((r) => r.bookingId)).toEqual([3]);
    c.tab = 'returned';
    expect(c.visible.map((r) => r.bookingId)).toEqual([4]);
  });

  it('search finds by customer, car or partner', () => {
    c.tab = 'returned';
    c.search = 'sheh';
    expect(c.visible.length).toBe(1);
    c.search = 'nobody';
    expect(c.visible.length).toBe(0);
  });

  it('"Car returned" marks the rental returned and reloads', () => {
    c.markReturned(c.rentals[0]);
    http.expectOne((r) => r.url.endsWith('/Rental/1/returned') && r.method === 'POST').flush({ message: 'Marked as returned' });
    http.expectOne((r) => r.url.endsWith('/Rental')).flush({ data: [] });
    expect(c.rentals.length).toBe(0);
  });
});

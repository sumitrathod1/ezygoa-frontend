import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { PartnerStatementDialogComponent } from './partner-statement-dialog.component';
import { testProviders } from '../../../testing/test-providers';

describe('PartnerStatementDialogComponent', () => {
  const vendorRows = [
    // partner collected: owes 500 commission, nothing given yet
    { bookingId: 1851, vendorId: 5, customerId: 1, bookingDate: '2026-10-24', customerName: 'Test4321', from: 'Mopa', to: 'Calangute', settlementDirection: 'VendorToOwner', receivedFromVendor: 0, totalPaidToVendor: 0, remaining: 500, bookingStatus: 'Pending' },
    // owes 200, gave 100
    { bookingId: 1852, vendorId: 5, customerId: 2, bookingDate: '2026-10-24', customerName: 'test98123t', from: 'Calangute', to: 'Calangute', settlementDirection: 'VendorToOwner', receivedFromVendor: 100, totalPaidToVendor: 0, remaining: 100, bookingStatus: 'Pending' },
    // we owed the partner and paid it all
    { bookingId: 1853, vendorId: 5, customerId: 1, bookingDate: '2026-10-25', customerName: 'Test4321', from: 'Calangute', to: 'Mopa', settlementDirection: 'OwnerToVendor', receivedFromVendor: 0, totalPaidToVendor: 4500, remaining: 0, bookingStatus: 'Completed' },
  ];

  let c: PartnerStatementDialogComponent;
  let http: HttpTestingController;

  async function open(data: any) {
    await TestBed.configureTestingModule({
      imports: [PartnerStatementDialogComponent],
      providers: [...testProviders(data), { provide: MatDialogRef, useValue: { close: () => {} } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PartnerStatementDialogComponent);
    c = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/Booking/vendors/bookings')).flush(vendorRows);
    fixture.detectChanges();
    return fixture;
  }

  it('lists the partner\'s customers with where each payment stands, newest first', async () => {
    await open({ vendorId: 5, vendorName: 'Shehensha' });
    expect(c.rows.map((r) => r.bookingId)).toEqual([1853, 1852, 1851]);
    expect(c.rows.find((r) => r.bookingId === 1851)!.statusText).toBe('Not paid · ₹500');
    expect(c.rows.find((r) => r.bookingId === 1852)!.statusText).toBe('Part paid ₹100 of ₹200');
    expect(c.rows.find((r) => r.bookingId === 1853)!.status).toBe('paid');
  });

  it('"One customer" groups all bookings of a customer, with a combined status', async () => {
    await open({ vendorId: 5, vendorName: 'Shehensha' });
    expect(c.customers.length).toBe(2);
    const cust = c.customers.find((x) => x.customerId === 1)!;
    expect(cust.bookings.map((b) => b.bookingId)).toEqual([1853, 1851]);
    // owes 500 on #1851 (nothing given) + was owed 4,500 on #1853 (paid) → part paid
    expect(cust.statusText).toBe('Part paid ₹4,500 of ₹5,000');
    expect(c.customers.find((x) => x.customerId === 2)!.statusText).toBe('Part paid ₹100 of ₹200');
  });

  it("opened from a booking: that booking's customer is chosen", async () => {
    await open({ vendorId: 5, vendorName: 'Shehensha', bookingId: 1851 });
    expect(c.scope).toBe('customer');
    expect(c.selectedCustomer?.customerName).toBe('Test4321');
    expect(c.selectedCustomer?.bookings.length).toBe(2);
  });

  it('One customer → asks for all bookings of that customer (not one booking)', async () => {
    await open({ vendorId: 5, vendorName: 'Shehensha' });
    c.setScope('customer');
    c.run('download');
    expect(c.error).toContain('Choose the customer');
    c.selectedCustomerId = 1;
    c.run('download');
    const req = http.expectOne((r) => r.url.endsWith('/Booking/vendors/5/statement'));
    expect(req.request.params.get('customerId')).toBe('1');
    expect(req.request.params.has('bookingId')).toBeFalse();
    expect(req.request.params.has('from')).toBeFalse();
    expect(req.request.params.has('onlyOpen')).toBeFalse();
  });

  it('Between dates → from / to, optionally only bookings not fully paid', async () => {
    await open({ vendorId: 5, vendorName: 'Shehensha' });
    c.setScope('dates');
    c.from = '2026-10-01';
    c.to = '2026-10-31';
    c.onlyOpen = true;
    c.run('download');
    const req = http.expectOne((r) => r.url.endsWith('/Booking/vendors/5/statement'));
    expect(req.request.params.get('from')).toBe('2026-10-01');
    expect(req.request.params.get('to')).toBe('2026-10-31');
    expect(req.request.params.get('onlyOpen')).toBe('true');
    expect(req.request.params.has('bookingId')).toBeFalse();
  });

  it('Whole report → no dates, no booking', async () => {
    await open({ vendorId: 5, vendorName: 'Shehensha' });
    c.setScope('all');
    c.run('download');
    const req = http.expectOne((r) => r.url.endsWith('/Booking/vendors/5/statement'));
    expect(req.request.params.has('from')).toBeFalse();
    expect(req.request.params.has('to')).toBeFalse();
    expect(req.request.params.has('bookingId')).toBeFalse();
  });

  it('search finds a customer by name or by one of their booking numbers', async () => {
    await open({ vendorId: 5, vendorName: 'Shehensha' });
    c.search = 'test98';
    expect(c.filteredCustomers.map((x) => x.customerId)).toEqual([2]);
    c.search = '1853';
    expect(c.filteredCustomers.map((x) => x.customerId)).toEqual([1]);
  });
});

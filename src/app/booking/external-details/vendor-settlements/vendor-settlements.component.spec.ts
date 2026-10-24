import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { VendorSettlementsComponent } from './vendor-settlements.component';
import { BookingService } from '../../../services/booking.service';
import { testProviders } from '../../../testing/test-providers';

const rows = [
  // Partner collected cash: owes us 700 commission, 200 already received
  { bookingId: 1, vendorId: 1, vendorName: 'Shehensha', vendorNumber: '9822100001', customerName: 'Priya', from: 'Mopa', to: 'Baga',
    bookingAmount: 4500, commission: 700, settlementDirection: 'VendorToOwner', ownerReceivable: 700, receivedFromVendor: 200,
    pendingReceivable: 500, vendorPayable: 0, totalPaidToVendor: 0, pendingVendorPayment: 0, remaining: 500, isSettled: false, bookingStatus: 'Pending' },
  // We collected cash: we owe 8000, paid 3000
  { bookingId: 2, vendorId: 2, vendorName: 'Mehbob', vendorNumber: '9822100002', customerName: 'Rahul', from: 'Dabolim', to: 'Margao',
    bookingAmount: 9200, commission: 1200, settlementDirection: 'OwnerToVendor', ownerReceivable: 0, receivedFromVendor: 0,
    pendingReceivable: 0, vendorPayable: 8000, totalPaidToVendor: 3000, pendingVendorPayment: 5000, remaining: 5000, isSettled: false, bookingStatus: 'Pending' },
  // Settled
  { bookingId: 3, vendorId: 1, vendorName: 'Shehensha', vendorNumber: '9822100001', customerName: 'Tom', from: 'Benaulim', to: 'Dudhsagar',
    bookingAmount: 6000, commission: 900, settlementDirection: 'VendorToOwner', ownerReceivable: 900, receivedFromVendor: 900,
    pendingReceivable: 0, vendorPayable: 0, totalPaidToVendor: 0, pendingVendorPayment: 0, remaining: 0, isSettled: true, bookingStatus: 'Completed' },
];

describe('VendorSettlementsComponent', () => {
  let component: VendorSettlementsComponent;
  let fixture: ComponentFixture<VendorSettlementsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorSettlementsComponent],
      providers: testProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(VendorSettlementsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/Booking/vendors/bookings')).flush(rows);
  });

  it('totals use what is STILL due, not the original amounts', () => {
    expect(component.totals.owedToYou).toBe(500);   // not 700
    expect(component.totals.youOwe).toBe(5000);     // not 8000
    expect(component.totals.commission).toBe(2800);
    expect(component.totals.collected).toBe(1100);
  });

  it('filtering by partner gives that partner\'s figures', () => {
    component.selectedVendor = '1';
    component.applyFilters();
    expect(component.vendorBookings.map((b) => b.bookingId)).toEqual([1, 3]);
    expect(component.totals.owedToYou).toBe(500);
    expect(component.totals.youOwe).toBe(0);
    expect(component.selectedVendorId).toBe(1);
  });

  it('search box filters by partner, customer or booking number', () => {
    component.searchText = 'rahul';
    component.applyFilters();
    expect(component.vendorBookings.map((b) => b.bookingId)).toEqual([2]);
    component.searchText = '3';
    component.applyFilters();
    expect(component.vendorBookings.map((b) => b.bookingId)).toContain(3);
  });

  it('cancelled bookings do not count as commission earned', () => {
    component.allVendorBookings = [...rows, { ...rows[0], bookingId: 4, commission: 999, bookingStatus: 'Canceled', isSettled: true, remaining: 0 }];
    component.applyFilters();
    expect(component.totals.commission).toBe(2800);
  });

  it('payment form opens pre-filled with the remaining amount and a fresh request id', () => {
    component.openPayment(rows[1]);
    expect(component.payAmount).toBe(5000);
    expect(component.payMethod).toBe('Cash');
    expect(component.payDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('refuses to record more than is still due (no API call)', () => {
    const dialog = TestBed.inject(MatDialog);
    const openSpy = spyOn(dialog, 'open').and.callThrough();
    const svc = TestBed.inject(BookingService);
    const settleSpy = spyOn(svc, 'settleSettlement').and.returnValue(of({}));

    component.openPayment(rows[0]);
    component.payAmount = 600; // only 500 due
    component.confirmPayment(rows[0]);
    expect(openSpy).not.toHaveBeenCalled();
    expect(settleSpy).not.toHaveBeenCalled();

    component.payAmount = 0;
    component.confirmPayment(rows[0]);
    expect(settleSpy).not.toHaveBeenCalled();
  });

  it('a valid part payment is sent with method, reference, date and a request id', () => {
    const dialog = TestBed.inject(MatDialog);
    spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(true) } as any);
    const svc = TestBed.inject(BookingService);
    const settleSpy = spyOn(svc, 'settleSettlement').and.returnValue(of({}));

    component.openPayment(rows[0]);
    component.payAmount = 300;
    component.payMethod = 'UPI';
    component.payReference = '  UPI-1  ';
    component.confirmPayment(rows[0]);

    const [id, amount, extra] = settleSpy.calls.first().args as any[];
    expect(id).toBe(1);
    expect(amount).toBe(300);
    expect(extra.paymentMethod).toBe('UPI');
    expect(extra.reference).toBe('UPI-1');
    expect(extra.requestId).toBeTruthy();
    expect(settleSpy).toHaveBeenCalledTimes(1);
    expect(component.payingId).toBeNull(); // panel closes after saving
    http.match(() => true).forEach((r) => r.flush([]));
  });
});

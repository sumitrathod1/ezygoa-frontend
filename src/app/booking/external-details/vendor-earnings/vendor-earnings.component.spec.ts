import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorEarningsComponent } from './vendor-earnings.component';
import { testProviders } from '../../../testing/test-providers';

describe('VendorEarningsComponent', () => {
  let component: VendorEarningsComponent;
  let fixture: ComponentFixture<VendorEarningsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorEarningsComponent],
      providers: testProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(VendorEarningsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('pending amounts are what is still due after part payments', () => {
    component.bookings = [
      { bookingAmount: 4500, commission: 700, settlementDirection: 'VendorToOwner', ownerReceivable: 700, remaining: 500, isSettled: false },
      { bookingAmount: 9200, commission: 1200, settlementDirection: 'OwnerToVendor', vendorPayable: 8000, pendingVendorPayment: 5000, remaining: 5000, isSettled: false },
    ];
    component.calculateSummary();
    expect(component.summary.vendorToAdminPending).toBe(500);
    expect(component.summary.adminToVendorPending).toBe(5000);
    expect(component.summary.adminEarned).toBe(1900);
    expect(component.summary.vendorsEarned).toBe(3800 + 8000);
  });

  it('cancelled trips are not counted as earnings', () => {
    component.bookings = [
      { bookingAmount: 4500, commission: 700, settlementDirection: 'VendorToOwner', remaining: 0, isSettled: true, bookingStatus: 'Canceled' },
      { bookingAmount: 3000, commission: 500, settlementDirection: 'VendorToOwner', remaining: 0, isSettled: true },
    ];
    component.calculateSummary();
    expect(component.summary.totalBookings).toBe(1);
    expect(component.summary.adminEarned).toBe(500);
  });
});

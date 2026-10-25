import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { RentalFormComponent } from './rental-form.component';
import { testProviders } from '../../testing/test-providers';

describe('RentalFormComponent', () => {
  let c: RentalFormComponent;
  let http: HttpTestingController;
  let closed: any;

  async function open(data: any = null) {
    closed = undefined;
    await TestBed.configureTestingModule({
      imports: [RentalFormComponent],
      providers: [...testProviders(data), { provide: MatDialogRef, useValue: { close: (v: any) => (closed = v) } }],
    }).compileComponents();
    const f = TestBed.createComponent(RentalFormComponent);
    c = f.componentInstance;
    http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    http.expectOne((r) => r.url.includes('GetallVehicles') && r.params.get('includeRental') === 'true').flush([
      { vehicleId: 1, vehicleName: 'Innova', vehicleNumber: 'GA-01-A-1' },
      { vehicleId: 9, vehicleName: 'Thar', vehicleNumber: 'RENTAL-THAR-1' },
    ]);
    http.expectOne((r) => r.url.toLowerCase().includes('/rentalrates')).flush([{ vehicleId: 9, pricePerDay: 2500, securityDeposit: 5000 }]);
    http.expectOne((r) => r.url.endsWith('/externalEmployees')).flush([{ externalEmployeeName: 'Shehensha', externalEmployeeNumber: '9878979344' }]);
    http.expectOne((r) => r.url.endsWith('/Rental')).flush([
      { bookingId: 70, vehicleId: 9, pickupDate: '2026-11-01', returnDate: '2026-11-03', state: 'upcoming' },
    ]);
    f.detectChanges();
  }

  it('rent-a-car cars come first in the list', async () => {
    await open();
    expect(c.vehicles.map((v) => v.vehicleId)).toEqual([9, 1]);
  });

  it('choosing a car fills price per day and deposit from Rental Rates; total = price × days', async () => {
    await open();
    c.pickupDate = '2026-11-10';
    c.returnDate = '2026-11-13';
    c.vehicleId = 9;
    c.applyRate();
    expect(c.days).toBe(3);
    expect(c.ratePerDay).toBe(2500);
    expect(c.securityDeposit).toBe(5000);
    expect(c.amount).toBe(7500);
    c.advance = 2000;
    expect(c.balance).toBe(5500);
  });

  it('warns when the car is already rented on those days', async () => {
    await open();
    c.pickupDate = '2026-11-02';
    c.returnDate = '2026-11-05';
    expect(c.busyText({ vehicleId: 9 })).toContain('#70');
    c.pickupDate = '2026-11-10';
    c.returnDate = '2026-11-12';
    expect(c.busyText({ vehicleId: 9 })).toBe('');
  });

  it('saves our-car rental as a self-drive booking with return time and deposit', async () => {
    await open();
    Object.assign(c, { customerName: 'Arjun', customerNumber: '9886600011', pickupDate: '2026-11-10', returnDate: '2026-11-12', pickupTime: '09:00 AM', returnTime: '06:30 PM', vehicleId: 9 });
    c.applyRate();
    c.save();
    const body = http.expectOne((r) => r.url.endsWith('/Booking/New-Booking')).request.body;
    expect(body.bookingType).toBe('SelfDriveRental');
    expect(body.vehicleId).toBe(9);
    expect(body.returnDate).toBe('2026-11-12');
    expect(body.returnTime).toBe('18:30:00');
    expect(body.securityDeposit).toBe(5000);
    expect(body.amount).toBe(5000);
    expect(body.externalEmployeeNumber).toBeNull();
  });

  it("partner's car: saved with partner, commission and who collects the cash (no vehicle)", async () => {
    await open();
    Object.assign(c, { customerName: 'Arjun', customerNumber: '9886600011', source: 'partner', partnerName: 'Shehensha', partnerNumber: '9878979344', commission: 800, cashWith: 'ExternalEmployee', amount: 6000, amountEdited: true });
    c.save();
    const body = http.expectOne((r) => r.url.endsWith('/Booking/New-Booking')).request.body;
    expect(body.externalEmployee).toBe('Shehensha');
    expect(body.externalEmployeeNumber).toBe('9878979344');
    expect(body.commissionAmount).toBe(800);
    expect(body.payment).toBe('ExternalEmployee');
    expect(body.vehicleId).toBeNull();
  });

  it('checks the form before saving', async () => {
    await open();
    Object.assign(c, { customerName: '', customerNumber: '123', source: 'partner', partnerName: '', amount: 1000, amountEdited: true });
    c.save();
    http.expectNone((r) => r.url.endsWith('/Booking/New-Booking'));
    const all = c.errors.join(' ');
    expect(all).toContain('Customer name');
    expect(all).toContain('10-digit customer number');
    expect(all).toContain("partner's name");
    expect(all).toContain('commission');
  });

  it('edit fills the form from the rental', async () => {
    await open({ rental: {
      bookingId: 55, customerName: 'Meera', customerNumber: '9886600022', pickupDate: '2026-11-01', pickupTime: '14:30:00',
      returnDate: '2026-11-04', returnTime: '10:00:00', days: 3, amount: 9000, paid: 3000, securityDeposit: 4000,
      vehicleId: 9, externalEmployeeId: null, state: 'upcoming',
    } });
    expect(c.editId).toBe(55);
    expect(c.pickupTime).toBe('02:30 PM');
    expect(c.amount).toBe(9000);
    expect(c.ratePerDay).toBe(3000);
    expect(c.advance).toBe(3000);
  });
});

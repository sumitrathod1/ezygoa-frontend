import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { BookingService } from './booking.service';
import { testProviders } from '../testing/test-providers';

describe('BookingService', () => {
  let service: BookingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    service = TestBed.inject(BookingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('newBooking payload', () => {
    const formPayload = {
      bookingId: 0,
      customerName: 'Priya',
      customerNumber: '9876500001',
      bookingDate: '2026-10-25',
      travelTime: '10:15 PM',
      from: 'Mopa Airport',
      to: 'Calangute',
      pax: 2,
      vehicleId: 3,
      userId: 7,
      bookingType: 'AirportPickup',
      payment: 'Admin',
      travelAgentId: 4,
      customerWillPay: 3500,
      ownerWillPay: 1200,
      amount: 3500,
      advancePaid: 1000,
      returnDate: null,
    };

    function send(payload: any) {
      service.newBooking(payload).subscribe();
      const req = http.expectOne((r) => r.url.endsWith('/Booking/New-Booking'));
      return req;
    }

    it('keeps the travel agent and both "will pay" amounts the form sends', () => {
      const req = send(formPayload);
      expect(req.request.body.travelAgentId).toBe(4);
      expect(req.request.body.customerWillPay).toBe(3500);
      expect(req.request.body.ownerWillPay).toBe(1200);
      expect(req.request.body.AdvancePay).toBe(1000);
      req.flush({});
    });

    it('still accepts the older agent / customerPay / ownerPay names', () => {
      const req = send({ ...formPayload, travelAgentId: undefined, customerWillPay: undefined, ownerWillPay: undefined, agent: 9, customerPay: 50, ownerPay: 60 });
      expect(req.request.body.travelAgentId).toBe(9);
      expect(req.request.body.customerWillPay).toBe(50);
      expect(req.request.body.ownerWillPay).toBe(60);
      req.flush({});
    });

    it('converts the picker time to 24h', () => {
      const req = send(formPayload);
      expect(req.request.body.bookingTime).toBe('22:15:00');
      req.flush({});
    });

    for (const [input, expected] of [['12:00 AM', '00:00:00'], ['12:30 PM', '12:30:00'], ['01:05 AM', '01:05:00'], ['18:45:00', '18:45:00'], ['09:30', '09:30:00']]) {
      it(`time "${input}" is sent as ${expected}`, () => {
        const req = send({ ...formPayload, travelTime: input });
        expect(req.request.body.bookingTime).toBe(expected);
        req.flush({});
      });
    }

    it('does not force a status, so editing keeps Completed / Assigned', () => {
      const req = send(formPayload);
      expect(req.request.body.bookingStatus).toBeNull();
      req.flush({});
    });

    it('forwards the self-drive return date', () => {
      const req = send({ ...formPayload, bookingType: 'SelfDriveRental', returnDate: '2026-10-28' });
      expect(req.request.body.returnDate).toBe('2026-10-28');
      req.flush({});
    });

    it('never sends a vehicle, driver or owner amount for a partner booking', () => {
      const req = send({ ...formPayload, externalEmployee: 'Shehensha', externalEmployeeNumber: '9822100001', commissionAmount: 700 });
      expect(req.request.body.vehicleId).toBeNull();
      expect(req.request.body.userId).toBeNull();
      expect(req.request.body.ownerWillPay).toBe(0);
      expect(req.request.body.commissionAmount).toBe(700);
      req.flush({});
    });
  });

  it('settleSettlement sends amount, method, reference, date and request id', () => {
    service.settleSettlement(12, 300, { paymentMethod: 'UPI', reference: 'R1', paidOn: '2026-10-23', requestId: 'abc' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/Booking/settle-settlement'));
    expect(req.request.body).toEqual({
      bookingId: 12, paidAmount: 300, paymentMethod: 'UPI', reference: 'R1', notes: null, paidOn: '2026-10-23', requestId: 'abc',
    });
    req.flush({});
  });

  it('settleSettlement without an amount settles the full balance (paidAmount null)', () => {
    service.settleSettlement(12).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/Booking/settle-settlement'));
    expect(req.request.body.paidAmount).toBeNull();
    req.flush({});
  });

  it('getPartnerStatement requests a PDF blob with the chosen options', () => {
    service.getPartnerStatement(5, { from: '2026-10-01', to: '2026-10-31', maskCustomer: false, showFare: true }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/Booking/vendors/5/statement'));
    expect(req.request.responseType).toBe('blob');
    expect(req.request.params.get('from')).toBe('2026-10-01');
    expect(req.request.params.get('to')).toBe('2026-10-31');
    expect(req.request.params.get('maskCustomer')).toBe('false');
    expect(req.request.params.has('bookingId')).toBeFalse();
    req.flush(new Blob(['%PDF']));
  });

  it('reverseSettlementPayment posts the reason', () => {
    service.reverseSettlementPayment(44, 'Entered twice').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/Booking/settlement-payments/44/reverse'));
    expect(req.request.body).toEqual({ reason: 'Entered twice' });
    req.flush({});
  });
});

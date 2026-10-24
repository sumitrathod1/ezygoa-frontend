import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { BookingFormComponent } from './booking-form.component';
import { testProviders } from '../../testing/test-providers';

describe('BookingFormComponent', () => {
  let component: BookingFormComponent;
  let fixture: ComponentFixture<BookingFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingFormComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('typing the external driver number does not change the customer number', () => {
    component.bookingForm.patchValue({ customerNumber: '9876500001' });
    component.normalizePhone({ target: { value: '9822100001' } }, 'externalEmployeeNumber');
    expect(component.bookingForm.get('customerNumber')!.value).toBe('9876500001');
    expect(component.bookingForm.get('externalEmployeeNumber')!.value).toBe('9822100001');
  });

  it('typing the customer number does not change the driver number', () => {
    component.bookingForm.patchValue({ externalEmployeeNumber: '9822100001' });
    component.normalizePhone({ target: { value: '98765-00001' } });
    expect(component.bookingForm.get('customerNumber')!.value).toBe('9876500001');
    expect(component.bookingForm.get('externalEmployeeNumber')!.value).toBe('9822100001');
  });
});

describe('BookingFormComponent — validation, edit pre-fill, errors', () => {
  async function make(data: any = null) {
    await TestBed.configureTestingModule({
      imports: [BookingFormComponent],
      providers: testProviders(data),
    }).compileComponents();
    const fixture = TestBed.createComponent(BookingFormComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const valid = {
    customerName: 'Priya', customerNumber: '9876500001', travelDate: '2026-10-25',
    bookingType: 'AirportPickup', amount: 3500, advancePaid: 0,
  };

  it('a complete own booking has no validation errors', async () => {
    const c = await make();
    c.bookingForm.patchValue(valid);
    expect(c.validationErrors()).toEqual([]);
  });

  it('a missing travel date is reported (was silently saved as today)', async () => {
    const c = await make();
    c.bookingForm.patchValue({ ...valid, travelDate: '' });
    expect(c.validationErrors().join(' ')).toContain('travel date');
  });

  it('a package without a start date is reported (was booked in 1970)', async () => {
    const c = await make();
    c.bookingForm.patchValue({ ...valid, isPackage: true, packageStartDate: null, packageDays: 3 });
    expect(c.validationErrors().join(' ')).toContain('package start date');
  });

  it('partner bookings need name, a valid number and a commission within the amount', async () => {
    const c = await make();
    c.bookingForm.patchValue({ ...valid, isExternalBooking: true });
    c.bookingForm.patchValue({ externalEmployee: '', externalEmployeeNumber: '21213', commissionAmount: 5000 });
    const errs = c.validationErrors().join(' ');
    expect(errs).toContain('partner / driver name');
    expect(errs).toContain('10-digit partner number');
    expect(errs).toContain('Commission cannot be more than the amount');

    c.bookingForm.patchValue({ externalEmployee: 'Shehensha', externalEmployeeNumber: '9878979344', commissionAmount: 500 });
    expect(c.validationErrors()).toEqual([]);
  });

  it('commission of 0 is allowed, an empty commission is not', async () => {
    const c = await make();
    c.bookingForm.patchValue({ ...valid, isExternalBooking: true });
    c.bookingForm.patchValue({ externalEmployee: 'S', externalEmployeeNumber: '9878979344', commissionAmount: null });
    expect(c.validationErrors().join(' ')).toContain('commission');
    c.bookingForm.patchValue({ commissionAmount: 0 });
    expect(c.validationErrors()).toEqual([]);
  });

  it('advance above the amount and a return date before travel are reported', async () => {
    const c = await make();
    c.bookingForm.patchValue({ ...valid, advancePaid: 5000 });
    expect(c.validationErrors().join(' ')).toContain('Advance cannot be more');
    c.bookingForm.patchValue({ advancePaid: 0, bookingType: 'SelfDriveRental', returnDate: '2026-10-20' });
    expect(c.validationErrors().join(' ')).toContain('Return date cannot be before');
  });

  it('editing a partner booking from the list pre-fills name/number as text (not the object)', async () => {
    const c = await make({
      bookingId: 12, amount: 5000, travelDate: '2026-10-25', bookingType: 'AirportPickup',
      customer: { customerName: 'TEST', customerNumber: '8972353441' },
      externalEmployeeId: 3,
      externalEmployee: { externalEmployeeID: 3, externalEmployeeName: 'Shehensha', externalEmployeeNumber: '9878979344' },
      commissionAmount: 500, payment: 'ExternalEmployee',
    });
    const f = c.bookingForm.value;
    expect(f.isExternalBooking).toBeTrue();
    expect(f.externalEmployee).toBe('Shehensha');
    expect(f.externalEmployeeNumber).toBe('9878979344');
    expect(f.customerName).toBe('TEST');
    expect(f.customerNumber).toBe('8972353441');
    expect(f.commissionAmount).toBe(500);
    expect(c.validationErrors()).toEqual([]);
  });

  describe('saved partner picker', () => {
    async function withPartners() {
      const c = await make();
      const http = TestBed.inject(HttpTestingController);
      http.expectOne((r) => r.url.endsWith('/Booking/externalEmployees')).flush({
        success: true,
        data: [
          { externalEmployeeID: 3, externalEmployeeName: 'Shehensha', externalEmployeeNumber: '9878979344' },
          { externalEmployeeID: 9, externalEmployeeName: 'Shehensha', externalEmployeeNumber: '+91 9878979344' },
          { externalEmployeeID: 4, externalEmployeeName: 'Anil Cabs', externalEmployeeNumber: '9822100001' },
          { externalEmployeeID: 5, externalEmployeeName: '', externalEmployeeNumber: '9000000000' },
        ],
      });
      return c;
    }

    function shown(c: BookingFormComponent, typed: string) {
      let last: { name: string }[] = [];
      const sub = c.filteredPartners$.subscribe((v) => (last = v));
      c.bookingForm.get('externalEmployee')!.setValue(typed);
      sub.unsubscribe();
      return last;
    }

    it('lists each saved partner once (same number stored two ways), skipping nameless ones', async () => {
      const c = await withPartners();
      expect(c.partners.map((p) => p.name)).toEqual(['Anil Cabs', 'Shehensha']);
    });

    it('finds a partner by part of the name or the number', async () => {
      const c = await withPartners();
      expect(shown(c, 'shehen').map((p) => p.name)).toEqual(['Shehensha']);
      expect(shown(c, '98221').map((p) => p.name)).toEqual(['Anil Cabs']);
    });

    it('picking a partner fills both name and number', async () => {
      const c = await withPartners();
      c.bookingForm.patchValue({ isExternalBooking: true });
      c.pickPartner(c.partners.find((p) => p.name === 'Shehensha')!);
      expect(c.bookingForm.value.externalEmployee).toBe('Shehensha');
      expect(c.bookingForm.value.externalEmployeeNumber).toBe('9878979344');
    });

    it('typing a saved number with no name fills the name, but never overwrites a typed name', async () => {
      const c = await withPartners();
      c.bookingForm.patchValue({ isExternalBooking: true });
      c.bookingForm.patchValue({ externalEmployee: '', externalEmployeeNumber: '+91 98221 00001' });
      c.fillPartnerNameFromNumber();
      expect(c.bookingForm.value.externalEmployee).toBe('Anil Cabs');

      c.bookingForm.patchValue({ externalEmployee: 'Anil (new car)' });
      c.fillPartnerNameFromNumber();
      expect(c.bookingForm.value.externalEmployee).toBe('Anil (new car)');
    });

    it('shows what the partner earns: fare minus commission', async () => {
      const c = await withPartners();
      expect(c.partnerEarning).toBeNull();
      c.bookingForm.patchValue({ amount: 5000, commissionAmount: 500 });
      expect(c.partnerEarning).toBe(4500);
      c.bookingForm.patchValue({ commissionAmount: 0 });
      expect(c.partnerEarning).toBe(5000);
    });
  });

  it('shows the server\'s own message, validation details, or a connection hint', async () => {
    const c: any = await make();
    expect(c.apiError({ error: { message: 'Enter a valid partner phone number.' } })).toBe('Enter a valid partner phone number.');
    expect(c.apiError({ error: { title: 'One or more validation errors occurred.', errors: { BookingDate: ['The BookingDate field is required.'] } } }))
      .toBe('The BookingDate field is required.');
    expect(c.apiError({ status: 0, error: null })).toContain('No connection');
  });
});

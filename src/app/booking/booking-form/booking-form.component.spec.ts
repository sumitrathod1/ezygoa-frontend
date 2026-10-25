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

  it('a package day without a date is reported (was booked in 1970)', async () => {
    const c = await make();
    c.bookingForm.patchValue({ ...valid, isPackage: true, packageStartDate: null });
    expect(c.validationErrors().join(' ')).toContain('date of day 1');
  });

  describe('package days and trips', () => {
    const iso = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const p = (n: number) => (n < 10 ? '0' + n : String(n));
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };

    async function pkg() {
      const c = await make();
      c.bookingForm.patchValue({ ...valid, packageStartDate: new Date(iso(2) + 'T00:00:00') });
      c.bookingForm.patchValue({ isPackage: true });
      return c;
    }

    it('ticking Package starts with an airport pickup and an airport drop on consecutive days', async () => {
      const c = await pkg();
      expect(c.days.map((d) => d.type)).toEqual(['AirportPickup', 'AirportDrop']);
      expect(c.days.map((d) => d.date)).toEqual([iso(2), iso(3)]);
    });

    it('a new day goes before the airport drop, which moves one day later', async () => {
      const c = await pkg();
      c.addPackageDay();
      expect(c.days.map((d) => d.type)).toEqual(['AirportPickup', 'SightSeeing', 'AirportDrop']);
      expect(c.days.map((d) => d.date)).toEqual([iso(2), iso(3), iso(4)]);
      expect(c.bookingForm.value.packageDays).toBe(3);
    });

    it('split mode shares the total in whole rupees; the last day takes the remainder', async () => {
      const c = await pkg();
      c.addPackageDay();
      c.bookingForm.patchValue({ amount: 10000 });
      expect(c.days.map((d) => d.amount)).toEqual([3333, 3333, 3334]);
    });

    it('changing one day switches to "type each day" and the total becomes the sum', async () => {
      const c = await pkg();
      c.bookingForm.patchValue({ amount: 6000 });
      c.onDayAmountChange(c.days[0], 2500);
      expect(c.amountMode).toBe('each');
      expect(c.days.map((d) => d.amount)).toEqual([2500, 3000]);
      expect(c.bookingForm.value.amount).toBe(5500);
    });

    it('the hotel fills where it belongs: pickup goes TO the hotel, other days start FROM it', async () => {
      const c = await pkg();
      c.addPackageDay();
      c.stay = { name: 'Taj Holiday Village' };
      c.days.forEach((d) => c.onDayTypeChange(d));
      expect(c.days[0].to).toBe('Taj Holiday Village');
      expect(c.days[1].from).toBe('Taj Holiday Village');
      expect(c.days[2].from).toBe('Taj Holiday Village');
    });

    it('saves each day with its own type, time and amount, in date order, with the trip and hotel', async () => {
      const c = await pkg();
      const http = TestBed.inject(HttpTestingController);
      c.setAmountMode('each');
      c.days[0] = { ...c.days[0], date: iso(5), time: '03:00 PM', amount: 2000, from: 'Hotel', to: 'Dabolim Airport', type: 'AirportDrop' };
      c.days[1] = { ...c.days[1], date: iso(2), time: '11:45 AM', amount: 2500, from: 'Mopa Airport', to: 'Hotel', type: 'AirportPickup' };
      c.tripId = 7;
      c.stay = { name: 'Hotel', lat: 15.5, lng: 73.7, mapsLink: 'https://maps.google.com/?q=15.5,73.7' };
      c.onFormSubmit();
      const req = http.expectOne((r) => r.url.endsWith('/Booking/New-Booking'));
      const body = req.request.body;
      expect(body.dayWiseBookings.map((d: any) => [d.travelDate, d.bookingType, d.travelTime, d.amount])).toEqual([
        [iso(2), 'AirportPickup', '11:45:00', 2500],
        [iso(5), 'AirportDrop', '15:00:00', 2000],
      ]);
      expect(body.amount).toBe(4500);
      expect(body.tripId).toBe(7);
      expect(body.stay.name).toBe('Hotel');
    });

    it('a returning customer can be added to their current trip (hotel and pax come along)', async () => {
      const c = await make();
      c.returning = { customer: { customersId: 1, customerName: 'Ashothos', customerNumber: '9886624253' },
        trips: [{ tripId: 9, startDate: iso(0), endDate: iso(3), stayName: 'Taj', stayLat: 1, stayLng: 2, stayMapsLink: null, pax: 14, bookings: 3 }] };
      expect(c.showReturning).toBeTrue();
      c.joinTrip(c.returning.trips[0]);
      expect(c.tripId).toBe(9);
      expect(c.stay?.name).toBe('Taj');
      expect(c.bookingForm.value.pax).toBe(14);
      expect(c.showReturning).toBeFalse();
    });

    it('a tour can end with a drop; it is sent for single bookings and for package days', async () => {
      const c = await make();
      const http = TestBed.inject(HttpTestingController);
      c.bookingForm.patchValue({ ...valid, bookingType: 'NorthGoaSightseeing', endDrop: 'Mopa Airport' });
      c.onFormSubmit();
      const req = http.expectOne((r) => r.url.endsWith('/Booking/New-Booking'));
      expect(req.request.body.bookingType).toBe('NorthGoaSightseeing');
      expect(req.request.body.endDrop).toBe('Mopa Airport');
    });

    it('a drop left on a type that has none is not sent (e.g. changed to Airport Pickup)', async () => {
      const c = await make();
      const http = TestBed.inject(HttpTestingController);
      c.bookingForm.patchValue({ ...valid, bookingType: 'AirportPickup', endDrop: 'Mopa Airport' });
      c.onFormSubmit();
      expect(http.expectOne((r) => r.url.endsWith('/Booking/New-Booking')).request.body.endDrop).toBeNull();
    });

    it('package day: South Goa Sightseeing + drop at Dabolim', async () => {
      const c = await pkg();
      const http = TestBed.inject(HttpTestingController);
      c.days[1] = { ...c.days[1], type: 'SouthGoaSightseeing', endDrop: 'Dabolim Airport', date: iso(3) };
      c.onFormSubmit();
      const day = http.expectOne((r) => r.url.endsWith('/Booking/New-Booking')).request.body.dayWiseBookings[1];
      expect(day.bookingType).toBe('SouthGoaSightseeing');
      expect(day.endDrop).toBe('Dabolim Airport');
    });

    it('a pickup start fills From and goes to the hotel; it is sent with the booking', async () => {
      const c = await make();
      const http = TestBed.inject(HttpTestingController);
      c.stay = { name: 'Taj Holiday Village' };
      c.bookingForm.patchValue({ ...valid, bookingType: 'DudhsagarTour', from: '', to: '' });
      c.setStartPickup('Mopa Airport');
      expect(c.bookingForm.value.from).toBe('Mopa Airport');
      expect(c.bookingForm.value.to).toBe('Taj Holiday Village');
      c.onFormSubmit();
      const body = http.expectOne((r) => r.url.endsWith('/Booking/New-Booking')).request.body;
      expect(body.startPickup).toBe('Mopa Airport');
      expect(body.bookingType).toBe('DudhsagarTour');
    });

    it('Full Day needs its package (8 hr / 80 km or 12 hr / 120 km), which is sent', async () => {
      const c = await make();
      const http = TestBed.inject(HttpTestingController);
      c.bookingForm.patchValue({ ...valid, bookingType: 'FullDay', fullDayHours: null });
      expect(c.validationErrors().join(' ')).toContain('8 hr / 80 km or 12 hr / 120 km');
      c.bookingForm.patchValue({ fullDayHours: 12 });
      expect(c.validationErrors()).toEqual([]);
      c.onFormSubmit();
      expect(http.expectOne((r) => r.url.endsWith('/Booking/New-Booking')).request.body.fullDayHours).toBe(12);
    });

    it('package day Full Day without a package is reported', async () => {
      const c = await pkg();
      c.days[1] = { ...c.days[1], type: 'FullDay', fullDayHours: null };
      expect(c.validationErrors().join(' ')).toContain('Day 2: choose Full Day');
    });

    it('rent-a-car placeholders show in the vehicle list only for self-drive rentals', async () => {
      const c = await make();
      c.vehcilesType = [
        { vehicleId: 1, vehicleName: 'Innova', vehicleNumber: 'GA-01-A-1111' },
        { vehicleId: 2, vehicleName: 'Thar', vehicleNumber: 'RENTAL-001' },
      ];
      c.bookingForm.patchValue({ bookingType: 'AirportPickup' });
      expect(c.vehicleOptions.map((v: any) => v.vehicleId)).toEqual([1]);
      c.bookingForm.patchValue({ bookingType: 'SelfDriveRental' });
      expect(c.vehicleOptions.map((v: any) => v.vehicleId)).toEqual([1, 2]);
    });

    it('"+ Booking for this customer" fills the form but is not an edit', async () => {
      const c = await make({ prefill: { customerName: 'Meera', customerNumber: '9886600001', tripId: 4, stay: { name: 'Baga Resort' } } });
      expect(c.isEditMode).toBeFalse();
      expect(c.bookingForm.value.customerName).toBe('Meera');
      expect(c.bookingForm.value.bookingId).toBeNull();
      expect(c.tripId).toBe(4);
      expect(c.stay?.name).toBe('Baga Resort');
    });
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

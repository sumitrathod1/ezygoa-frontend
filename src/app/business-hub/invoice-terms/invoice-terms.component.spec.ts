import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { InvoiceTermsComponent } from './invoice-terms.component';
import { testProviders } from '../../testing/test-providers';

describe('InvoiceTermsComponent', () => {
  let c: InvoiceTermsComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InvoiceTermsComponent], providers: testProviders() }).compileComponents();
    const f = TestBed.createComponent(InvoiceTermsComponent);
    c = f.componentInstance;
    http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/InvoiceTerms') && r.method === 'GET').flush({ data: {
      nightCharges: [{ label: '7 pm – 12 am', from: '19:00', to: '00:00', amount: 500, appliesTo: 'FullDay' }],
      extraRates: [{ category: 'Dzire', perHour: 200, perKm: 19 }, { category: 'Ertiga', perHour: 250, perKm: 19 }],
      otherTerms: null,
    } });
    http.expectOne((r) => r.url.includes('GetallVehicles')).flush([{ vehicleId: 3, vehicleName: 'ERTIGA', vehicleNumber: 'GA-01', rateCategory: null }]);
  });

  it('loads the night charges, the vehicle rates and their categories', () => {
    expect(c.terms!.nightCharges.length).toBe(1);
    expect(c.categories).toEqual(['Dzire', 'Ertiga']);
  });

  it('adding an airport night charge and saving sends the whole set', () => {
    c.addNight();
    Object.assign(c.terms!.nightCharges[1], { label: 'Airport pickup 7 pm – 8 am', from: '19:00', to: '08:00', amount: 300, appliesTo: 'Transfer' });
    expect(c.dirty).toBeTrue();
    c.save();
    const req = http.expectOne((r) => r.url.endsWith('/InvoiceTerms') && r.method === 'PUT');
    expect(req.request.body.nightCharges[1]).toEqual(jasmine.objectContaining({ appliesTo: 'Transfer', amount: 300, to: '08:00' }));
    req.flush({ data: req.request.body });
    expect(c.dirty).toBeFalse();
  });

  it('picking a vehicle\'s rate category saves that vehicle straight away', () => {
    const v = c.vehicles[0];
    c.setCategory(v, 'Ertiga');
    const req = http.expectOne((r) => r.url.endsWith('UpdateVehicle'));
    expect(req.request.body).toEqual(jasmine.objectContaining({ vehicleId: 3, rateCategory: 'Ertiga' }));
    req.flush({});
    expect(v.rateCategory).toBe('Ertiga');
  });
});

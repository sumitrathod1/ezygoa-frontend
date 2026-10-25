import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { InvoicePreviewComponent } from './invoice-preview.component';
import { testProviders } from '../../testing/test-providers';
import { PdfDownloadService } from '../../services/pdf-download.service';

describe('InvoicePreviewComponent', () => {
  const invoice = (scope: string, lines: number) => ({
    orgName: 'ZipGoa', orgPhone: '+918142384235', orgEmail: 'zipgoa@gmail.com', orgAddress: 'Calangute',
    invoiceNo: 'ZIP-2026-T4', invoiceDate: '2026-10-25', scope,
    customerName: 'Amit Singh', customerNumber: '+91 7763807105', stayName: 'The LaLiT, Palolem',
    lines: Array.from({ length: lines }, (_, i) => ({
      bookingId: 1855 + i, travelDate: '2026-10-2' + (2 + i), travelTime: '01:00:00', bookingType: 'AirportPickup',
      from: 'Dabolim Airport', to: 'The LaLiT', pax: 16, vehicle: null, driver: null,
      amount: 10000, paid: i === 0 ? 1000 : 0, balance: i === 0 ? 9000 : 10000, status: 'Pending',
    })),
    total: 10000 * lines, paid: 1000, balance: 10000 * lines - 1000,
    tripBookings: 3, customerBookings: 4,
  });

  let c: InvoicePreviewComponent;
  let http: HttpTestingController;
  let fixture: any;
  const shareSpy = jasmine.createSpy('shareBlob').and.resolveTo(true);

  beforeEach(async () => {
    shareSpy.calls.reset();
    await TestBed.configureTestingModule({
      imports: [InvoicePreviewComponent],
      providers: [
        ...testProviders({ booking: { bookingId: 1855 } }),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: PdfDownloadService, useValue: { shareBlob: shareSpy, downloadBlob: jasmine.createSpy('downloadBlob').and.resolveTo() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(InvoicePreviewComponent);
    c = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('opens with the trip / all bookings automatically and shows the organisation\'s own name', () => {
    const req = http.expectOne((r) => r.url.endsWith('/Booking/1855/invoice-data'));
    expect(req.request.params.get('scope')).toBe('auto');
    req.flush({ data: invoice('trip', 3) });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(c.scope).toBe('trip');
    expect(text).toContain('ZipGoa');
    expect(text).not.toContain('EZY GOA TRAVELS');
    expect(text).toContain('BOOKINGS (3)');
    expect(text).toContain('Total (all bookings)');
  });

  it('shows the logo, or a reminder to add it in My organisation', () => {
    http.expectOne((r) => r.url.endsWith('/invoice-data')).flush({ data: { ...invoice('booking', 1), orgLogo: null } });
    fixture.detectChanges();
    expect(c.missingOrgDetails).toEqual(['logo']);
    expect(fixture.nativeElement.textContent).toContain('No logo on ZipGoa invoices yet.');

    c.inv = { ...c.inv, orgLogo: 'data:image/png;base64,AAAA', orgPhone: null };
    fixture.detectChanges();
    expect(c.missingOrgDetails).toEqual(['phone number']);
    expect(fixture.nativeElement.querySelector('.inv-logo-img').getAttribute('src')).toBe('data:image/png;base64,AAAA');

    c.inv = { ...c.inv, orgPhone: '+918142384235' };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.inv-setup-hint')).toBeNull();
  });

  it('can switch to just this booking or all of the customer\'s bookings', () => {
    http.expectOne((r) => r.url.endsWith('/invoice-data')).flush({ data: invoice('trip', 3) });
    c.setScope('booking');
    const req = http.expectOne((r) => r.url.endsWith('/invoice-data'));
    expect(req.request.params.get('scope')).toBe('booking');
    req.flush({ data: invoice('booking', 1) });
    expect(c.inv.lines.length).toBe(1);
    c.setScope('customer');
    expect(http.expectOne((r) => r.url.endsWith('/invoice-data')).request.params.get('scope')).toBe('customer');
  });

  it('terms are ticked automatically for a Full Day invoice, and the PDF includes them', () => {
    const req = http.expectOne((r) => r.url.endsWith('/invoice-data'));
    expect(req.request.params.get('includeTerms')).toBe('true');
    req.flush({ data: { ...invoice('trip', 3), hasFullDay: true, terms: { nightCharges: [{ label: '7 pm – 12 am', amount: 500, appliesTo: 'FullDay' }], extraRates: [{ category: 'Ertiga', perHour: 250, perKm: 19 }], packages: ['8 hr / 80 km'], extraRatesForVehicle: true, otherTerms: [] } } });
    fixture.detectChanges();
    expect(c.includeTerms).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Driver night charges');
    expect(fixture.nativeElement.textContent).toContain('Ertiga');
    c.run('download');
    expect(http.expectOne((r) => r.url.endsWith('/Booking/1855/invoice')).request.params.get('includeTerms')).toBe('true');
  });

  it('not ticked for other bookings; unticking leaves them off the PDF', () => {
    http.expectOne((r) => r.url.endsWith('/invoice-data')).flush({ data: { ...invoice('booking', 1), hasFullDay: false } });
    expect(c.includeTerms).toBeFalse();
    c.toggleTerms(true);
    c.toggleTerms(false);
    c.run('download');
    expect(http.expectOne((r) => r.url.endsWith('/Booking/1855/invoice')).request.params.get('includeTerms')).toBe('false');
  });

  it('ticked but nothing applies (daytime airport drop): explains why instead of showing nothing', () => {
    http.expectOne((r) => r.url.endsWith('/invoice-data')).flush({ data: { ...invoice('booking', 1), hasFullDay: false, terms: { nightCharges: [], extraRates: [], packages: [], extraRatesForVehicle: false, otherTerms: [] } } });
    c.toggleTerms(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No terms apply to this booking');
  });

  it('does not repeat "(airport / station pickup or drop)" when the row already says it', () => {
    http.expectOne((r) => r.url.endsWith('/invoice-data')).flush({ data: invoice('booking', 1) });
    expect(c.appliesLabel('Transfer', 'Airport / station pickup or drop, 7 pm – 8 am')).toBe('');
    expect(c.appliesLabel('Transfer', '7 pm – 8 am')).toBe('airport / station pickup or drop');
    expect(c.appliesLabel('FullDay', '7 pm – 12 am')).toBe('Full Day');
  });

  it('shows the organisation phone (call + WhatsApp) and email under the thank-you line', () => {
    http.expectOne((r) => r.url.endsWith('/invoice-data')).flush({ data: invoice('booking', 1) });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.inv-contact')?.textContent).toContain('+918142384235');
    expect(el.querySelector('.inv-contact a[href^="https://wa.me/918142384235"]')).toBeTruthy();
    expect(c.waLink('7406008393')).toBe('https://wa.me/917406008393');
    expect(c.waLink('')).toBeNull();
  });

  it('Share sends the PDF file itself (not a text link) for the chosen bookings', async () => {
    http.expectOne((r) => r.url.endsWith('/invoice-data')).flush({ data: invoice('trip', 3) });
    c.run('share');
    const req = http.expectOne((r) => r.url.endsWith('/Booking/1855/invoice'));
    expect(req.request.params.get('scope')).toBe('trip');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF']));
    await fixture.whenStable();
    expect(shareSpy).toHaveBeenCalled();
    const [blob, name] = shareSpy.calls.mostRecent().args;
    expect(blob instanceof Blob).toBeTrue();
    expect(name).toContain('ZIP-2026-T4');
  });
});

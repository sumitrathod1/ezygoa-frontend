import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { DispatchService } from './dispatch.service';
import { testProviders } from '../testing/test-providers';

describe('DispatchService', () => {
  let service: DispatchService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    service = TestBed.inject(DispatchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('assign sends only the change asked for, then refreshes the header count', () => {
    let latest: any = null;
    service.pending$.subscribe((p) => (latest = p));

    service.assign(12, { userId: 7 }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/Booking/12/assign'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ vehicleId: null, userId: 7, clearVehicle: false, clearDriver: false });
    req.flush({ data: { bookingId: 12, warnings: [] } });

    http.expectOne((r) => r.url.endsWith('/Booking/pending-assignment-count'))
      .flush({ data: { total: 2, today: 1, tomorrow: 1, later: 0, nextDate: null } });
    expect(latest.total).toBe(2);
  });

  it('clearing a driver sends clearDriver', () => {
    service.assign(12, { clearDriver: true }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/Booking/12/assign'));
    expect(req.request.body.clearDriver).toBeTrue();
    req.flush({ data: { bookingId: 12, warnings: [] } });
    http.expectOne((r) => r.url.endsWith('/Booking/pending-assignment-count')).flush({ data: { total: 0 } });
  });

  it('board asks for the chosen dates', () => {
    service.getBoard('2026-10-24', '2026-10-30').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/Booking/assignment-board'));
    expect(req.request.params.get('from')).toBe('2026-10-24');
    expect(req.request.params.get('to')).toBe('2026-10-30');
    req.flush({ data: { bookings: [], drivers: [], vehicles: [] } });
  });

  it('linked organisations are loaded once and reused', () => {
    let a: any, b: any;
    service.getTransferTargets().subscribe((t) => (a = t));
    http.expectOne((r) => r.url.endsWith('/Booking/transfer-targets')).flush({ data: [{ orgId: 2, name: 'ZipGoa' }] });
    service.getTransferTargets().subscribe((t) => (b = t));
    http.expectNone((r) => r.url.endsWith('/Booking/transfer-targets'));
    expect(a[0].name).toBe('ZipGoa');
    expect(b).toEqual(a);
  });

  it('canTransfer is false (not an error) when the list fails to load', () => {
    let can: boolean | undefined;
    service.canTransfer().subscribe((v) => (can = v));
    http.expectOne((r) => r.url.endsWith('/Booking/transfer-targets')).flush('x', { status: 500, statusText: 'err' });
    expect(can).toBeFalse();
  });

  it('transfer posts the target organisation', () => {
    service.transfer(44, 2).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/Booking/44/transfer'));
    expect(req.request.body).toEqual({ targetOrgId: 2 });
    req.flush({ data: { bookingId: 44, toOrgName: 'ZipGoa' } });
    http.expectOne((r) => r.url.endsWith('/Booking/pending-assignment-count')).flush({ data: { total: 0 } });
  });
});

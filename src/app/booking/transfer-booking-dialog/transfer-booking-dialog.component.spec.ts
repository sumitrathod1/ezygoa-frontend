import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { TransferBookingDialogComponent } from './transfer-booking-dialog.component';
import { testProviders } from '../../testing/test-providers';

describe('TransferBookingDialogComponent', () => {
  let c: TransferBookingDialogComponent;
  let http: HttpTestingController;
  let closed: any;

  async function open(targets: any[]) {
    closed = undefined;
    await TestBed.configureTestingModule({
      imports: [TransferBookingDialogComponent],
      providers: [
        ...testProviders({ bookingId: 44, summary: 'Anita · Airport → Calangute' }),
        { provide: MatDialogRef, useValue: { close: (v: any) => (closed = v) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TransferBookingDialogComponent);
    c = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/Booking/transfer-targets')).flush({ data: targets });
    fixture.detectChanges();
    return fixture;
  }

  it('with one linked organisation it is pre-selected: one click to transfer', async () => {
    const f = await open([{ orgId: 2, name: 'ZipGoa', code: 'ZIPGOA' }]);
    expect(c.selected?.name).toBe('ZipGoa');
    expect(f.nativeElement.textContent).toContain('Transfer to ZipGoa');

    c.transfer();
    const req = http.expectOne((r) => r.url.endsWith('/Booking/44/transfer'));
    expect(req.request.body).toEqual({ targetOrgId: 2 });
    req.flush({ data: { bookingId: 44, toOrgName: 'ZipGoa' } });
    http.expectOne((r) => r.url.endsWith('/Booking/pending-assignment-count')).flush({ data: { total: 0 } });
    expect(closed).toBeTrue();
  });

  it('with several, nothing is chosen until the user picks one', async () => {
    await open([{ orgId: 2, name: 'ZipGoa' }, { orgId: 5, name: 'GoaCabs' }]);
    expect(c.selected).toBeNull();
    c.transfer();
    http.expectNone((r) => r.url.includes('/transfer'));
  });

  it('with no linked organisation it explains how to get one', async () => {
    const f = await open([]);
    expect(f.nativeElement.textContent).toContain('No linked organisation yet');
  });

  it('shows the server reason when the transfer is refused and stays open', async () => {
    await open([{ orgId: 2, name: 'ZipGoa' }]);
    c.transfer();
    http.expectOne((r) => r.url.endsWith('/Booking/44/transfer'))
      .flush({ message: 'Money is already recorded with the partner on this booking, so it cannot be transferred.' }, { status: 400, statusText: 'Bad Request' });
    expect(c.error).toContain('cannot be transferred');
    expect(closed).toBeUndefined();
  });
});

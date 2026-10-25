import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';

import { BookingTableComponent } from './booking-table.component';
import { testProviders } from '../../testing/test-providers';

const page = (over: any = {}) => ({
  data: [
    {
      bookingId: 7, travelDate: '2026-10-25', traveltime: '10:30:00', from: 'Mopa Airport', to: 'Calangute',
      status: 'Pending', amount: 2500, pax: 3, bookingType: 'AirportPickup', customerName: 'Rahul', customerNumber: '+919876543210',
      vehicleName: null, userName: null, createdByName: 'Sumit', transferredFromOrgId: 2, transferredFromOrgName: 'ZipGoa',
    },
  ],
  pagination: { pageNumber: 1, pageSize: 20, totalCount: 1699, totalPages: 85 },
  summary: { count: 1699, revenue: 4210500, pending: 40, assigned: 12, completed: 1600, cancelled: 47 },
  filters: { addedBy: [{ userId: 3, name: 'Sumit', count: 900 }], fromOrgs: [{ orgId: 2, name: 'ZipGoa', count: 5 }] },
  ...over,
});

describe('BookingTableComponent', () => {
  let component: BookingTableComponent;
  let fixture: ComponentFixture<BookingTableComponent>;
  let http: HttpTestingController;

  const filterReq = (): TestRequest => http.expectOne((r) => r.url.endsWith('BookingFilter'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingTableComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingTableComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    filterReq().flush(page());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows totals for all matching bookings, not just this page', () => {
    expect(component.summary.count).toBe(1699);
    expect(component.summary.revenue).toBe(4210500);
    expect(component.bookings.length).toBe(1);
    expect(component.rangeText).toBe('1–20 of 1,699');
  });

  it('fills the Added by and Came from choices', () => {
    expect(component.addedByOptions[0].name).toBe('Sumit');
    expect(component.fromOrgOptions[0].name).toBe('ZipGoa');
  });

  it('shows where a transferred booking came from', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('From ZipGoa');
    expect(text).toContain('Added by Sumit');
    expect(text).toContain('No driver yet');
  });

  it('sends the Added by filter', () => {
    component.filter.createdByUserId = '3';
    component.search();
    const req = filterReq();
    expect(req.request.params.get('createdByUserId')).toBe('3');
    expect(req.request.params.get('pageNumber')).toBe('1');
    req.flush(page());
  });

  it('sends one linked org, or every transferred booking', () => {
    component.filter.fromOrgId = '2';
    component.search();
    let req = filterReq();
    expect(req.request.params.get('fromOrgId')).toBe('2');
    expect(req.request.params.get('transferredOnly')).toBe('');
    req.flush(page());

    component.filter.fromOrgId = 'any';
    component.search();
    req = filterReq();
    expect(req.request.params.get('fromOrgId')).toBe('');
    expect(req.request.params.get('transferredOnly')).toBe('true');
    req.flush(page());
  });

  it('tapping a status tile filters by it, tapping again clears it', () => {
    component.toggleStatus('Canceled');
    let req = filterReq();
    expect(req.request.params.get('status')).toBe('Canceled');
    req.flush(page());
    expect(component.activeFilterCount).toBe(1);

    component.toggleStatus('Canceled');
    req = filterReq();
    expect(req.request.params.get('status')).toBe('');
    req.flush(page());
  });

  it('pages forward and stops at the ends', () => {
    component.changePage(2);
    const req = filterReq();
    expect(req.request.params.get('pageNumber')).toBe('2');
    req.flush(page({ pagination: { pageNumber: 2, pageSize: 20, totalCount: 1699, totalPages: 85 } }));
    expect(component.rangeText).toBe('21–40 of 1,699');

    component.changePage(0);
    component.changePage(86);
    http.expectNone((r) => r.url.endsWith('BookingFilter'));
  });
});

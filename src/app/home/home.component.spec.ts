import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';

import { HomeComponent } from './home.component';
import { testProviders } from '../testing/test-providers';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let http: HttpTestingController;

  const calendarReqs = (): TestRequest[] => http.match((r) => r.url.endsWith('/Dashboard/calendar-summary'));
  const full = { totalBookings: 120, todayBookings: 3, todayEarning: 9000, totalRevenue: 400000, calendarData: [{ date: '2026-10-26', count: 3, vehicleNames: ['Urbania'] }], availableDrivers: [], availableVehicles: [] };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the full summary once, then only calendars (1 quick query) for other months', fakeAsync(() => {
    let reqs = calendarReqs();
    expect(reqs.length).toBe(1);
    expect(reqs[0].request.params.has('calendarOnly')).toBeFalse();
    reqs[0].flush(full);
    tick();

    // next month is prefetched as calendar-only
    reqs = calendarReqs();
    expect(reqs.length).toBe(1);
    expect(reqs[0].request.params.get('calendarOnly')).toBe('true');
    reqs[0].flush({ calendarData: [] });

    // swipe two months ahead: calendar only, KPIs stay
    component.onMonthChanged({ month: 12, year: 2030 });
    reqs = calendarReqs();
    expect(reqs.every((r) => r.request.params.get('calendarOnly') === 'true')).toBeTrue();
    reqs.forEach((r) => r.flush({ calendarData: [{ date: '2030-12-05', count: 1, vehicleNames: [] }] }));
    expect(component.totalBookings).toBe(120);
    expect(component.totalRevenue).toBe(400000);
    expect(component.calendarSummary.length).toBe(1);
  }));
});

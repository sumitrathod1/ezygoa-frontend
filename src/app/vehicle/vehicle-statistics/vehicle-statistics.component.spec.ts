import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { VehicleStatisticsComponent } from './vehicle-statistics.component';
import { testProviders } from '../../testing/test-providers';
import { fleetFixture } from '../fleet-fixture.spec-helper';

describe('VehicleStatisticsComponent', () => {
  let component: VehicleStatisticsComponent;
  let fixture: ComponentFixture<VehicleStatisticsComponent>;
  let http: HttpTestingController;

  const fleetReq = () => http.expectOne((r) => r.url.endsWith('/Dashboard/fleet'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleStatisticsComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleStatisticsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('asks the server for this month and shows its totals', () => {
    const req = fleetReq();
    const now = new Date();
    expect(req.request.params.get('from')).toBe(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
    expect(req.request.params.has('vehicleId')).toBeFalse();
    req.flush(fleetFixture());
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Fleet performance');
    expect(text).toContain('Vehicles ranked by profit');
    expect(text).toContain('Top earner');
    expect(text).toContain('Most used');
    expect(component.trendData.datasets.length).toBe(3);
  });

  it('"Last month" sends the whole previous month', () => {
    fleetReq().flush(fleetFixture());
    component.selectPeriod('lastMonth');
    const req = fleetReq();
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    expect(req.request.params.get('to')).toBe(`${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`);
    expect(req.request.params.get('from')!.endsWith('-01')).toBeTrue();
    req.flush(fleetFixture());
  });

  it('tapping a vehicle shows that vehicle only', () => {
    fleetReq().flush(fleetFixture());
    component.pick(fleetFixture().vehicles[1]);
    const req = fleetReq();
    expect(req.request.params.get('vehicleId')).toBe('2');
    req.flush(fleetFixture({ only: 2 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Out on trips');
  });

  it('spending going up is shown as bad, earnings going up as good', () => {
    expect(component.trend(10).cls).toBe('good');
    expect(component.trend(10, false).cls).toBe('bad');
    expect(component.trend(-5, false).cls).toBe('good');
    expect(VehicleStatisticsComponent.short(125000)).toBe('1.3L');
    expect(VehicleStatisticsComponent.short(45000)).toBe('45K');
  });
});

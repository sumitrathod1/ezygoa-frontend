import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { VehicleComponent } from './vehicle.component';
import { testProviders } from '../testing/test-providers';
import { fleetFixture } from './fleet-fixture.spec-helper';
import { dueText, prettyType, rangeLabel } from './fleet-ui';

describe('VehicleComponent (Vehicles home)', () => {
  let component: VehicleComponent;
  let fixture: ComponentFixture<VehicleComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VehicleComponent], providers: testProviders() }).compileComponents();
    fixture = TestBed.createComponent(VehicleComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/Dashboard/fleet')).flush(fleetFixture());
    http.expectOne((r) => r.url.includes('GetAllexpence')).flush([
      { vehicleExpenceId: 1, expenseDate: '2026-10-02T00:00:00', amount: 1500, categoryType: 'Fuel', vehicle: { vehicleName: 'Urbania', vehicleNumber: 'GA-01' } },
      { vehicleExpenceId: 2, expenseDate: '2026-10-19T00:00:00', amount: 900, categoryType: 'Repair', vehicle: { vehicleName: 'ERTIGA', vehicleNumber: 'GA-02' } },
    ]);
    fixture.detectChanges();
  });

  it('shows this month: profit, earned, spent, and how many cars are out today', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Profit from your vehicles');
    expect(text).toContain('Out today');
    expect(component.outTodayPct).toBe(33);
    expect(text).toContain('Fleet busy');
  });

  it('lists what needs attention: expired papers and services due', () => {
    expect(component.alertCount).toBe(2);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Insurance');
    expect(text).toContain('expired 2 days');
    expect(text).toContain('Oil change due');
  });

  it('marks the top earner and loss-making cars, newest expense first', () => {
    expect(component.topEarnerId).toBe(1);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Top earner');
    expect(text).toContain('Loss this month');
    expect(component.recentExpenses[0].vehicleExpenceId).toBe(2);
  });

  it('opens a car in the statistics page', () => {
    const nav = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.openVehicle(fleetFixture().vehicles[0]);
    expect(nav).toHaveBeenCalledWith(['/vehicle-statistics'], { queryParams: { vehicleId: 1 } });
  });

  it('wording helpers', () => {
    expect(dueText(-1, 'expired')).toBe('expired 1 day');
    expect(dueText(0)).toBe('today');
    expect(dueText(5)).toBe('in 5 days');
    expect(prettyType('oilChange')).toBe('Oil change');
    expect(prettyType('TireChange')).toBe('Tyre change');
    expect(rangeLabel('2026-10-01', '2026-10-26')).toBe('1 – 26 Oct');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EarningsComponent } from './earnings.component';
import { testProviders } from '../../testing/test-providers';

describe('EarningsComponent', () => {
  let component: EarningsComponent;
  let fixture: ComponentFixture<EarningsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarningsComponent],
      providers: testProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(EarningsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function data() {
    component.allBookings = [
      { travelDate: '2026-09-10', amount: 4000 },                               // own trip, Sept
      { travelDate: '2026-10-05', amount: 3000 },                               // own trip, Oct
      { travelDate: '2026-10-12', amount: 6000, earnedAmount: 900 },            // partner trip: only commission is ours
    ];
    component.allExpenses = [
      { expenseDate: '2026-09-20T00:00:00', amount: 1500 },
      { expenseDate: '2026-10-08T00:00:00', amount: 700 },
    ];
  }

  it('picking a month filters expenses to that month too (net profit used ALL expenses)', () => {
    data();
    component.selectMonth('2026-10');
    expect(component.totalExpenses).toBe(700);
    expect(component.totalRevenue).toBe(3900);
    expect(component.netProfit).toBe(3200);
  });

  it('counts commission, not the full fare, for partner bookings', () => {
    data();
    component.selectMonth('2026-10');
    expect(component.totalRevenue).toBe(3000 + 900);
  });

  it('"all months" includes everything', () => {
    data();
    component.selectedPeriod = 'all' as any;
    component.selectMonth('all');
    expect(component.totalRevenue).toBe(4000 + 3000 + 900);
    expect(component.totalExpenses).toBe(2200);
  });
});

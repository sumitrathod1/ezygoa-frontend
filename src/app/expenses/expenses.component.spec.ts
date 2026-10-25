import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { ExpensesComponent } from './expenses.component';
import { testProviders } from '../testing/test-providers';

describe('ExpensesComponent (expense KPIs)', () => {
  let component: ExpensesComponent;
  let fixture: ComponentFixture<ExpensesComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ExpensesComponent], providers: testProviders() }).compileComponents();
    fixture = TestBed.createComponent(ExpensesComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/Dashboard/expense-summary')).flush({
      revenue: 183000, totalExpenses: 100000, netProfit: 83000, salaryExpenses: 20000, businessExpenses: 0,
      byCategory: [{ category: 'EMI', amount: 60000, count: 1 }, { category: 'Fuel', amount: 20000, count: 4 }],
      monthlyTrend: [{ label: 'Sep 26', revenue: 150000, expenses: 80000 }, { label: 'Oct 26', revenue: 183000, expenses: 100000 }],
    });
    fixture.detectChanges();
  });

  it('shows only categories with spending, biggest first, with their share', () => {
    expect(component.spendCards.map((c) => [c.key, c.share])).toEqual([['EMI', 60], ['Salary', 20], ['Fuel', 20]]);
    const tiles = fixture.nativeElement.querySelectorAll('.xs-cat');
    expect(tiles.length).toBe(3);
    expect(tiles[0].textContent).toContain('Biggest');
    expect(fixture.nativeElement.querySelector('.xs-cats').textContent).not.toContain('Insurance');
  });

  it('compares the month with last month and with what was earned', () => {
    expect(component.lastMonthExpenses).toBe(80000);
    expect(component.spendChange).toBe(25);
    expect(component.spendRatio).toBe(55);
    expect(fixture.nativeElement.textContent).toContain('25% vs last month');
  });
});

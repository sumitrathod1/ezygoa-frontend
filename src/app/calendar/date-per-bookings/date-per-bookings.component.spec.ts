import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatePerBookingsComponent } from './date-per-bookings.component';
import { testProviders } from '../../testing/test-providers';

describe('DatePerBookingsComponent', () => {
  let component: DatePerBookingsComponent;
  let fixture: ComponentFixture<DatePerBookingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatePerBookingsComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatePerBookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

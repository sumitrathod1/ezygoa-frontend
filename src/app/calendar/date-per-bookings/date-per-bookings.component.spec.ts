import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatePerBookingsComponent } from './date-per-bookings.component';

describe('DatePerBookingsComponent', () => {
  let component: DatePerBookingsComponent;
  let fixture: ComponentFixture<DatePerBookingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatePerBookingsComponent]
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

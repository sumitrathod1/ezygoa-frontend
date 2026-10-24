import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverBookingsComponent } from './driver-bookings.component';
import { signInAs, testProviders } from '../../testing/test-providers';

describe('DriverBookingsComponent', () => {
  let component: DriverBookingsComponent;
  let fixture: ComponentFixture<DriverBookingsComponent>;

  beforeEach(async () => {
    signInAs('Employee');
    await TestBed.configureTestingModule({
      imports: [DriverBookingsComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverBookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('token'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

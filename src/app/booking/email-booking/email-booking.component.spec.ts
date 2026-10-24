import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailBookingComponent } from './email-booking.component';
import { testProviders } from '../../testing/test-providers';

describe('EmailBookingComponent', () => {
  let component: EmailBookingComponent;
  let fixture: ComponentFixture<EmailBookingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailBookingComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailBookingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { BookingSignalService } from './booking-signal.service';

describe('BookingSignalService', () => {
  let service: BookingSignalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BookingSignalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

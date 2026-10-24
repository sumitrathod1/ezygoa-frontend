import { TestBed } from '@angular/core/testing';

import { BookingSignalService } from './booking-signal.service';
import { testProviders } from '../testing/test-providers';

describe('BookingSignalService', () => {
  let service: BookingSignalService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    service = TestBed.inject(BookingSignalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

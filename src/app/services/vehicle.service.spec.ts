import { TestBed } from '@angular/core/testing';

import { VehicleService } from './vehicle.service';
import { testProviders } from '../testing/test-providers';

describe('VehicleService', () => {
  let service: VehicleService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    service = TestBed.inject(VehicleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

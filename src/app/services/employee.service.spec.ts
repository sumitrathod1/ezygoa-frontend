import { TestBed } from '@angular/core/testing';

import { EmployeeService } from './employee.service';
import { testProviders } from '../testing/test-providers';

describe('EmployeeService', () => {
  let service: EmployeeService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    service = TestBed.inject(EmployeeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

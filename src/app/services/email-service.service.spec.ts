import { TestBed } from '@angular/core/testing';

import { EmailServiceService } from './email-service.service';
import { testProviders } from '../testing/test-providers';

describe('EmailServiceService', () => {
  let service: EmailServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    service = TestBed.inject(EmailServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

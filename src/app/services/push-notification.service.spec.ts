import { TestBed } from '@angular/core/testing';

import { PushNotificationService } from './push-notification.service';
import { testProviders } from '../testing/test-providers';

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    service = TestBed.inject(PushNotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

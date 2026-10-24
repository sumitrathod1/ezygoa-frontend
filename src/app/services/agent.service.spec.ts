import { TestBed } from '@angular/core/testing';

import { AgentService } from './agent.service';
import { testProviders } from '../testing/test-providers';

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: testProviders() });
    service = TestBed.inject(AgentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

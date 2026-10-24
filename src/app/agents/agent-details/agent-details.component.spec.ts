import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgentDetailsComponent } from './agent-details.component';
import { testProviders } from '../../testing/test-providers';

describe('AgentDetailsComponent', () => {
  let component: AgentDetailsComponent;
  let fixture: ComponentFixture<AgentDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentDetailsComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgentDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

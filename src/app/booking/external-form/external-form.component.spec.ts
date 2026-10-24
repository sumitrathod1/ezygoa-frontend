import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExternalFormComponent } from './external-form.component';
import { testProviders } from '../../testing/test-providers';

describe('ExternalFormComponent', () => {
  let component: ExternalFormComponent;
  let fixture: ComponentFixture<ExternalFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalFormComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExternalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

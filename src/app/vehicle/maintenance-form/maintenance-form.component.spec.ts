import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceFormComponent } from './maintenance-form.component';
import { testProviders } from '../../testing/test-providers';

describe('MaintenanceFormComponent', () => {
  let component: MaintenanceFormComponent;
  let fixture: ComponentFixture<MaintenanceFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaintenanceFormComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceTableComponent } from './maintenance-table.component';
import { testProviders } from '../../testing/test-providers';

describe('MaintenanceTableComponent', () => {
  let component: MaintenanceTableComponent;
  let fixture: ComponentFixture<MaintenanceTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaintenanceTableComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

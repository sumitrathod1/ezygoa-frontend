import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehicleStatisticsComponent } from './vehicle-statistics.component';
import { testProviders } from '../../testing/test-providers';

describe('VehicleStatisticsComponent', () => {
  let component: VehicleStatisticsComponent;
  let fixture: ComponentFixture<VehicleStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleStatisticsComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehicleStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

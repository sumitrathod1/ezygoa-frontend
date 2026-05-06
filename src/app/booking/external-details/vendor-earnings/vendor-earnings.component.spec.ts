import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorEarningsComponent } from './vendor-earnings.component';

describe('VendorEarningsComponent', () => {
  let component: VendorEarningsComponent;
  let fixture: ComponentFixture<VendorEarningsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorEarningsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorEarningsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

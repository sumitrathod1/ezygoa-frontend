import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorSettlementsComponent } from './vendor-settlements.component';

describe('VendorSettlementsComponent', () => {
  let component: VendorSettlementsComponent;
  let fixture: ComponentFixture<VendorSettlementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorSettlementsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorSettlementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

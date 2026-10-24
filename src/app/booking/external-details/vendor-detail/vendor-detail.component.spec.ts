import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorDetailComponent } from './vendor-detail.component';
import { testProviders } from '../../../testing/test-providers';

describe('VendorDetailComponent', () => {
  let component: VendorDetailComponent;
  let fixture: ComponentFixture<VendorDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorDetailComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

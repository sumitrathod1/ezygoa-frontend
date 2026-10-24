import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverComponent } from './driver.component';
import { signInAs, testProviders } from '../testing/test-providers';

describe('DriverComponent', () => {
  let component: DriverComponent;
  let fixture: ComponentFixture<DriverComponent>;

  beforeEach(async () => {
    signInAs('Employee');
    await TestBed.configureTestingModule({
      imports: [DriverComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('token'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

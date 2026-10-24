import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddemployeeFormComponent } from './addemployee-form.component';
import { testProviders } from '../../testing/test-providers';

describe('AddemployeeFormComponent', () => {
  let component: AddemployeeFormComponent;
  let fixture: ComponentFixture<AddemployeeFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddemployeeFormComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddemployeeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

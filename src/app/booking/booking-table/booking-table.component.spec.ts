import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingTableComponent } from './booking-table.component';
import { testProviders } from '../../testing/test-providers';

describe('BookingTableComponent', () => {
  let component: BookingTableComponent;
  let fixture: ComponentFixture<BookingTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingTableComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

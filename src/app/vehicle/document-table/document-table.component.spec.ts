import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentTableComponent } from './document-table.component';
import { testProviders } from '../../testing/test-providers';

describe('DocumentTableComponent', () => {
  let component: DocumentTableComponent;
  let fixture: ComponentFixture<DocumentTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentTableComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { testProviders } from './testing/test-providers';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.removeItem('token');
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: testProviders(),
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have the 'TravelManagement' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance.title).toEqual('TravelManagement');
  });

  it('shows no admin shell (header / sidebar) when nobody is signed in', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-header')).toBeNull();
    expect(el.querySelector('.desktop-sidebar')).toBeNull();
  });
});

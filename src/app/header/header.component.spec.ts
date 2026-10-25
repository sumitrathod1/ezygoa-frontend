import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderComponent } from './header.component';
import { testProviders } from '../testing/test-providers';
import { MyOrgService } from '../services/my-org.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: testProviders(),
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the signed-in organisation name and its own logo (not "Ezy" for everyone)', () => {
    (TestBed.inject(MyOrgService) as any).orgSubject.next({ orgId: 2, name: 'ZipGoa', logoUrl: 'data:image/png;base64,AAAA' });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-title')?.textContent?.trim()).toBe('ZipGoa');
    expect(el.querySelector('img.logo-static')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  });

  it('falls back to the default logo when none is uploaded', () => {
    (TestBed.inject(MyOrgService) as any).orgSubject.next({ orgId: 1, name: 'EzyGoa', logoUrl: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img.logo-static')?.getAttribute('src')).toBe('assets/Ezy.png');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { SuperAdminComponent } from './super-admin.component';
import { testProviders, signInAs } from '../testing/test-providers';

describe('SuperAdminComponent — stay signed in', () => {
  let component: SuperAdminComponent;
  let fixture: ComponentFixture<SuperAdminComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    signInAs('SuperAdmin', 1, 1);
    await TestBed.configureTestingModule({ imports: [SuperAdminComponent], providers: testProviders() }).compileComponents();
    fixture = TestBed.createComponent(SuperAdminComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.match((r) => r.url.endsWith('/Organization')).forEach((r) => r.flush({ data: [{ orgId: 1, name: 'EzyGoa' }, { orgId: 2, name: 'ZipGoa' }] }));
    http.match((r) => r.url.endsWith('/Organization/links')).forEach((r) => r.flush({ data: [] }));
    http.expectOne((r) => r.url.endsWith('/SystemSettings') && r.method === 'GET').flush({ data: { sessionDays: 30, maxSessionDays: 365 } });
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem('token'));

  it('shows the current sign-in length', () => {
    expect(component.sessionDays).toBe(30);
    expect(fixture.nativeElement.textContent).toContain('Stay signed in');
  });

  it('saves a new length', () => {
    component.sessionDays = 90;
    component.saveSessionDays();
    const req = http.expectOne((r) => r.url.endsWith('/SystemSettings') && r.method === 'PUT');
    expect(req.request.body).toEqual({ sessionDays: 90 });
    req.flush({ data: { sessionDays: 90, maxSessionDays: 365 } });
    expect(component.sessionDays).toBe(90);
  });

  it('refuses 0 or more than a year without calling the server', () => {
    component.sessionDays = 0;
    component.saveSessionDays();
    component.sessionDays = 500;
    component.saveSessionDays();
    http.expectNone((r) => r.method === 'PUT');
  });
});

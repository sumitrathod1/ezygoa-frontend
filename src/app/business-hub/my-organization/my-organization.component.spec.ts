import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';

import { MyOrganizationComponent } from './my-organization.component';
import { testProviders } from '../../testing/test-providers';

describe('MyOrganizationComponent', () => {
  let c: MyOrganizationComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.setItem('token', 'test-token');
    await TestBed.configureTestingModule({ imports: [MyOrganizationComponent], providers: testProviders() }).compileComponents();
    const f = TestBed.createComponent(MyOrganizationComponent);
    c = f.componentInstance;
    http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/MyOrganization') && r.method === 'GET').flush({ data: {
      orgId: 2, name: 'ZipGoa', code: 'ZIPGOA', phone: '+918142384235', email: 'zipgoa@gmail.com', address: 'Calangute', logoUrl: null,
    } });
  });

  afterEach(() => localStorage.removeItem('token'));

  it('shows the organisation and its contact details', () => {
    expect(c.name).toBe('ZipGoa');
    expect(c.phone).toBe('+918142384235');
    expect(c.logo).toBeNull();
  });

  it('saves phone / email / address', () => {
    c.phone = '+91 9000000001';
    c.saveDetails();
    const req = http.expectOne((r) => r.url.endsWith('/MyOrganization') && r.method === 'PUT');
    expect(req.request.body).toEqual({ phone: '+91 9000000001', email: 'zipgoa@gmail.com', address: 'Calangute' });
    req.flush({ data: { orgId: 2, name: 'ZipGoa', phone: '+91 9000000001', email: 'zipgoa@gmail.com', address: 'Calangute', logoUrl: null } });
  });

  it('saves a picked logo and can remove it', () => {
    c.newLogo = 'data:image/png;base64,AAAA';
    c.saveLogo();
    const req = http.expectOne((r) => r.url.endsWith('/MyOrganization/logo'));
    expect(req.request.body).toEqual({ logo: 'data:image/png;base64,AAAA' });
    req.flush({ data: { logoUrl: 'data:image/png;base64,AAAA' } });
    expect(c.logo).toBe('data:image/png;base64,AAAA');
    c.removeLogo();
    const del = http.expectOne((r) => r.url.endsWith('/MyOrganization/logo'));
    expect(del.request.body).toEqual({ logo: null });
    del.flush({});
    expect(c.logo).toBeNull();
  });

  it('shrinks a big image to 256 px', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    canvas.getContext('2d')!.fillRect(0, 0, 1024, 512);
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
    const data = await MyOrganizationComponent.shrink(new File([blob], 'logo.png', { type: 'image/png' }), 256);
    const img = new Image();
    await new Promise((res) => { img.onload = res; img.src = data; });
    expect(img.width).toBe(256);
    expect(img.height).toBe(128);
  });
});

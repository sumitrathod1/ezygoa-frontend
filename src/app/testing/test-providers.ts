import { Provider, EnvironmentProviders } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideToastr } from 'ngx-toastr';
import { of } from 'rxjs';

/** Minimal stand-in for a dialog the component was opened in. */
export const dialogRefStub = {
  close: jasmine.createSpy('close'),
  afterClosed: () => of(undefined),
  updateSize: () => dialogRefStub,
  addPanelClass: () => dialogRefStub,
};

/**
 * Everything the app's components expect from the root injector in a unit test.
 * HTTP goes to HttpTestingController — nothing reaches a real server.
 */
export function testProviders(dialogData: unknown = {}): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    provideNoopAnimations(),
    provideToastr(),
    { provide: MatDialogRef, useValue: dialogRefStub },
    { provide: MAT_DIALOG_DATA, useValue: dialogData },
    { provide: DialogRef, useValue: dialogRefStub },
    { provide: DIALOG_DATA, useValue: dialogData },
  ];
}

/** Store an unsigned JWT so components that read the signed-in user work in tests. */
export function signInAs(role: 'Admin' | 'Employee' | 'SuperAdmin', userId = 7, orgId = 1) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const token = [
    b64({ alg: 'HS256', typ: 'JWT' }),
    b64({
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': String(userId),
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': role,
      orgId: String(orgId),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    'test',
  ].join('.');
  localStorage.setItem('token', token);
}

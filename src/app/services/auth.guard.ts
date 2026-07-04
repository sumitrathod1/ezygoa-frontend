import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const helper = new JwtHelperService();
  const token  = localStorage.getItem('token');

  if (state.url.includes('/forget')) {
    return true;
  }

  if (!token || helper.isTokenExpired(token)) {
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }

  const decoded  = helper.decodeToken(token);
  const userRole =
    decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

  // SuperAdmin can ONLY access /super-admin
  if (userRole === 'SuperAdmin') {
    if (state.url.startsWith('/super-admin')) return true;
    router.navigate(['/super-admin']);
    return false;
  }

  // Non-SuperAdmin cannot access /super-admin
  if (state.url.startsWith('/super-admin')) {
    router.navigate(['/login']);
    return false;
  }

  const allowedRoles = route.data?.['role'];
  const rolesArray: string[] = Array.isArray(allowedRoles)
    ? allowedRoles
    : allowedRoles
    ? [allowedRoles]
    : [];

  if (rolesArray.length > 0 && !rolesArray.includes(userRole)) {
    if (userRole === 'Employee') {
      router.navigate(['/driver']);
    } else {
      router.navigate(['/login']);
    }
    return false;
  }

  return true;
};

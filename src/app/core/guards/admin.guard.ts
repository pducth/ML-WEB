import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';
import { AuthService } from '../services/auth.service';

/**
 * /admin/*: unauthenticated visitors are redirected to A01, while a signed-in customer
 * (authenticated but without the Admin role) gets 403 Forbidden.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const admin = inject(AdminAuthService);
  const customer = inject(AuthService);
  const router = inject(Router);
  if (admin.isLoggedIn()) return true;
  if (customer.isLoggedIn()) return router.createUrlTree(['/403']);
  return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
};

export const adminGuestGuard: CanActivateFn = () => {
  const admin = inject(AdminAuthService);
  const router = inject(Router);
  return admin.isLoggedIn() ? router.createUrlTree(['/admin/dashboard']) : true;
};

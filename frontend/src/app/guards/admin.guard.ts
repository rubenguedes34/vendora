import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.getUserValue();
  const allowed = ['admin', 'manager'];
  const canAccess = user?.roles?.some(role => allowed.includes(role)) ?? false;

  return canAccess ? true : router.parseUrl('/dashboard');
};

import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { AuthService, User } from './services/auth.service';

const userNeedsSetup = (user: User | null): boolean => {
  if (!user) return false;
  if (user.needs_setup === false) return false;
  if (user.needs_setup === true) return true;
  return user.monthly_income == null || user.monthly_expenses == null;
};

const homeGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getTokenValue();
  const user = auth.getUserValue();
  if (!token || !user) return router.parseUrl('/login');
  return userNeedsSetup(user) ? router.parseUrl('/setup') : router.parseUrl('/dashboard');
};

const guestGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getTokenValue();
  const user = auth.getUserValue();
  if (!token || !user) return true;
  return userNeedsSetup(user) ? router.parseUrl('/setup') : router.parseUrl('/dashboard');
};

const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getTokenValue();
  const user = auth.getUserValue();
  if (!token || !user) return router.parseUrl('/login');
  return userNeedsSetup(user) ? router.parseUrl('/setup') : true;
};

const setupGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getTokenValue();
  const user = auth.getUserValue();
  if (!token || !user) return router.parseUrl('/login');
  return userNeedsSetup(user) ? true : router.parseUrl('/dashboard');
};

export const routes: Routes = [
  { path: '', canActivate: [homeGuard], component: LoginComponent },
  { path: 'login', canActivate: [guestGuard], component: LoginComponent },
  { path: 'register', canActivate: [guestGuard], component: RegisterComponent },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./components/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    // No guestGuard: the emailed link must also work in a browser that is already signed in.
    path: 'reset-password',
    loadComponent: () =>
      import('./components/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  { path: 'auth/callback', component: AuthCallbackComponent },
  {
    path: 'setup',
    canActivate: [setupGuard],
    loadComponent: () => import('./components/setup/setup.component').then((m) => m.SetupComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'transactions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/budget/budget.component').then((m) => m.BudgetComponent),
  },
  { path: 'budgets', redirectTo: '/transactions?tab=setup', pathMatch: 'full' },
  {
    path: 'investments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/investments/investments.component').then((m) => m.InvestmentsComponent),
  },
  {
    path: 'allocation',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/allocation/allocation.component').then((m) => m.AllocationComponent),
  },
  {
    path: 'recurrent-transactions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/recurrent-transactions/recurrent-transactions.component').then(
        (m) => m.RecurrentTransactionsComponent,
      ),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/account/account.component').then((m) => m.AccountComponent),
  },
  {
    path: 'net-worth',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/net-worth/net-worth.component').then((m) => m.NetWorthComponent),
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
  },
  {
    path: 'health-score',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/health-score/health-score.component').then(
        (m) => m.HealthScoreComponent,
      ),
  },
  {
    path: 'ai-support',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/ai-support/ai-support.component').then((m) => m.AiSupportComponent),
  },
];

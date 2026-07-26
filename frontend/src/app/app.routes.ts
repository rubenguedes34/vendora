import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { AuthService } from './services/auth.service';

const userNeedsSetup = (user: any): boolean => {
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
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'setup', canActivate: [setupGuard], loadComponent: () => import('./components/setup/setup.component').then(m => m.SetupComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'transactions', canActivate: [authGuard], loadComponent: () => import('./components/transactions/transactions.component').then(m => m.TransactionsComponent) },
  { path: 'budgets', canActivate: [authGuard], loadComponent: () => import('./components/budget/budget.component').then(m => m.BudgetComponent) },
  { path: 'investments', canActivate: [authGuard], loadComponent: () => import('./components/investments/investments.component').then(m => m.InvestmentsComponent) },
  { path: 'watchlist', canActivate: [authGuard], loadComponent: () => import('./components/watchlist/watchlist.component').then(m => m.WatchlistComponent) },
  { path: 'allocation', canActivate: [authGuard], loadComponent: () => import('./components/allocation/allocation.component').then(m => m.AllocationComponent) },
  { path: 'recurrent-transactions', canActivate: [authGuard], loadComponent: () => import('./components/recurrent-transactions/recurrent-transactions.component').then(m => m.RecurrentTransactionsComponent) },
  { path: 'account', canActivate: [authGuard], loadComponent: () => import('./components/account/account.component').then(m => m.AccountComponent) },
  { path: 'net-worth', canActivate: [authGuard], loadComponent: () => import('./components/net-worth/net-worth.component').then(m => m.NetWorthComponent) },
  { path: 'notifications', canActivate: [authGuard], loadComponent: () => import('./components/notifications/notifications.component').then(m => m.NotificationsComponent) },
  { path: 'health-score', canActivate: [authGuard], loadComponent: () => import('./components/health-score/health-score.component').then(m => m.HealthScoreComponent) },
  { path: 'ai-support', canActivate: [authGuard], loadComponent: () => import('./components/ai-support/ai-support.component').then(m => m.AiSupportComponent) },
];

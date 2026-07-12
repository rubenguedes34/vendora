import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AuthCallbackComponent } from './components/auth-callback/auth-callback.component';
import { AuthService } from './services/auth.service';

const homeGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? router.parseUrl('/dashboard') : router.parseUrl('/login');
};

const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.parseUrl('/login');
};

export const routes: Routes = [
  { path: '', canActivate: [homeGuard], component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'setup', loadComponent: () => import('./components/setup/setup.component').then(m => m.SetupComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'transactions', canActivate: [authGuard], loadComponent: () => import('./components/transactions/transactions.component').then(m => m.TransactionsComponent) },
  { path: 'budgets', canActivate: [authGuard], loadComponent: () => import('./components/budget/budget.component').then(m => m.BudgetComponent) },
  { path: 'investments', canActivate: [authGuard], loadComponent: () => import('./components/investments/investments.component').then(m => m.InvestmentsComponent) },
  { path: 'recurrent-transactions', canActivate: [authGuard], loadComponent: () => import('./components/recurrent-transactions/recurrent-transactions.component').then(m => m.RecurrentTransactionsComponent) },
];

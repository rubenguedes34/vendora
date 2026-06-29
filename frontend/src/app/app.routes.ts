import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'transactions', loadComponent: () => import('./components/transactions/transactions.component').then(m => m.TransactionsComponent) },
  { path: 'budgets', loadComponent: () => import('./components/budget/budget.component').then(m => m.BudgetComponent) },
  { path: 'budgets-old', loadComponent: () => import('./components/budgets/budgets.component').then(m => m.BudgetsComponent) },
  { path: 'investments', loadComponent: () => import('./components/investments/investments.component').then(m => m.InvestmentsComponent) },
];

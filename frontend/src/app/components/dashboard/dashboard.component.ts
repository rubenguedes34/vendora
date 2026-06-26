import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-100">
      <nav class="bg-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <h1 class="text-2xl font-bold text-gray-800">Vendora</h1>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-gray-700">{{ user?.name }}</span>
              <button 
                (click)="logout()"
                class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-8">
          <h2 class="text-3xl font-bold text-gray-800">Dashboard</h2>
          <p class="text-gray-600">Welcome back, {{ user?.name }}!</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-lg font-semibold text-gray-700 mb-2">Total Balance</h3>
            <p class="text-3xl font-bold text-green-600">€{{ totalBalance.toFixed(2) }}</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-lg font-semibold text-gray-700 mb-2">Income (This Month)</h3>
            <p class="text-3xl font-bold text-blue-600">€{{ monthlyIncome.toFixed(2) }}</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-lg font-semibold text-gray-700 mb-2">Expenses (This Month)</h3>
            <p class="text-3xl font-bold text-red-600">€{{ monthlyExpenses.toFixed(2) }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div class="space-y-3">
              <button 
                routerLink="/transactions"
                class="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors text-left"
              >
                Manage Transactions
              </button>
              <button 
                routerLink="/budgets"
                class="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors text-left"
              >
                Set Budgets
              </button>
              <button 
                routerLink="/investments"
                class="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors text-left"
              >
                View Investments
              </button>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Recent Transactions</h3>
            <div *ngIf="recentTransactions.length === 0" class="text-gray-500">
              No recent transactions
            </div>
            <div *ngFor="let transaction of recentTransactions" class="flex justify-between items-center py-2 border-b">
              <div>
                <p class="font-medium text-gray-800">{{ transaction.description }}</p>
                <p class="text-sm text-gray-500">{{ transaction.category?.name }}</p>
              </div>
              <p [class]="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'" class="font-semibold">
                {{ transaction.type === 'income' ? '+' : '-' }}€{{ transaction.amount }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  user: any = null;
  totalBalance = 0;
  monthlyIncome = 0;
  monthlyExpenses = 0;
  recentTransactions: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.getUserObservable().subscribe(user => {
      this.user = user;
    });

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
    }

    // Load dashboard data
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    // This will be implemented with actual API calls
    // For now, showing placeholder data
    this.recentTransactions = [];
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      }
    });
  }
}

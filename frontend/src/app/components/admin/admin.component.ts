import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AdminService, type AdminUser, type BudgetsMetrics, type DashboardMetrics, type InvestmentsMetrics, type TransactionsMetrics } from '../../services/admin.service';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';

type Tab = 'dashboard' | 'users' | 'budgets' | 'investments' | 'transactions';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencySymbolPipe],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <div class="max-w-7xl mx-auto space-y-6">
        <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Admin</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">Users, metrics and platform oversight</p>
          </div>
          <a href="/filament" target="_blank"
            class="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-500 transition-colors">
            Open Filament panel
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
          </a>
        </header>

        <nav class="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-1">
          <button *ngFor="let t of tabs" (click)="setTab(t)" [class.font-semibold]="tab === t"
            [class.text-primary-600]="tab === t" [class.text-gray-600]="tab !== t"
            class="px-4 py-2 text-sm transition-colors hover:text-primary-600">
            {{ t | titlecase }}
          </button>
        </nav>

        <!-- Dashboard -->
        <section *ngIf="tab === 'dashboard'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let card of dashboardCards" class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ card.label }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ card.isMoney ? (card.value | currencySymbol) : card.value }}
            </p>
          </div>
        </section>

        <!-- Users -->
        <section *ngIf="tab === 'users'" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div class="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
            <input [formControl]="usersSearch" type="text" placeholder="Search users..."
              class="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm text-left">
              <thead class="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th class="px-4 py-3 font-medium">Name</th>
                  <th class="px-4 py-3 font-medium">Email</th>
                  <th class="px-4 py-3 font-medium">Role</th>
                  <th class="px-4 py-3 font-medium">Status</th>
                  <th class="px-4 py-3 font-medium">Joined</th>
                  <th class="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr *ngFor="let u of users" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-4 py-3 text-gray-900 dark:text-white font-medium">{{ u.name }}</td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ u.email }}</td>
                  <td class="px-4 py-3">
                    <select (change)="changeRole(u, $any($event.target).value)" [value]="u.roles[0]?.name || 'user'"
                      class="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1">
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="user">User</option>
                    </select>
                  </td>
                  <td class="px-4 py-3">
                    <span [class.bg-red-100]="u.blacklisted_at" [class.text-red-700]="u.blacklisted_at"
                      [class.bg-green-100]="!u.blacklisted_at" [class.text-green-700]="!u.blacklisted_at"
                      class="px-2 py-1 rounded-full text-xs font-medium">
                      {{ u.blacklisted_at ? 'Blacklisted' : 'Active' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ u.created_at | date:'short' }}</td>
                  <td class="px-4 py-3 text-right space-x-2">
                    <button (click)="toggleBlacklist(u)" [class.text-red-600]="!u.blacklisted_at" [class.text-green-600]="u.blacklisted_at"
                      class="text-xs font-medium hover:underline">
                      {{ u.blacklisted_at ? 'Unblacklist' : 'Blacklist' }}
                    </button>
                    <button (click)="deleteUser(u)" class="text-xs font-medium text-gray-500 hover:text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <button (click)="prevUsers()" [disabled]="usersPage <= 1" class="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-sm disabled:opacity-50">Prev</button>
            <span class="text-sm text-gray-500">Page {{ usersPage }}</span>
            <button (click)="nextUsers()" [disabled]="!usersHasMore" class="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600 text-sm disabled:opacity-50">Next</button>
          </div>
        </section>

        <!-- Budgets metrics -->
        <section *ngIf="tab === 'budgets'" class="space-y-4">
          <div class="flex flex-col sm:flex-row gap-3">
            <input [formControl]="budgetsYear" type="text" placeholder="Year" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm w-32" />
            <input [formControl]="budgetsMonth" type="text" placeholder="YYYY-MM" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm w-40" />
            <input [formControl]="budgetsSearch" type="text" placeholder="Search user/category..." class="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p class="text-sm text-gray-500 dark:text-gray-400">Total budgeted</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ budgetsMetrics?.summary?.total_budgeted | currencySymbol }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ budgetsMetrics?.summary?.count }} entries</p>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p class="text-sm text-gray-500 dark:text-gray-400">By category</p>
              <ul class="mt-2 space-y-1 max-h-64 overflow-y-auto">
                <li *ngFor="let c of budgetsMetrics?.by_category" class="flex justify-between text-sm">
                  <span>{{ c.category }} <span class="text-xs text-gray-400">({{ c.type }})</span></span>
                  <span class="font-medium">{{ c.total | currencySymbol }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Investments metrics -->
        <section *ngIf="tab === 'investments'" class="space-y-4">
          <div class="flex flex-col sm:flex-row gap-3">
            <input [formControl]="investmentsYear" type="text" placeholder="Year" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm w-32" />
            <input [formControl]="investmentsType" type="text" placeholder="Type" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm w-40" />
            <input [formControl]="investmentsSearch" type="text" placeholder="Search name/user..." class="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p class="text-sm text-gray-500 dark:text-gray-400">Investments</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ investmentsMetrics?.summary?.count }}</p>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p class="text-sm text-gray-500 dark:text-gray-400">Initial</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ investmentsMetrics?.summary?.total_initial | currencySymbol }}</p>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p class="text-sm text-gray-500 dark:text-gray-400">Current value</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ investmentsMetrics?.summary?.total_current | currencySymbol }}</p>
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">By type</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div *ngFor="let t of investmentsMetrics?.by_type" class="p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t.type }}</p>
                <p class="text-xs text-gray-500 mt-1">Initial: {{ t.total_initial | currencySymbol }}</p>
                <p class="text-xs text-gray-500">Current: {{ t.total_current | currencySymbol }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ t.count }} items</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Transactions metrics -->
        <section *ngIf="tab === 'transactions'" class="space-y-4">
          <div class="flex flex-col sm:flex-row gap-3">
            <input [formControl]="transactionsYear" type="text" placeholder="Year" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm w-32" />
            <input [formControl]="transactionsMonth" type="text" placeholder="Month 1-12" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm w-32" />
            <select [formControl]="transactionsType" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm w-36">
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input [formControl]="transactionsSearch" type="text" placeholder="Search description/user/category..." class="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div *ngFor="let s of transactionsMetrics?.summary" class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <p class="text-sm text-gray-500 dark:text-gray-400 capitalize">{{ s.type }} total</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ s.total | currencySymbol }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ s.count }} transactions</p>
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">By category</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div *ngFor="let c of transactionsMetrics?.by_category" class="p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ c.category }}</p>
                <p class="text-xs text-gray-500">{{ c.total | currencySymbol }} ({{ c.count }})</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private fb = inject(FormBuilder);

  tab: Tab = 'dashboard';
  tabs: Tab[] = ['dashboard', 'users', 'budgets', 'investments', 'transactions'];

  dashboard: DashboardMetrics | null = null;
  users: AdminUser[] = [];
  usersPage = 1;
  usersHasMore = false;
  budgetsMetrics: BudgetsMetrics | null = null;
  investmentsMetrics: InvestmentsMetrics | null = null;
  transactionsMetrics: TransactionsMetrics | null = null;

  usersSearch = this.fb.control('');
  budgetsYear = this.fb.control('');
  budgetsMonth = this.fb.control('');
  budgetsSearch = this.fb.control('');
  investmentsYear = this.fb.control('');
  investmentsType = this.fb.control('');
  investmentsSearch = this.fb.control('');
  transactionsYear = this.fb.control('');
  transactionsMonth = this.fb.control('');
  transactionsType = this.fb.control('');
  transactionsSearch = this.fb.control('');

  constructor() {}

  setTab(t: Tab): void {
    this.tab = t;
    if (t === 'budgets') this.loadBudgetsMetrics();
    if (t === 'investments') this.loadInvestmentsMetrics();
    if (t === 'transactions') this.loadTransactionsMetrics();
  }

  ngOnInit(): void {
    this.loadDashboard();
    this.loadUsers();

    this.usersSearch.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.usersPage = 1;
      this.loadUsers();
    });

    const reload = (fn: () => void) => fn.bind(this);
    this.budgetsYear.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(reload(this.loadBudgetsMetrics));
    this.budgetsMonth.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(reload(this.loadBudgetsMetrics));
    this.budgetsSearch.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(reload(this.loadBudgetsMetrics));

    this.investmentsYear.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(reload(this.loadInvestmentsMetrics));
    this.investmentsType.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(reload(this.loadInvestmentsMetrics));
    this.investmentsSearch.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(reload(this.loadInvestmentsMetrics));

    this.transactionsYear.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(reload(this.loadTransactionsMetrics));
    this.transactionsMonth.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(reload(this.loadTransactionsMetrics));
    this.transactionsType.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(reload(this.loadTransactionsMetrics));
    this.transactionsSearch.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(reload(this.loadTransactionsMetrics));
  }

  get dashboardCards(): { label: string; value: number; isMoney: boolean }[] {
    const d = this.dashboard;
    if (!d) return [];
    return [
      { label: 'Total users', value: d.total_users, isMoney: false },
      { label: 'Active users', value: d.active_users, isMoney: false },
      { label: 'Blacklisted users', value: d.blacklisted_users, isMoney: false },
      { label: 'New users this month', value: d.new_users_this_month, isMoney: false },
      { label: 'Total transactions', value: d.total_transactions, isMoney: false },
      { label: 'Total income', value: d.total_income, isMoney: true },
      { label: 'Total expenses', value: d.total_expenses, isMoney: true },
      { label: 'Total budgeted', value: d.total_budgeted, isMoney: true },
      { label: 'Invested (current)', value: d.total_invested_current, isMoney: true },
    ];
  }

  loadDashboard(): void {
    this.adminService.getDashboardMetrics().subscribe(d => this.dashboard = d);
  }

  loadUsers(): void {
    this.adminService.getUsers(this.usersSearch.value || '', this.usersPage).subscribe(res => {
      this.users = res.data;
      this.usersHasMore = res.current_page < res.last_page;
    });
  }

  prevUsers(): void {
    if (this.usersPage > 1) { this.usersPage--; this.loadUsers(); }
  }

  nextUsers(): void {
    if (this.usersHasMore) { this.usersPage++; this.loadUsers(); }
  }

  changeRole(user: AdminUser, role: string): void {
    this.adminService.updateRole(user.id, role).subscribe(() => this.loadUsers());
  }

  toggleBlacklist(user: AdminUser): void {
    this.adminService.toggleBlacklist(user.id).subscribe(() => this.loadUsers());
  }

  deleteUser(user: AdminUser): void {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    this.adminService.deleteUser(user.id).subscribe(() => this.loadUsers());
  }

  loadBudgetsMetrics(): void {
    this.adminService.getBudgetsMetrics(
      this.budgetsYear.value || '',
      this.budgetsMonth.value || '',
      this.budgetsSearch.value || ''
    ).subscribe(m => this.budgetsMetrics = m);
  }

  loadInvestmentsMetrics(): void {
    this.adminService.getInvestmentsMetrics(
      this.investmentsYear.value || '',
      this.investmentsType.value || '',
      this.investmentsSearch.value || ''
    ).subscribe(m => this.investmentsMetrics = m);
  }

  loadTransactionsMetrics(): void {
    this.adminService.getTransactionsMetrics(
      this.transactionsYear.value || '',
      this.transactionsMonth.value || '',
      this.transactionsType.value || '',
      this.transactionsSearch.value || ''
    ).subscribe(m => this.transactionsMetrics = m);
  }
}

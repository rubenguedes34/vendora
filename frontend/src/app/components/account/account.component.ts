import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { ThemePickerComponent } from '../shared/theme-picker/theme-picker.component';
import { CurrencyPickerComponent } from '../shared/currency-picker/currency-picker.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SidebarComponent, ThemePickerComponent, CurrencyPickerComponent, CurrencySymbolPipe],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <main class="flex-1 overflow-auto pt-14 lg:pt-0">
        <!-- Header -->
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-4xl mx-auto px-6">
            <div class="flex items-center justify-between h-16">
              <div>
                <h2 class="text-xl font-semibold">Account Settings</h2>
                <p class="text-primary-200 text-xs">Manage your profile and preferences</p>
              </div>
              <a routerLink="/dashboard" class="text-primary-200 hover:text-white text-sm transition-colors">
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </header>

        <div class="max-w-4xl mx-auto px-6 py-8 space-y-6">

          <!-- Avatar + name banner -->
          <div class="bg-white rounded-xl shadow-md p-6 flex items-center gap-5">
            <div class="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center text-white text-3xl font-bold select-none">
              {{ initials }}
            </div>
            <div>
              <p class="text-xl font-bold text-gray-800">{{ user?.name }}</p>
              <p class="text-gray-500 text-sm">{{ user?.email }}</p>
              <span class="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium">Active account</span>
            </div>
          </div>

          <!-- Profile info -->
          <div class="bg-white rounded-xl shadow-md p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Profile Information
            </h3>

            <div *ngIf="profileSuccess" class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              ✓ {{ profileSuccess }}
            </div>
            <div *ngIf="profileError" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {{ profileError }}
            </div>

            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input formControlName="name" type="text"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition"
                    placeholder="Your name" />
                  <p *ngIf="profileForm.get('name')?.touched && profileForm.get('name')?.invalid"
                    class="text-red-500 text-xs mt-1">Name is required.</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input formControlName="email" type="email"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition"
                    placeholder="you@example.com" />
                  <p *ngIf="profileForm.get('email')?.touched && profileForm.get('email')?.invalid"
                    class="text-red-500 text-xs mt-1">Valid email is required.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Monthly Income ({{ currencyService.symbol }})</label>
                  <input formControlName="monthly_income" type="number" min="0"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition"
                    placeholder="0.00" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Monthly Expenses ({{ currencyService.symbol }})</label>
                  <input formControlName="monthly_expenses" type="number" min="0"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition"
                    placeholder="0.00" />
                </div>
              </div>

              <div class="flex justify-end">
                <button type="submit" [disabled]="profileForm.invalid || savingProfile"
                  class="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
                  {{ savingProfile ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Change Password -->
          <div class="bg-white rounded-xl shadow-md p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Change Password
            </h3>

            <div *ngIf="passwordSuccess" class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              ✓ {{ passwordSuccess }}
            </div>
            <div *ngIf="passwordError" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {{ passwordError }}
            </div>

            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input formControlName="current_password" type="password"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition"
                  placeholder="••••••••" />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input formControlName="password" type="password"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition"
                    placeholder="••••••••" />
                  <p *ngIf="passwordForm.get('password')?.touched && passwordForm.get('password')?.hasError('minlength')"
                    class="text-red-500 text-xs mt-1">Min 8 characters.</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input formControlName="password_confirmation" type="password"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none transition"
                    placeholder="••••••••" />
                  <p *ngIf="passwordForm.errors?.['mismatch'] && passwordForm.get('password_confirmation')?.touched"
                    class="text-red-500 text-xs mt-1">Passwords do not match.</p>
                </div>
              </div>
              <div class="flex justify-end">
                <button type="submit" [disabled]="passwordForm.invalid || savingPassword"
                  class="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
                  {{ savingPassword ? 'Updating...' : 'Update Password' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Account Stats -->
          <div class="bg-white rounded-xl shadow-md p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              Financial Overview
            </h3>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div class="p-4 bg-blue-50 rounded-lg">
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Monthly Income</p>
                <p class="text-xl font-bold text-blue-600 mt-1">{{ (user?.monthly_income ?? 0) | currencySymbol:0 }}</p>
              </div>
              <div class="p-4 bg-red-50 rounded-lg">
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Monthly Expenses</p>
                <p class="text-xl font-bold text-red-600 mt-1">{{ (user?.monthly_expenses ?? 0) | currencySymbol:0 }}</p>
              </div>
              <div class="p-4 bg-green-50 rounded-lg">
                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Net Savings</p>
                <p class="text-xl font-bold text-green-600 mt-1">{{ ((user?.monthly_income ?? 0) - (user?.monthly_expenses ?? 0)) | currencySymbol:0 }}</p>
              </div>
            </div>
          </div>

          <!-- Appearance -->
          <div class="bg-white rounded-xl shadow-md p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
              </svg>
              Appearance
            </h3>
            <div class="bg-primary-700 text-white rounded-xl p-4 space-y-2">
              <app-theme-picker></app-theme-picker>
              <hr class="border-primary-600" />
              <app-currency-picker></app-currency-picker>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="bg-white rounded-xl shadow-md p-6 border border-red-100">
            <h3 class="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              Danger Zone
            </h3>
            <p class="text-sm text-gray-500 mb-4">Once you log out of all sessions, you will need to sign in again on every device.</p>
            <button (click)="logoutAll()"
              class="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
              Log out everywhere
            </button>
          </div>

        </div>
      </main>
    </div>
  `
})
export class AccountComponent implements OnInit {
  user: any = null;
  initials = '';

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  profileSuccess = '';
  profileError = '';
  savingProfile = false;

  passwordSuccess = '';
  passwordError = '';
  savingPassword = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    public currencyService: CurrencyService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUserValue();
    this.updateInitials();

    this.authService.getUserObservable().subscribe(u => {
      this.user = u;
      this.updateInitials();
      if (u) {
        this.profileForm.patchValue({
          name: u.name,
          email: u.email,
          monthly_income: u.monthly_income ?? '',
          monthly_expenses: u.monthly_expenses ?? '',
        });
      }
    });

    this.profileForm = this.fb.group({
      name: [this.user?.name || '', Validators.required],
      email: [this.user?.email || '', [Validators.required, Validators.email]],
      monthly_income: [this.user?.monthly_income ?? ''],
      monthly_expenses: [this.user?.monthly_expenses ?? ''],
    });

    this.passwordForm = this.fb.group({
      current_password: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });
  }

  private updateInitials(): void {
    const name: string = this.user?.name || '';
    this.initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  }

  private passwordMatchValidator(group: FormGroup) {
    const pw = group.get('password')?.value;
    const conf = group.get('password_confirmation')?.value;
    return pw === conf ? null : { mismatch: true };
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getTokenValue()}`
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.savingProfile = true;
    this.profileSuccess = '';
    this.profileError = '';

    const updated = { ...this.user, ...this.profileForm.value };
    this.authService.setUser(updated);

    this.http.put(`${this.apiUrl}/user/profile`, this.profileForm.value, { headers: this.getHeaders() })
      .pipe(timeout(10000), catchError(err => throwError(() => err)))
      .subscribe({
        next: () => {
          this.savingProfile = false;
          this.profileSuccess = 'Profile updated successfully.';
          setTimeout(() => this.profileSuccess = '', 4000);
        },
        error: (err: any) => {
          this.savingProfile = false;
          this.authService.setUser(this.user);
          this.profileError = err?.error?.message || 'Failed to update profile. Please try again.';
          setTimeout(() => this.profileError = '', 5000);
        }
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.savingPassword = true;
    this.passwordSuccess = '';
    this.passwordError = '';

    this.http.put(`${this.apiUrl}/user/password`, this.passwordForm.value, { headers: this.getHeaders() })
      .pipe(timeout(8000), catchError(err => throwError(() => err)))
      .subscribe({
        next: () => {
          this.savingPassword = false;
          this.passwordSuccess = 'Password updated successfully.';
          this.passwordForm.reset();
          setTimeout(() => this.passwordSuccess = '', 4000);
        },
        error: (err: any) => {
          this.savingPassword = false;
          this.passwordError = err?.error?.message || 'Failed to update password. Check your current password.';
          setTimeout(() => this.passwordError = '', 5000);
        }
      });
  }

  logoutAll(): void {
    this.authService.logout().subscribe({
      next: () => { this.authService.clearAuth(); this.router.navigate(['/login']); },
      error: () => { this.authService.clearAuth(); this.router.navigate(['/login']); }
    });
  }
}

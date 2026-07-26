import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-4">
      <div class="w-full max-w-md">
        <div class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <div class="flex flex-col items-center mb-8">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-500 to-primary-700 flex items-center justify-center shadow-lg mb-4">
              <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome to Vendora</h1>
            <p class="text-sm text-gray-500 mt-1 text-center">Set your monthly baseline to personalize your dashboard</p>
          </div>

          <form [formGroup]="setupForm" (ngSubmit)="onSubmit()">
            <div class="mb-5">
              <label class="block text-gray-700 text-sm font-semibold mb-2">Monthly Income (€)</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <input
                  type="number"
                  formControlName="monthly_income"
                  class="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                  placeholder="e.g., 3,000"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                />
              </div>
              <p *ngIf="setupForm.get('monthly_income')?.touched && setupForm.get('monthly_income')?.hasError('required')" class="text-red-500 text-sm mt-1">Monthly income is required.</p>
              <p *ngIf="setupForm.get('monthly_income')?.touched && setupForm.get('monthly_income')?.hasError('min')" class="text-red-500 text-sm mt-1">Monthly income cannot be negative.</p>
              <p *ngIf="setupForm.get('monthly_income')?.touched && setupForm.get('monthly_income')?.hasError('max')" class="text-red-500 text-sm mt-1">Enter an amount below €100,000,000.</p>
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 text-sm font-semibold mb-2">Estimated Monthly Expenses (€)</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v18m9-9H3"/>
                  </svg>
                </div>
                <input
                  type="number"
                  formControlName="monthly_expenses"
                  class="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                  placeholder="e.g., 2,000"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                />
              </div>
              <p *ngIf="setupForm.get('monthly_expenses')?.touched && setupForm.get('monthly_expenses')?.hasError('required')" class="text-red-500 text-sm mt-1">Estimated expenses are required.</p>
              <p *ngIf="setupForm.get('monthly_expenses')?.touched && setupForm.get('monthly_expenses')?.hasError('min')" class="text-red-500 text-sm mt-1">Estimated expenses cannot be negative.</p>
              <p *ngIf="setupForm.get('monthly_expenses')?.touched && setupForm.get('monthly_expenses')?.hasError('max')" class="text-red-500 text-sm mt-1">Enter an amount below €100,000,000.</p>
            </div>

            <button
              type="submit"
              [disabled]="setupForm.invalid || isLoading"
              class="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:from-primary-700 hover:to-primary-800 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
            >
              <span *ngIf="!isLoading">Complete Setup</span>
              <span *ngIf="isLoading">Saving...</span>
            </button>
          </form>

          <div *ngIf="errorMessage" class="mt-5 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class SetupComponent implements OnInit {
  setupForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {
    this.setupForm = this.fb.group({
      monthly_income: ['', [Validators.required, Validators.min(0), Validators.max(99999999.99)]],
      monthly_expenses: ['', [Validators.required, Validators.min(0), Validators.max(99999999.99)]],
    });
  }

  ngOnInit(): void {
    // Route guard ensures a valid logged-in user reaches this page.
  }

  onSubmit(): void {
    if (this.setupForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const token = this.authService.getTokenValue();
    const user = this.authService.getUserValue();

    this.http.post(`${environment.apiUrl}/setup`, {
      token,
      ...this.setupForm.value,
    }).pipe(timeout(10000))
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          this.authService.setUser(response.user);
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.isLoading = false;
          if (error.name === 'TimeoutError' || error.status === 0) {
            this.errorMessage = 'Could not reach the backend. Make sure php artisan serve is running at ' + environment.backendUrl + '.';
          } else if (error instanceof HttpErrorResponse && error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = error.message || 'Setup failed. Please try again.';
          }
        }
      });
  }
}

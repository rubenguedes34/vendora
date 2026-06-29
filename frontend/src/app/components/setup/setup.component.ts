import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 py-8">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <h2 class="text-2xl font-bold mb-2 text-center text-gray-800">Welcome to Vendora</h2>
        <p class="text-center text-gray-600 mb-6">Set up your initial budget to get started</p>

        <form [formGroup]="setupForm" (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">Monthly Income (€)</label>
            <input
              type="number"
              formControlName="monthly_income"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 3000"
              min="0"
              step="0.01"
            />
            <div *ngIf="setupForm.get('monthly_income')?.touched && setupForm.get('monthly_income')?.invalid" class="text-red-500 text-sm mt-1">
              Monthly income is required
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">Estimated Monthly Expenses (€)</label>
            <input
              type="number"
              formControlName="monthly_expenses"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 2000"
              min="0"
              step="0.01"
            />
            <div *ngIf="setupForm.get('monthly_expenses')?.touched && setupForm.get('monthly_expenses')?.invalid" class="text-red-500 text-sm mt-1">
              Estimated expenses is required
            </div>
          </div>

          <button
            type="submit"
            [disabled]="setupForm.invalid || isLoading"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <span *ngIf="!isLoading">Complete Setup</span>
            <span *ngIf="isLoading">Saving...</span>
          </button>
        </form>

        <div *ngIf="errorMessage" class="mt-4 text-red-500 text-center text-sm">
          {{ errorMessage }}
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
      monthly_income: ['', [Validators.required, Validators.min(0)]],
      monthly_expenses: ['', [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    const user = this.authService.getUserValue();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
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
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.authService.setUser(response.user);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Setup failed. Please try again.';
      }
    });
  }
}

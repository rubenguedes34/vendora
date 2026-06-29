import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 py-8">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Setup Your Budget</h2>
        <p class="text-gray-600 text-center mb-6">Configure your monthly budget to get started</p>
        
        <form [formGroup]="setupForm" (ngSubmit)="onSubmit()" (submit)="$event.preventDefault()">
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

          <div class="mb-4">
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

          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">Budget Range</label>
            <select 
              formControlName="budget_range"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a budget range</option>
              <option *ngFor="let range of budgetRanges" [value]="range.id">
                {{ range.name }} (€{{ range.min_amount }} - €{{ range.max_amount }})
              </option>
            </select>
            <p *ngIf="selectedRange" class="text-sm text-gray-500 mt-1">{{ selectedRange.description }}</p>
          </div>

          <button 
            type="submit" 
            [disabled]="setupForm.invalid || isLoading"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <span *ngIf="!isLoading">Continue to Dashboard</span>
            <span *ngIf="isLoading">Loading...</span>
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
  budgetRanges: any[] = [];
  selectedRange: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.setupForm = this.fb.group({
      monthly_income: ['', [Validators.required, Validators.min(0)]],
      monthly_expenses: ['', [Validators.required, Validators.min(0)]],
      budget_range: ['']
    });
  }

  ngOnInit(): void {
    this.loadBudgetRanges();
  }

  loadBudgetRanges(): void {
    // TODO: Load budget ranges from API
    // For now, use hardcoded values
    this.budgetRanges = [
      { id: 1, name: 'Starter', min_amount: 0, max_amount: 500, description: 'Basic budget for essential expenses' },
      { id: 2, name: 'Budget', min_amount: 500, max_amount: 1000, description: 'Moderate budget for everyday expenses' },
      { id: 3, name: 'Standard', min_amount: 1000, max_amount: 2000, description: 'Standard budget for regular expenses' },
      { id: 4, name: 'Comfortable', min_amount: 2000, max_amount: 3500, description: 'Comfortable budget with some flexibility' },
      { id: 5, name: 'Premium', min_amount: 3500, max_amount: 5000, description: 'Premium budget for higher expenses' },
      { id: 6, name: 'Luxury', min_amount: 5000, max_amount: 10000, description: 'Luxury budget for high-end expenses' },
      { id: 7, name: 'Unlimited', min_amount: 10000, max_amount: 999999.99, description: 'No budget restrictions' },
    ];

    // Watch for budget range changes
    this.setupForm.get('budget_range')?.valueChanges.subscribe(value => {
      this.selectedRange = this.budgetRanges.find(r => r.id === value);
    });
  }

  onSubmit(): void {
    if (this.setupForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const formData = this.setupForm.value;

    // TODO: Send setup data to backend
    // For now, just navigate to dashboard
    setTimeout(() => {
      this.isLoading = false;
      this.router.navigate(['/dashboard']);
    }, 1000);
  }
}

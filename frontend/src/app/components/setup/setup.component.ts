import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ThemePickerComponent } from '../shared/theme-picker/theme-picker.component';
import { AuthService } from '../../services/auth.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { timeout } from 'rxjs/operators';
import { User } from '../../services/auth.service';

@Component({
  selector: 'app-setup',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ThemePickerComponent, TranslatePipe],
  template: `
    <div class="relative min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div
        class="w-52 self-end mb-3 sm:mb-0 sm:absolute sm:top-4 sm:right-4 bg-white rounded-xl border border-gray-200 shadow-sm p-2"
      >
        <app-theme-picker></app-theme-picker>
      </div>
      <div class="w-full max-w-md">
        <div class="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 sm:p-10">
          <div class="flex flex-col items-center mb-8">
            <div
              class="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg mb-4"
            >
              <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">
              {{ 'setup.welcome' | translate }}
            </h1>
            <p class="text-sm text-gray-500 mt-1 text-center">
              {{ 'setup.subtitle' | translate }}
            </p>
          </div>

          <form [formGroup]="setupForm" (ngSubmit)="onSubmit()">
            <div class="mb-5">
              <label class="block text-gray-700 text-sm font-semibold mb-2">{{
                'setup.income' | translate
              }}</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    class="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <input
                  type="number"
                  formControlName="monthly_income"
                  class="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 transition-shadow"
                  [placeholder]="'setup.incomePlaceholder' | translate"
                  min="0"
                  max="99999999.99"
                  step="any"
                />
              </div>
              <p
                *ngIf="
                  setupForm.get('monthly_income')?.touched &&
                  setupForm.get('monthly_income')?.hasError('required')
                "
                class="text-red-500 text-sm mt-1"
              >
                {{ 'setup.incomeRequired' | translate }}
              </p>
              <p
                *ngIf="
                  setupForm.get('monthly_income')?.touched &&
                  setupForm.get('monthly_income')?.hasError('min')
                "
                class="text-red-500 text-sm mt-1"
              >
                {{ 'setup.incomeNegative' | translate }}
              </p>
              <p
                *ngIf="
                  setupForm.get('monthly_income')?.touched &&
                  setupForm.get('monthly_income')?.hasError('max')
                "
                class="text-red-500 text-sm mt-1"
              >
                {{ 'setup.amountMax' | translate }}
              </p>
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 text-sm font-semibold mb-2">{{
                'setup.expenses' | translate
              }}</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    class="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 3v18m9-9H3"
                    />
                  </svg>
                </div>
                <input
                  type="number"
                  formControlName="monthly_expenses"
                  class="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 transition-shadow"
                  [placeholder]="'setup.expensesPlaceholder' | translate"
                  min="0"
                  max="99999999.99"
                  step="any"
                />
              </div>
              <p
                *ngIf="
                  setupForm.get('monthly_expenses')?.touched &&
                  setupForm.get('monthly_expenses')?.hasError('required')
                "
                class="text-red-500 text-sm mt-1"
              >
                {{ 'setup.expensesRequired' | translate }}
              </p>
              <p
                *ngIf="
                  setupForm.get('monthly_expenses')?.touched &&
                  setupForm.get('monthly_expenses')?.hasError('min')
                "
                class="text-red-500 text-sm mt-1"
              >
                {{ 'setup.expensesNegative' | translate }}
              </p>
              <p
                *ngIf="
                  setupForm.get('monthly_expenses')?.touched &&
                  setupForm.get('monthly_expenses')?.hasError('max')
                "
                class="text-red-500 text-sm mt-1"
              >
                {{ 'setup.amountMax' | translate }}
              </p>
            </div>

            <button
              type="submit"
              [disabled]="setupForm.invalid || isLoading"
              class="w-full bg-primary-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
            >
              <span *ngIf="!isLoading">{{ 'setup.complete' | translate }}</span>
              <span *ngIf="isLoading">{{ 'setup.saving' | translate }}</span>
            </button>
          </form>

          <div
            *ngIf="errorMessage"
            class="mt-5 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center"
          >
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SetupComponent implements OnInit {
  setupForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private translate: TranslateService,
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

    this.http
      .post<{ message: string; user: User }>(`${environment.apiUrl}/setup`, {
        token,
        ...this.setupForm.value,
      })
      .pipe(timeout(10000))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.authService.setUser(response.user);
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.isLoading = false;
          if (error.name === 'TimeoutError' || error.status === 0) {
            this.errorMessage = this.translate.instant('setup.unreachable', {
              url: environment.backendUrl,
            });
          } else if (error instanceof HttpErrorResponse && error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = error.message || this.translate.instant('setup.failed');
          }
        },
      });
  }
}

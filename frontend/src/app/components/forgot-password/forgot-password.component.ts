import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div
        class="w-full max-w-md bg-white rounded-3xl border border-gray-200 shadow-xl p-8 sm:p-10"
      >
        <h1 class="text-2xl font-extrabold text-gray-900 mb-2">
          {{ 'auth.forgotTitle' | translate }}
        </h1>
        <p class="text-sm text-gray-500 mb-6">{{ 'auth.forgotText' | translate }}</p>

        <div
          *ngIf="message"
          class="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
        >
          {{ message }}
        </div>
        <div
          *ngIf="errorMessage"
          class="mb-5 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm"
        >
          {{ errorMessage }}
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <label class="block text-gray-700 text-sm font-semibold mb-2">{{
            'auth.email' | translate
          }}</label>
          <input
            type="email"
            formControlName="email"
            maxlength="255"
            class="w-full px-3 py-3 mb-1 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
            [placeholder]="'auth.emailPlaceholder' | translate"
          />
          <p
            *ngIf="form.get('email')?.touched && form.get('email')?.invalid"
            class="text-red-500 text-sm"
          >
            {{ 'auth.emailInvalid' | translate }}
          </p>

          <button
            type="submit"
            [disabled]="form.invalid || isLoading"
            class="mt-5 w-full bg-primary-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {{ (isLoading ? 'auth.loading' : 'auth.sendResetLink') | translate }}
          </button>
        </form>

        <p class="mt-6 text-center text-sm">
          <a routerLink="/login" class="font-semibold text-primary-600 hover:underline">{{
            'auth.backToLogin' | translate
          }}</a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  form: FormGroup;
  isLoading = false;
  message = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.isLoading = true;
    this.message = '';
    this.errorMessage = '';

    this.authService.forgotPassword(this.form.value.email).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.message = res.message;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message;
        this.cdr.detectChanges();
      },
    });
  }
}

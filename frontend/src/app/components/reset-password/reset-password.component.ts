import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div
        class="w-full max-w-md bg-white rounded-3xl border border-gray-200 shadow-xl p-8 sm:p-10"
      >
        <h1 class="text-2xl font-extrabold text-gray-900 mb-6">
          {{ 'auth.resetTitle' | translate }}
        </h1>

        <div
          *ngIf="done"
          class="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"
        >
          {{ 'auth.resetDone' | translate }}
        </div>
        <div
          *ngIf="errorMessage"
          class="mb-5 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm"
        >
          {{ errorMessage }}
        </div>

        <form *ngIf="!done" [formGroup]="form" (ngSubmit)="onSubmit()">
          <label class="block text-gray-700 text-sm font-semibold mb-2">{{
            'auth.newPassword' | translate
          }}</label>
          <input
            type="password"
            formControlName="password"
            maxlength="72"
            autocomplete="new-password"
            class="w-full px-3 py-3 mb-1 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
            [placeholder]="'auth.passwordPlaceholderRegister' | translate"
          />
          <p
            *ngIf="form.get('password')?.touched && form.get('password')?.invalid"
            class="text-red-500 text-sm"
          >
            {{ 'auth.passwordMin' | translate }}
          </p>

          <label class="block text-gray-700 text-sm font-semibold mt-4 mb-2">{{
            'auth.confirmPassword' | translate
          }}</label>
          <input
            type="password"
            formControlName="password_confirmation"
            maxlength="72"
            autocomplete="new-password"
            class="w-full px-3 py-3 mb-1 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
            [placeholder]="'auth.confirmPlaceholder' | translate"
          />
          <p
            *ngIf="form.get('password_confirmation')?.touched && form.hasError('mismatch')"
            class="text-red-500 text-sm"
          >
            {{ 'auth.mismatch' | translate }}
          </p>

          <button
            type="submit"
            [disabled]="form.invalid || isLoading"
            class="mt-5 w-full bg-primary-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {{ (isLoading ? 'auth.loading' : 'auth.resetPassword') | translate }}
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
export class ResetPasswordComponent {
  form: FormGroup;
  isLoading = false;
  done = false;
  errorMessage = '';

  private token: string;
  private email: string;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {
    this.token = this.route.snapshot.queryParams['token'] ?? '';
    this.email = this.route.snapshot.queryParams['email'] ?? '';
    // Same rules as the backend ResetPasswordRequest.
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
        password_confirmation: ['', [Validators.required, Validators.maxLength(72)]],
      },
      { validators: this.passwordMatchValidator },
    );
    if (!this.token || !this.email) {
      this.errorMessage = this.translate.instant('auth.resetInvalid');
      this.form.disable();
    }
  }

  passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    return form.get('password')?.value === form.get('password_confirmation')?.value
      ? null
      : { mismatch: true };
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .resetPassword({ token: this.token, email: this.email, ...this.form.value })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.done = true;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.message || this.translate.instant('auth.resetInvalid');
          this.cdr.detectChanges();
        },
      });
  }
}

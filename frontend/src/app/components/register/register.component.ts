import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-4">
      <div class="w-full max-w-md">
        <div class="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <!-- Logo -->
          <div class="flex flex-col items-center mb-8">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-500 to-primary-700 flex items-center justify-center shadow-lg mb-4">
              <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Vendora</h1>
            <p class="text-sm text-gray-500 mt-1">Create your account</p>
          </div>

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <div class="mb-5">
              <label class="block text-gray-700 text-sm font-semibold mb-2">Name</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <input
                  type="text"
                  formControlName="name"
                  maxlength="255"
                  class="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                  placeholder="Enter your name"
                />
              </div>
              <p *ngIf="registerForm.get('name')?.touched && registerForm.get('name')?.hasError('required')" class="text-red-500 text-sm mt-1">Name is required.</p>
              <p *ngIf="registerForm.get('name')?.touched && registerForm.get('name')?.hasError('maxlength')" class="text-red-500 text-sm mt-1">Name cannot exceed 255 characters.</p>
            </div>

            <div class="mb-5">
              <label class="block text-gray-700 text-sm font-semibold mb-2">Email</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                  </svg>
                </div>
                <input
                  type="email"
                  formControlName="email"
                  maxlength="255"
                  class="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                  placeholder="Enter your email"
                />
              </div>
              <p *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.hasError('required')" class="text-red-500 text-sm mt-1">Email is required.</p>
              <p *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.hasError('email')" class="text-red-500 text-sm mt-1">Enter a valid email address.</p>
              <p *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.hasError('maxlength')" class="text-red-500 text-sm mt-1">Email cannot exceed 255 characters.</p>
            </div>

            <div class="mb-5">
              <label class="block text-gray-700 text-sm font-semibold mb-2">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <input
                  type="password"
                  formControlName="password"
                  minlength="8"
                  maxlength="72"
                  class="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                  placeholder="Enter your password (8–72 characters)"
                />
              </div>
              <p *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.hasError('required')" class="text-red-500 text-sm mt-1">Password is required.</p>
              <p *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.hasError('minlength')" class="text-red-500 text-sm mt-1">Password must be at least 8 characters.</p>
              <p *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.hasError('maxlength')" class="text-red-500 text-sm mt-1">Password cannot exceed 72 characters.</p>
            </div>

            <div class="mb-6">
              <label class="block text-gray-700 text-sm font-semibold mb-2">Confirm Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <input
                  type="password"
                  formControlName="password_confirmation"
                  maxlength="72"
                  class="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
                  placeholder="Confirm your password"
                />
              </div>
              <div *ngIf="registerForm.get('password_confirmation')?.touched && registerForm.get('password_confirmation')?.invalid" class="text-red-500 text-sm mt-1">
                Confirmation is required
              </div>
              <div *ngIf="registerForm.hasError('mismatch') && (registerForm.get('password_confirmation')?.touched || registerForm.get('password')?.touched)" class="text-red-500 text-sm mt-1">
                Passwords must match
              </div>
            </div>

            <button
              type="submit"
              [disabled]="registerForm.invalid || isLoading"
              class="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:from-primary-700 hover:to-primary-800 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
            >
              <span *ngIf="!isLoading">Create Account</span>
              <span *ngIf="isLoading">Loading...</span>
            </button>
          </form>

          <div class="relative flex py-5 items-center">
            <div class="flex-grow border-t border-gray-200"></div>
            <span class="flex-shrink-0 mx-4 text-gray-400 text-xs">or</span>
            <div class="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            type="button"
            (click)="onGoogleLogin()"
            class="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-all"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div *ngIf="errorMessage" class="mt-5 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center">
            {{ errorMessage }}
          </div>

          <p class="mt-6 text-center text-gray-600 text-sm">
            Already have an account?
            <a routerLink="/login" class="font-semibold text-primary-600 hover:text-primary-800 hover:underline ml-1">Login</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      password_confirmation: ['', [Validators.required, Validators.maxLength(72)]],
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup): any {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('password_confirmation')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        this.authService.setToken(response.token);
        this.authService.setUser(response.user);
        this.router.navigate(['/setup']);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Registration failed. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onGoogleLogin(): void {
    window.location.href = `${environment.backendUrl}/auth/google`;
  }
}

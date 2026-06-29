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
    <div class="min-h-screen flex items-center justify-center bg-gray-100 py-8">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
        <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Register for Vendora</h2>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" (submit)="$event.preventDefault()">
          <!-- Account Information -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b">Account Information</h3>
            
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Name</label>
              <input 
                type="text" 
                formControlName="name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
              />
              <div *ngIf="registerForm.get('name')?.touched && registerForm.get('name')?.invalid" class="text-red-500 text-sm mt-1">
                Name is required
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Email</label>
              <input 
                type="email" 
                formControlName="email"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
              <div *ngIf="registerForm.get('email')?.touched && registerForm.get('email')?.invalid" class="text-red-500 text-sm mt-1">
                Valid email is required
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Password</label>
              <input 
                type="password" 
                formControlName="password"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password (min 8 characters)"
              />
              <div *ngIf="registerForm.get('password')?.touched && registerForm.get('password')?.invalid" class="text-red-500 text-sm mt-1">
                Password must be at least 8 characters
              </div>
            </div>

            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Confirm Password</label>
              <input 
                type="password" 
                formControlName="password_confirmation"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm your password"
              />
              <div *ngIf="registerForm.get('password_confirmation')?.touched && registerForm.get('password_confirmation')?.invalid" class="text-red-500 text-sm mt-1">
                Passwords must match
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            [disabled]="registerForm.invalid || isLoading"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <span *ngIf="!isLoading">Create Account</span>
            <span *ngIf="isLoading">Loading...</span>
          </button>
        </form>

        <div class="mt-4">
          <button
            type="button"
            (click)="onGoogleLogin()"
            class="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div *ngIf="errorMessage" class="mt-4 text-red-500 text-center text-sm">
          {{ errorMessage }}
        </div>

        <p class="mt-4 text-center text-gray-600">
          Already have an account? 
          <a routerLink="/login" class="text-blue-600 hover:underline">Login</a>
        </p>
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
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],
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

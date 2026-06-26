import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Register for Vendora</h2>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
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

          <div class="mb-6">
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

          <button 
            type="submit" 
            [disabled]="registerForm.invalid || isLoading"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <span *ngIf="!isLoading">Register</span>
            <span *ngIf="isLoading">Loading...</span>
          </button>
        </form>

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
      password_confirmation: ['', Validators.required]
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
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        this.isLoading = false;
      }
    });
  }
}

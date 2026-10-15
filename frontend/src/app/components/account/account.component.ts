import { Component, OnInit, DestroyRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { ThemePickerComponent } from '../shared/theme-picker/theme-picker.component';
import { CurrencyPickerComponent } from '../shared/currency-picker/currency-picker.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { environment } from '../../../environments/environment';
import { User } from '../../services/auth.service';
import { ApiError } from '../../models/api';

@Component({
  selector: 'app-account',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    SidebarComponent,
    ThemePickerComponent,
    CurrencyPickerComponent,
    CurrencySymbolPipe,
  ],
  templateUrl: './account.component.html',
})
export class AccountComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  user: User | null = null;
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
    public currencyService: CurrencyService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUserValue();
    this.updateInitials();

    this.authService
      .getUserObservable()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((u) => {
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
      current_password: [''],
    });

    this.passwordForm = this.fb.group(
      {
        current_password: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(8)]],
        password_confirmation: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  get emailChanged(): boolean {
    return !!this.user && this.profileForm.get('email')?.value !== this.user.email;
  }

  private updateInitials(): void {
    const name: string = this.user?.name || '';
    this.initials =
      name
        .split(' ')
        .map((w: string) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';
  }

  private passwordMatchValidator(group: FormGroup) {
    const pw = group.get('password')?.value;
    const conf = group.get('password_confirmation')?.value;
    return pw === conf ? null : { mismatch: true };
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    this.savingProfile = true;
    this.profileSuccess = '';
    this.profileError = '';

    // The password only travels with the request; it is never kept in the stored user.
    const { current_password, ...profile } = this.profileForm.value;
    const payload = this.emailChanged ? { ...profile, current_password } : profile;

    this.http
      .put(`${this.apiUrl}/user/profile`, payload)
      .pipe(
        timeout(10000),
        catchError((err) => throwError(() => err)),
      )
      .subscribe({
        next: () => {
          this.savingProfile = false;
          this.authService.setUser({ ...this.user, ...profile });
          this.profileForm.patchValue({ current_password: '' });
          this.profileSuccess = 'Profile updated successfully.';
          setTimeout(() => (this.profileSuccess = ''), 4000);
        },
        error: (err: ApiError) => {
          this.savingProfile = false;
          this.profileError =
            err?.error?.errors?.['current_password']?.[0] ||
            err?.error?.message ||
            'Failed to update profile. Please try again.';
          setTimeout(() => (this.profileError = ''), 5000);
        },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.savingPassword = true;
    this.passwordSuccess = '';
    this.passwordError = '';

    this.http
      .put(`${this.apiUrl}/user/password`, this.passwordForm.value)
      .pipe(
        timeout(8000),
        catchError((err) => throwError(() => err)),
      )
      .subscribe({
        next: () => {
          this.savingPassword = false;
          this.passwordSuccess = 'Password updated successfully.';
          this.passwordForm.reset();
          setTimeout(() => (this.passwordSuccess = ''), 4000);
        },
        error: (err: ApiError) => {
          this.savingPassword = false;
          this.passwordError =
            err?.error?.message || 'Failed to update password. Check your current password.';
          setTimeout(() => (this.passwordError = ''), 5000);
        },
      });
  }

  logoutAll(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
    });
  }
}

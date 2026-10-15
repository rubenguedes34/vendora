import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="text-center">
        <div class="text-2xl font-bold text-gray-800 mb-2">Completing login...</div>
        <div class="text-gray-600">Please wait while we redirect you.</div>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    const code = params['code'];
    const error = params['error'];

    if (error) {
      this.router.navigate(['/login'], { queryParams: { error } });
      return;
    }

    if (!code) {
      this.router.navigate(['/login'], { queryParams: { error: 'Missing login data' } });
      return;
    }

    // Trade the single-use code for a token so credentials never sit in the URL.
    this.authService.exchangeGoogleCode(code).subscribe({
      next: ({ token, user }) => {
        this.authService.setToken(token);
        this.authService.setUser(user);
        this.router.navigate([user.needs_setup ? '/setup' : '/dashboard'], { replaceUrl: true });
      },
      error: () => {
        this.router.navigate(['/login'], { queryParams: { error: 'Google login failed. Please try again.' } });
      }
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
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
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const userJson = params['user'];
      const error = params['error'];

      if (error) {
        this.router.navigate(['/login'], { queryParams: { error } });
        return;
      }

      if (token && userJson) {
        try {
          const user = JSON.parse(userJson);
          this.authService.setToken(token);
          this.authService.setUser(user);

          if (user.needs_setup) {
            this.router.navigate(['/setup']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        } catch (e) {
          this.router.navigate(['/login'], { queryParams: { error: 'Invalid login response' } });
        }
      } else {
        this.router.navigate(['/login'], { queryParams: { error: 'Missing login data' } });
      }
    });
  }
}

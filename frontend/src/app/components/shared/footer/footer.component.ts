import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="bg-gray-900 text-slate-300 py-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div class="col-span-1 md:col-span-2 lg:col-span-1">
            <h3 class="text-xl font-bold text-white mb-2">Vendora</h3>
            <p class="text-sm text-slate-400 max-w-xs">
              Smart financial tracking, AI support, and admin tools for your business.
            </p>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h4>
            <ul class="space-y-0 lg:space-y-2 text-sm">
              <li>
                <a routerLink="/dashboard" class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >Dashboard</a
                >
              </li>
              <li>
                <a routerLink="/transactions" class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >Transactions</a
                >
              </li>
              <li>
                <a routerLink="/budgets" class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >Budgets</a
                >
              </li>
              <li>
                <a routerLink="/investments" class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >Investments</a
                >
              </li>
              <li>
                <a routerLink="/ai-support" class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >AI Support</a
                >
              </li>
            </ul>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">Account</h4>
            <ul class="space-y-0 lg:space-y-2 text-sm">
              <li>
                <a routerLink="/login" class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors">Login</a>
              </li>
              <li>
                <a routerLink="/register" class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >Register</a
                >
              </li>
              <li>
                <a routerLink="/account" class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >My Account</a
                >
              </li>
              <li>
                <a routerLink="/setup" class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors">Setup</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h4>
            <ul class="space-y-0 lg:space-y-2 text-sm">
              <li>
                <a
                  href="mailto:support@vendora.dev"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >support@vendora.dev</a
                >
              </li>
              <li>
                <a
                  href="https://github.com/rubenguedes34/vendora"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >GitHub</a
                >
              </li>
              <li>
                <a routerLink="/ai-support" class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >Help & FAQ</a
                >
              </li>
            </ul>
          </div>
        </div>

        <div
          class="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-slate-400"
        >
          <p>&copy; 2026 Vendora. All rights reserved.</p>
          <div class="flex space-x-6 mt-4 md:mt-0">
            <a routerLink="/" class="inline-block py-2 lg:py-0 hover:text-white transition-colors">Privacy</a>
            <a routerLink="/" class="inline-block py-2 lg:py-0 hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}

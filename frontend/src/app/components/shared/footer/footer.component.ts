import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <footer class="bg-gray-900 text-slate-300 py-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div class="col-span-1 md:col-span-2 lg:col-span-1">
            <h3 class="text-xl font-bold text-white mb-2">Vendora</h3>
            <p class="text-sm text-slate-400 max-w-xs">
              {{ 'common.footer.tagline' | translate }}
            </p>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {{ 'common.footer.product' | translate }}
            </h4>
            <ul class="space-y-0 lg:space-y-2 text-sm">
              <li>
                <a
                  routerLink="/dashboard"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >{{ 'common.footer.dashboard' | translate }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/transactions"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >{{ 'common.footer.transactions' | translate }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/budgets"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >{{ 'common.footer.budgets' | translate }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/investments"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >{{ 'common.footer.investments' | translate }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/ai-support"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >{{ 'common.footer.aiSupport' | translate }}</a
                >
              </li>
            </ul>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {{ 'common.footer.account' | translate }}
            </h4>
            <ul class="space-y-0 lg:space-y-2 text-sm">
              <li>
                <a
                  routerLink="/login"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >{{ 'common.footer.login' | translate }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/register"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >{{ 'common.footer.register' | translate }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/account"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >{{ 'common.footer.myAccount' | translate }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/setup"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >{{ 'common.footer.setup' | translate }}</a
                >
              </li>
            </ul>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {{ 'common.footer.contact' | translate }}
            </h4>
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
                <a
                  routerLink="/ai-support"
                  class="inline-block py-2 lg:py-0 hover:text-primary-400 transition-colors"
                  >{{ 'common.footer.helpFaq' | translate }}</a
                >
              </li>
            </ul>
          </div>
        </div>

        <div
          class="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-slate-400"
        >
          <p>{{ 'common.footer.rights' | translate }}</p>
          <div class="flex space-x-6 mt-4 md:mt-0">
            <a
              routerLink="/"
              class="inline-block py-2 lg:py-0 hover:text-white transition-colors"
              >{{ 'common.footer.privacy' | translate }}</a
            >
            <a
              routerLink="/"
              class="inline-block py-2 lg:py-0 hover:text-white transition-colors"
              >{{ 'common.footer.terms' | translate }}</a
            >
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {}

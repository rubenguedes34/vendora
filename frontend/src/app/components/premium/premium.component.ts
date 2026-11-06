import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BillingService, BillingStatus, Plan } from '../../services/billing.service';

const POLL_MS = 2000;
const POLL_MAX = 15;

@Component({
  selector: 'app-premium',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, CurrencyPipe],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div class="w-full max-w-md bg-white rounded-3xl border border-gray-200 shadow-xl p-8">
        <h1 class="text-2xl font-extrabold text-gray-900 mb-2" data-testid="premium-title">
          {{ (status()?.premium ? 'billing.active' : 'billing.title') | translate }}
        </h1>

        @if (message()) {
          <div
            class="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm"
            data-testid="premium-message"
          >
            {{ message()! | translate }}
          </div>
        }

        @if (status(); as s) {
          @if (s.premium) {
            @if (s.status === 'past_due') {
              <p class="text-sm text-red-600 mb-4">{{ 'billing.pastDue' | translate }}</p>
            }
            @if (s.cancels_at) {
              <p class="text-sm text-gray-500 mb-4">
                {{ 'billing.cancelsAt' | translate: { date: s.cancels_at.slice(0, 10) } }}
              </p>
            }
            <a
              routerLink="/investments"
              class="block text-center w-full bg-primary-600 text-white py-3 rounded-xl font-semibold mb-3"
              >{{ 'billing.openInvestments' | translate }}</a
            >
            @if (s.has_customer) {
              <button
                type="button"
                (click)="manage()"
                [disabled]="busy()"
                class="w-full border border-gray-300 py-3 rounded-xl font-semibold disabled:opacity-60"
              >
                {{ 'billing.manage' | translate }}
              </button>
            }
          } @else {
            <p class="text-sm text-gray-500 mb-6">{{ 'billing.subtitle' | translate }}</p>
            @for (plan of s.plans; track plan) {
              <button
                type="button"
                (click)="subscribe(plan)"
                [disabled]="busy()"
                [attr.data-testid]="'subscribe-' + plan"
                class="w-full mb-3 bg-primary-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-primary-700 disabled:opacity-60"
              >
                {{ 'billing.' + plan | translate }} · {{ s.pricing[plan] | currency: 'EUR' }}
                {{ 'billing.per.' + plan | translate }}
                @if (plan === 'yearly' && s.pricing.discount > 0) {
                  <span class="ml-1 text-xs opacity-90">
                    ({{ 'billing.save' | translate: { pct: s.pricing.discount } }})
                  </span>
                }
              </button>
            } @empty {
              <p class="text-sm text-gray-500">{{ 'billing.unavailable' | translate }}</p>
            }
          }
        }
      </div>
    </div>
  `,
})
export class PremiumComponent implements OnInit, OnDestroy {
  status = signal<BillingStatus | null>(null);
  message = signal<string | null>(null);
  busy = signal(false);
  private timer?: ReturnType<typeof setTimeout>;
  private polls = 0;

  constructor(
    private billing: BillingService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const checkout = this.route.snapshot.queryParamMap.get('checkout');
    if (checkout === 'cancelled') this.message.set('billing.cancelled');
    this.load(checkout === 'success');
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  // After paying, the webhook may land a moment after the redirect: poll until premium is on.
  private load(waitForPayment: boolean): void {
    this.billing.getStatus().subscribe({
      next: (s) => {
        this.status.set(s);
        if (!waitForPayment) return;
        if (s.premium) {
          this.router.navigateByUrl('/investments');
        } else if (this.polls++ < POLL_MAX) {
          this.message.set('billing.confirming');
          this.timer = setTimeout(() => this.load(true), POLL_MS);
        } else {
          this.message.set('billing.confirmTimeout');
        }
      },
      error: () => this.message.set('billing.error'),
    });
  }

  subscribe(plan: Plan): void {
    this.go(this.billing.checkout(plan));
  }

  manage(): void {
    this.go(this.billing.portal());
  }

  private go(request: ReturnType<BillingService['portal']>): void {
    this.busy.set(true);
    this.message.set('billing.redirecting');
    request.subscribe({
      next: ({ url }) => window.location.assign(url),
      error: (e) => {
        this.busy.set(false);
        this.message.set(e?.status === 503 ? 'billing.unavailable' : 'billing.error');
      },
    });
  }
}

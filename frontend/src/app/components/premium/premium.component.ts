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
      <div
        class="w-full grid gap-6 items-center"
        [class]="status() && !status()!.premium ? 'max-w-4xl md:grid-cols-2' : 'max-w-md'"
      >
        @if (status() && !status()!.premium) {
          <section class="order-2 md:order-1" data-testid="premium-benefits">
            <h2 class="text-3xl font-extrabold text-gray-900 mb-2">
              {{ 'billing.pitch.title' | translate }}
            </h2>
            <p class="text-gray-500 mb-5">{{ 'billing.pitch.sub' | translate }}</p>
            <ul class="space-y-3 mb-6">
              @for (b of benefits; track b) {
                <li class="flex gap-3">
                  <span
                    class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white text-sm"
                    >&#10003;</span
                  >
                  <span>
                    <span class="block font-semibold text-gray-900">{{
                      'billing.benefits.' + b + '.title' | translate
                    }}</span>
                    <span class="block text-sm text-gray-500">{{
                      'billing.benefits.' + b + '.text' | translate
                    }}</span>
                  </span>
                </li>
              }
            </ul>
            <!-- Static mock of the locked Investments screen: made-up round numbers, no real data. -->
            <div
              class="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4"
              aria-hidden="true"
            >
              <span
                class="absolute bottom-3 right-3 z-10 rounded-full bg-gray-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
              >
                {{ 'billing.pitch.example' | translate }}
              </span>
              <div class="blur-sm select-none">
                <div class="grid grid-cols-4 gap-2 mb-3">
                  @for (k of ['€10.000', '€12.400', '+€2.400', '+24%']; track k) {
                    <div
                      class="rounded-lg bg-primary-600 opacity-20 p-2 text-sm font-bold text-gray-900"
                    >
                      {{ k }}
                    </div>
                  }
                </div>
                <div class="flex items-center gap-4">
                  <svg viewBox="0 0 36 36" class="h-24 w-24 shrink-0 -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke-width="6"
                      class="stroke-primary-600 opacity-30"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke-width="6"
                      stroke-dasharray="55 100"
                      class="stroke-primary-600"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke-width="6"
                      stroke-dasharray="20 100"
                      stroke-dashoffset="-55"
                      class="stroke-primary-600 opacity-60"
                    />
                  </svg>
                  <div class="flex flex-1 items-end gap-2 h-24">
                    @for (h of [30, 45, 38, 60, 52, 75, 68, 90]; track $index) {
                      <div
                        class="flex-1 rounded-t bg-primary-600 opacity-50"
                        [style.height.%]="h"
                      ></div>
                    }
                  </div>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-3">
                  <svg viewBox="0 0 100 40" class="h-20 w-full" preserveAspectRatio="none">
                    <polyline
                      points="0,34 14,30 28,32 42,22 57,24 71,12 85,14 100,4"
                      fill="none"
                      stroke-width="2"
                      class="stroke-primary-600"
                    />
                  </svg>
                  <div class="flex flex-col justify-center gap-2">
                    @for (w of [85, 55, 30]; track $index) {
                      <div class="h-3 rounded bg-primary-600 opacity-50" [style.width.%]="w"></div>
                    }
                  </div>
                </div>
              </div>
              <div
                class="absolute inset-0 flex items-center justify-center bg-black/10 text-sm font-semibold text-gray-900"
              >
                &#128274; {{ 'billing.pitch.locked' | translate }}
              </div>
            </div>
          </section>
        }
        <div
          class="order-1 md:order-2 w-full bg-white rounded-3xl border border-gray-200 shadow-xl p-8"
        >
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
                  {{ 'billing.' + plan | translate }} ·
                  {{ s.pricing[plan].price | currency: 'EUR' }}
                  {{ 'billing.per.' + plan | translate }}
                  @if (s.pricing[plan].discount > 0) {
                    <span class="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                      {{ 'billing.save' | translate: { pct: s.pricing[plan].discount } }}
                    </span>
                    <span class="block text-xs font-normal opacity-90">
                      {{
                        'billing.perMonth'
                          | translate
                            : {
                                price:
                                  (s.pricing[plan].price / s.pricing[plan].months
                                  | currency: 'EUR'),
                              }
                      }}
                    </span>
                  }
                </button>
              } @empty {
                <p class="text-sm text-gray-500">{{ 'billing.unavailable' | translate }}</p>
              }
              <p class="text-xs text-gray-500 text-center mt-2">
                {{ 'billing.trust' | translate }}
              </p>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class PremiumComponent implements OnInit, OnDestroy {
  benefits = ['roi', 'breakdown', 'prices', 'exports'];
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
        if (e?.status === 409) {
          // Already subscribed: not an error, just go in.
          this.billing.getStatus().subscribe((st) => {
            if (st.premium) this.router.navigateByUrl('/investments');
            else this.status.set(st);
          });
          return;
        }
        this.message.set(e?.status === 503 ? 'billing.unavailable' : 'billing.error');
      },
    });
  }
}

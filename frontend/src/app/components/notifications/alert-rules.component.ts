import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertRule, AlertRuleService, AlertRuleType } from '../../services/alert-rule.service';
import { Category, FinancialService } from '../../services/financial.service';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';

@Component({
  selector: 'app-alert-rules',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencySymbolPipe],
  template: `
    <section
      class="bg-white rounded-2xl border border-gray-200 p-5 mb-6"
      aria-labelledby="alert-rules-title"
    >
      <h3 id="alert-rules-title" class="font-semibold text-gray-800">Alert rules</h3>
      <p class="text-xs text-gray-500 mb-4">
        Get notified when your spending this month reaches a limit you set.
      </p>

      <div
        *ngIf="errorMessage"
        role="alert"
        class="mb-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg"
      >
        {{ errorMessage }}
      </div>

      <p *ngIf="!loading && rules.length === 0" class="text-sm text-gray-500 mb-4">No rules yet.</p>

      <ul class="space-y-2 mb-4">
        <li
          *ngFor="let rule of rules"
          class="flex items-center gap-3 p-3 rounded-xl border border-gray-200"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">
              {{ label(rule) }}
            </p>
            <p class="text-xs text-gray-500">
              Limit {{ rule.threshold | currencySymbol }} per month
            </p>
          </div>
          <label class="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              [checked]="rule.is_active"
              (change)="toggle(rule)"
              [disabled]="busyId === rule.id"
              [attr.aria-label]="'Active: ' + label(rule)"
            />
            Active
          </label>
          <button
            type="button"
            (click)="remove(rule)"
            [disabled]="busyId === rule.id"
            class="text-gray-400 hover:text-red-500 p-1"
            [attr.aria-label]="'Delete rule: ' + label(rule)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </li>
      </ul>

      <form [formGroup]="form" (ngSubmit)="add()" class="flex flex-wrap items-end gap-3">
        <label class="text-xs text-gray-600">
          Type
          <select
            formControlName="type"
            class="block mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="category_limit">Category limit</option>
            <option value="total_spend_limit">Total spending limit</option>
          </select>
        </label>
        <label *ngIf="form.value.type === 'category_limit'" class="text-xs text-gray-600">
          Category
          <select
            formControlName="category_id"
            class="block mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option [ngValue]="null" disabled>Choose…</option>
            <option *ngFor="let c of categories" [ngValue]="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="text-xs text-gray-600">
          Limit
          <input
            type="number"
            min="0.01"
            max="99999999.99"
            step="any"
            formControlName="threshold"
            class="block mt-1 w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. 200"
          />
        </label>
        <button
          type="submit"
          [disabled]="form.invalid || saving"
          class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {{ saving ? 'Adding…' : 'Add rule' }}
        </button>
      </form>
    </section>
  `,
})
export class AlertRulesComponent implements OnInit {
  rules: AlertRule[] = [];
  categories: Category[] = [];
  loading = true;
  saving = false;
  busyId: number | null = null;
  errorMessage = '';
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private service: AlertRuleService,
    private financialService: FinancialService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      type: ['category_limit' as AlertRuleType],
      category_id: [null as number | null],
      threshold: [
        null as number | null,
        [Validators.required, Validators.min(0.01), Validators.max(99999999.99)],
      ],
    });
    // The category is only required (and sent) for category limits, mirroring StoreAlertRuleRequest.
    this.form.get('type')!.valueChanges.subscribe((type) => {
      const control = this.form.get('category_id')!;
      control.setValidators(type === 'category_limit' ? Validators.required : null);
      control.setValue(null);
    });
    this.form.get('category_id')!.setValidators(Validators.required);
  }

  ngOnInit(): void {
    this.financialService.getAllCategories().subscribe({
      next: (cats) => {
        this.categories = cats.filter((c) => c.type === 'expense');
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.service.list().subscribe({
      next: (rules) => {
        this.rules = rules;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Could not load alert rules.';
        this.cdr.markForCheck();
      },
    });
  }

  label(rule: AlertRule): string {
    return rule.type === 'category_limit' ? rule.category?.name || 'Category' : 'Total spending';
  }

  add(): void {
    if (this.form.invalid) return;
    const { type, category_id, threshold } = this.form.value;
    this.saving = true;
    this.errorMessage = '';
    this.service
      .create({
        type,
        category_id: type === 'category_limit' ? category_id : null,
        threshold: Number(threshold),
      })
      .subscribe({
        next: (rule) => {
          this.rules = [...this.rules, rule];
          this.saving = false;
          this.form.patchValue({ category_id: null, threshold: null });
          this.form.markAsPristine();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Could not add the rule.';
          this.cdr.markForCheck();
        },
      });
  }

  toggle(rule: AlertRule): void {
    this.busyId = rule.id;
    this.service.update(rule.id, { is_active: !rule.is_active }).subscribe({
      next: (updated) => {
        this.rules = this.rules.map((r) => (r.id === updated.id ? updated : r));
        this.busyId = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.busyId = null;
        this.errorMessage = 'Could not update the rule.';
        this.cdr.markForCheck();
      },
    });
  }

  remove(rule: AlertRule): void {
    this.busyId = rule.id;
    this.service.delete(rule.id).subscribe({
      next: () => {
        this.rules = this.rules.filter((r) => r.id !== rule.id);
        this.busyId = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.busyId = null;
        this.errorMessage = 'Could not delete the rule.';
        this.cdr.markForCheck();
      },
    });
  }
}

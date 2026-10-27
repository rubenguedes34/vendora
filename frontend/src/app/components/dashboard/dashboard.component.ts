import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  HostListener,
  DestroyRef,
  ChangeDetectorRef,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs/operators';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  FinancialService,
  FinancialRecord,
  AvailableMonth,
  DailyBalance,
  MonthComparison,
  MonthTotals,
  CategoryExpense,
} from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { ThemeService } from '../../services/theme.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { CurrencyTextPipe } from '../../pipes/currency-text.pipe';
import { NotificationTextPipe } from '../../pipes/notification-text.pipe';
import { CategoryNamePipe } from '../../pipes/category-name.pipe';
import { LanguageService } from '../../services/language.service';
import { User } from '../../services/auth.service';
import {
  CartesianTooltipItem,
  ChartInstance,
  RadialTooltipItem,
  chartConstructor,
} from '../../models/chart';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SidebarComponent,
    CurrencySymbolPipe,
    CurrencyTextPipe,
    NotificationTextPipe,
    CategoryNamePipe,
    TranslatePipe,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  user: User | null = null;
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly categoryNamePipe = new CategoryNamePipe();
  private static readonly monthKeys = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ];

  // A getter so names follow the active language without any bookkeeping.
  get monthNames(): string[] {
    return DashboardComponent.monthKeys.map((k) => this.translate.instant(`dashboard.months.${k}`));
  }

  monthShort(month: number): string {
    return this.monthNames[month - 1].slice(0, 3);
  }

  // Portuguese writes months in lower case inside a sentence.
  monthInText(month: number): string {
    const name = this.monthNames[month - 1];
    return this.language.current === 'pt' ? name.toLowerCase() : name;
  }

  fmtNum(value: number, digits: number, fixed = false): string {
    return new Intl.NumberFormat(this.language.locale, {
      minimumFractionDigits: fixed ? digits : 0,
      maximumFractionDigits: digits,
    }).format(value);
  }

  fmtDate(value: string): string {
    return new Date(value).toLocaleDateString(this.language.locale, {
      month: 'short',
      day: 'numeric',
    });
  }
  yearlyRecords: FinancialRecord[] = [];

  overviewYear = new Date().getFullYear();
  overviewMonth = new Date().getMonth() + 1;
  overviewIncome = 0;
  overviewExpenses = 0;
  overviewSavings = 0;
  monthRecord: FinancialRecord | null = null;
  editingBase = false;
  savingBase = false;
  baseError = '';
  selectedMonth = `${this.overviewYear}-${String(this.overviewMonth).padStart(2, '0')}`;

  monthBreakdown: { month: number; income: number; expenses: number; balance: number }[] = [];
  recentTransactions: Transaction[] = [];

  isImageIcon(icon?: string): boolean {
    return Boolean(icon?.startsWith('http://') || icon?.startsWith('https://'));
  }

  userInitials = '';

  get overviewBalance(): number {
    return this.overviewIncome - this.overviewExpenses;
  }

  get greeting(): string {
    const h = new Date().getHours();
    return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  }

  get firstName(): string {
    return (this.user?.name || '').split(' ')[0];
  }

  // % change against the previous month (the backend handles January -> December); null when there is nothing to compare.
  deltaPct(key: keyof MonthTotals): { pct: number } | null {
    return this.pctOf(this.comparison, key);
  }

  // wrapped so an exact 0% is still truthy for *ngIf and shows as a badge
  pctOf(c: MonthComparison | null, key: keyof MonthTotals): { pct: number } | null {
    const pct = c?.change_pct[key];
    return pct == null ? null : { pct };
  }

  @ViewChild('incomeExpenseChart') incomeExpenseChart!: ElementRef;
  @ViewChild('categoryBreakdownChart') categoryBreakdownChart!: ElementRef;
  @ViewChild('dailyBalanceChart') dailyBalanceChart!: ElementRef;

  private incomeExpenseChartInstance?: ChartInstance;
  private categoryBreakdownChartInstance?: ChartInstance;
  private dailyBalanceChartInstance?: ChartInstance;
  dailyBalance: DailyBalance | null = null;

  expensesByCategory: CategoryExpense[] = [];
  comparison: MonthComparison | null = null;
  previousYearRecords: FinancialRecord[] = [];
  private previousYearOf = 0;
  readonly comparisonRows: { label: string; key: keyof MonthTotals; goodWhenUp: boolean }[] = [
    { label: 'dashboard.income', key: 'income', goodWhenUp: true },
    { label: 'dashboard.expenses', key: 'expenses', goodWhenUp: false },
    { label: 'dashboard.savings', key: 'savings', goodWhenUp: true },
  ];
  private maxExpense = 0;

  showAlerts = false;
  showMonthPicker = false;
  pickerYear = new Date().getFullYear();
  readonly todayYear = new Date().getFullYear();
  readonly todayMonth = new Date().getMonth() + 1;
  alerts: { id: string; type: 'danger' | 'warning' | 'info'; title: string; message: string }[] =
    [];
  // Persisted in localStorage: alerts are recomputed on every load, so an in-memory set would forget the dismissal.
  dismissedAlerts = this.loadDismissedAlerts();
  hasCritical = false;
  alertCount = 0;
  // Server-side notifications (budget, rules...) share the bell with the alerts computed here.
  notifications: AppNotification[] = [];
  unreadCount = 0;
  // From GET /financial-records/available; null until it loads, so no projection alerts flash meanwhile.
  available: AvailableMonth | null = null;
  projectedBalance = 0;
  dailyAvgSpend = 0;
  daysRemaining = 0;
  savingsRate = 0;

  constructor(
    private authService: AuthService,
    private financialService: FinancialService,
    private router: Router,
    private transactionService: TransactionService,
    public currencyService: CurrencyService,
    private themeService: ThemeService,
    private notificationService: NotificationService,
  ) {
    this.destroyRef.onDestroy(() => {
      this.incomeExpenseChartInstance?.destroy();
      this.categoryBreakdownChartInstance?.destroy();
      this.dailyBalanceChartInstance?.destroy();
    });
  }

  ngOnInit(): void {
    this.notificationService.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((n) => {
        this.notifications = n;
        this.cdr.markForCheck();
      });
    this.notificationService.unreadCount$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => {
        this.unreadCount = c;
        this.cdr.markForCheck();
      });
    this.notificationService.refreshCount().subscribe({ error: () => {} });

    this.themeService.dark$
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.redrawChartsForMode());

    // onLangChange fires once the new translations are loaded; chart labels and alert text are built in code.
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.alerts.length) {
        this.computeAlerts(
          this.overviewYear,
          this.overviewMonth,
          this.overviewIncome,
          this.overviewExpenses,
          this.overviewSavings,
        );
      }
      this.redrawChartsForMode();
      this.cdr.markForCheck();
    });

    this.authService
      .getUserObservable()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.user = user;
        // the API sends these as strings (PHP date()), and computeAlerts compares the year with ===
        if (user?.current_year) this.currentYear = Number(user.current_year);
        if (user?.current_month) this.currentMonth = Number(user.current_month);
        this.overviewYear = this.currentYear;
        this.overviewMonth = this.currentMonth;
        this.selectedMonth = `${this.overviewYear}-${String(this.overviewMonth).padStart(2, '0')}`;
        const name: string = user?.name || '';
        this.userInitials =
          name
            .split(' ')
            .map((w: string) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';
        this.cdr.markForCheck();
      });

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadDashboardData();

    this.financialService.dataChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshAfterChange());
  }

  // Empty yearlyRecords so loadOverviewMonth refetches instead of reading the stale list.
  private refreshAfterChange(): void {
    this.yearlyRecords = [];
    this.loadOverviewMonth();
    this.loadExpensesByCategory();
    // The API only accepts per_page 10/20/50/100 (IndexTransactionRequest), so ask for 10 and show 5.
    this.transactionService.getTransactions({ per_page: 10 }).subscribe({
      next: (res) => {
        this.recentTransactions = res.data.slice(0, 5);
        this.cdr.markForCheck();
      },
    });
  }

  loadDashboardData(): void {
    this.loadMonthInsights();
    this.financialService.getCurrentRecord().subscribe({
      next: (record) => {
        this.updateOverviewFromRecord(record);
        this.updateChartsWithRealData();
        this.computeAlerts(
          this.overviewYear,
          this.overviewMonth,
          this.overviewIncome,
          this.overviewExpenses,
          this.overviewSavings,
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.updateChartsWithRealData();
        this.cdr.markForCheck();
      },
    });

    this.transactionService.getTransactions({ per_page: 10 }).subscribe({
      next: (res) => {
        this.recentTransactions = res.data.slice(0, 5);
        this.cdr.markForCheck();
      },
      error: () => {
        this.recentTransactions = [];
        this.cdr.markForCheck();
      },
    });

    this.loadExpensesByCategory();

    this.financialService.getYearRecords(this.overviewYear).subscribe({
      next: (records) => {
        this.yearlyRecords = records;
        this.updateMonthBreakdown();
        this.updateChartsWithRealData();
        this.cdr.markForCheck();
      },
      error: () => {
        this.yearlyRecords = [];
        this.updateMonthBreakdown();
        this.cdr.markForCheck();
      },
    });
  }

  updateOverviewFromRecord(record: FinancialRecord): void {
    this.monthRecord = record;
    this.overviewIncome = parseFloat(String(record.monthly_income || 0));
    this.overviewExpenses = parseFloat(String(record.monthly_expenses || 0));
    this.overviewSavings = parseFloat(String(record.savings || 0));
  }

  // The backend owns the projection (it knows the recurrents still due); alerts are recomputed once it arrives.
  loadMonthInsights(): void {
    this.loadDailyBalance();
    this.loadComparison();
    this.loadPreviousYear();
    const { overviewYear: year, overviewMonth: month } = this;
    this.financialService.getAvailable(year, month).subscribe({
      next: (a) => {
        if (year !== this.overviewYear || month !== this.overviewMonth) return; // user moved on
        this.applyAvailable(a);
        this.computeAlerts(
          year,
          month,
          this.overviewIncome,
          this.overviewExpenses,
          this.overviewSavings,
        );
        this.cdr.markForCheck();
      },
      error: () => {
        if (year !== this.overviewYear || month !== this.overviewMonth) return;
        this.available = null;
        this.cdr.markForCheck();
      },
    });
  }

  // Only hides the button: the backend enforces `export reports`, which these two roles hold.
  get canExportPdf(): boolean {
    return this.user?.roles?.some((role) => ['premium', 'admin'].includes(role)) ?? false;
  }

  exportMonth(format: 'csv' | 'pdf'): void {
    const month = `${this.overviewYear}-${String(this.overviewMonth).padStart(2, '0')}`;
    if (format === 'pdf') {
      this.transactionService.exportMonthlyPdf(month, this.currencyService.symbol);
      return;
    }
    const lastDay = new Date(this.overviewYear, this.overviewMonth, 0).getDate();
    this.transactionService.exportTransactions({
      date_from: `${month}-01`,
      date_to: `${month}-${String(lastDay).padStart(2, '0')}`,
    });
  }

  // Only fetched when the year changes, not on every month change.
  loadPreviousYear(): void {
    const year = this.overviewYear;
    if (this.previousYearOf === year) return;
    this.previousYearOf = year;
    this.previousYearRecords = [];
    this.financialService.getYearRecords(year - 1).subscribe({
      next: (records) => {
        if (year !== this.overviewYear) return;
        this.previousYearRecords = records;
        this.cdr.markForCheck();
      },
      error: () => {
        if (year !== this.overviewYear) return;
        this.previousYearOf = 0; // retry on the next refresh
        this.previousYearRecords = [];
        this.cdr.markForCheck();
      },
    });
  }

  // January up to the selected month, against the same months of the year before, so a half-finished year
  // is never set against a full one. Null when the year before has no data.
  get yearToDate(): MonthComparison | null {
    const sum = (records: FinancialRecord[]): MonthTotals => {
      const upTo = records.filter((r) => r.month <= this.overviewMonth);
      const income = upTo.reduce((t, r) => t + Number(r.monthly_income || 0), 0);
      const expenses = upTo.reduce((t, r) => t + Number(r.monthly_expenses || 0), 0);
      return { income, expenses, savings: income - expenses };
    };
    if (!this.previousYearRecords.length) return null;
    const current = sum(this.yearlyRecords.filter((r) => r.year === this.overviewYear));
    const previous = sum(this.previousYearRecords);
    const pct = (key: keyof MonthTotals) =>
      previous[key] === 0 ? null : ((current[key] - previous[key]) / Math.abs(previous[key])) * 100;
    return {
      current,
      previous,
      change_pct: { income: pct('income'), expenses: pct('expenses'), savings: pct('savings') },
    };
  }

  loadComparison(): void {
    const { overviewYear: year, overviewMonth: month } = this;
    this.financialService.getMonthComparison(year, month).subscribe({
      next: (c) => {
        if (year !== this.overviewYear || month !== this.overviewMonth) return; // user moved on
        this.comparison = c;
        this.cdr.markForCheck();
      },
      error: () => {
        if (year !== this.overviewYear || month !== this.overviewMonth) return;
        this.comparison = null;
        this.cdr.markForCheck();
      },
    });
  }

  loadDailyBalance(): void {
    const { overviewYear: year, overviewMonth: month } = this;
    this.financialService.getDailyBalance(year, month).subscribe({
      next: (d) => {
        if (year !== this.overviewYear || month !== this.overviewMonth) return; // user moved on
        this.dailyBalance = d;
        this.initDailyBalanceChart();
      },
      error: () => {
        if (year !== this.overviewYear || month !== this.overviewMonth) return;
        this.dailyBalance = null;
        this.initDailyBalanceChart();
      },
    });
  }

  applyAvailable(a: AvailableMonth): void {
    this.available = a;
    this.projectedBalance = a.projected_balance;
    this.dailyAvgSpend = a.daily_avg_spend;
    this.daysRemaining = a.days_remaining;
  }

  computeAlerts(
    year: number,
    month: number,
    income: number,
    expenses: number,
    savings: number,
  ): void {
    const alerts: typeof this.alerts = [];
    const now = new Date();
    const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
    const monthName = this.monthInText(month);
    const symbol = this.currencyService.symbol;
    const t = (key: string, params?: object) =>
      this.translate.instant(`dashboard.alerts.${key}`, params);

    this.savingsRate = income > 0 ? (savings / income) * 100 : 0;

    if (expenses > income) {
      alerts.push({
        id: 'overspent',
        type: 'danger',
        title: t('overspent.title'),
        message: t('overspent.message', {
          amount: `${symbol}${this.formatCurrency(expenses - income)}`,
          month: monthName,
        }),
      });
    } else if (expenses > income * 0.9) {
      alerts.push({
        id: 'nearLimit',
        type: 'warning',
        title: t('nearLimit.title'),
        message: t('nearLimit.message', {
          amount: `${symbol}${this.formatCurrency(income - expenses)}`,
          month: monthName,
        }),
      });
    }

    if (this.savingsRate < 10 && income > 0) {
      alerts.push({
        id: 'lowSavings',
        type: 'warning',
        title: t('lowSavings.title'),
        message: t('lowSavings.message', {
          rate: this.fmtNum(this.savingsRate, 1, true),
          month: monthName,
        }),
      });
    }

    if (!this.available) {
      // projection not loaded yet: say nothing rather than a misleading "on track"
    } else if (this.projectedBalance < 0) {
      alerts.push({
        id: 'negativeProjection',
        type: 'danger',
        title: t('negativeProjection.title', { month: monthName }),
        message: t('negativeProjection.message', {
          daily: `${symbol}${this.formatCurrency(this.dailyAvgSpend)}`,
          month: monthName,
          amount: `${symbol}${this.formatCurrency(Math.abs(this.projectedBalance))}`,
        }),
      });
    } else if (this.projectedBalance < income * 0.1) {
      alerts.push({
        id: 'tightBalance',
        type: 'warning',
        title: t('tightBalance.title'),
        message: t('tightBalance.message', {
          month: monthName,
          amount: `${symbol}${this.formatCurrency(this.projectedBalance)}`,
        }),
      });
    } else {
      alerts.push({
        id: 'onTrack',
        type: 'info',
        title: t('onTrack.title', { month: monthName }),
        message: t('onTrack.message', {
          amount: `${symbol}${this.formatCurrency(this.projectedBalance)}`,
          month: monthName,
        }),
      });
    }

    if (this.available && isCurrent && this.daysRemaining <= 7 && expenses > income * 0.8) {
      alerts.push({
        id: 'endingSoon',
        type: 'warning',
        title: t('endingSoon.title'),
        message: t('endingSoon.message', { count: this.daysRemaining, month: monthName }),
      });
    }

    this.alerts = alerts;
    this.hasCritical = this.visibleAlerts.some((a) => a.type === 'danger');
    this.alertCount = this.visibleAlerts.filter((a) => a.type !== 'info').length;
  }

  // Scoped to user and month so dismissing in October does not hide the same alert in November.
  // shortcut: dismissed keys are never pruned (a handful per month), clean up if it ever grows.
  // Keyed by a stable id, not the title, which changes with the language.
  private dismissKey(alert: { id: string }): string {
    return `${this.userId()}:${this.overviewYear}-${this.overviewMonth}:${alert.id}`;
  }

  // this.user is set asynchronously; fall back to the stored session so the key never flips from '' to the id.
  private userId(): string {
    if (this.user?.id) return String(this.user.id);
    try {
      return String(JSON.parse(localStorage.getItem('user') || 'null')?.id ?? '');
    } catch {
      return '';
    }
  }

  private loadDismissedAlerts(): Set<string> {
    try {
      return new Set<string>(JSON.parse(localStorage.getItem('vendora.dismissedAlerts') || '[]'));
    } catch {
      return new Set<string>();
    }
  }

  private saveDismissedAlerts(): void {
    try {
      localStorage.setItem('vendora.dismissedAlerts', JSON.stringify([...this.dismissedAlerts]));
    } catch {
      // storage unavailable: the dismissal then only lasts for this page view
    }
  }

  get visibleAlerts() {
    return this.alerts.filter((a) => !this.dismissedAlerts.has(this.dismissKey(a)));
  }

  dismissAlert(alert: { id: string; type: string; title: string; message: string }): void {
    this.dismissedAlerts.add(this.dismissKey(alert));
    this.saveDismissedAlerts();
    this.hasCritical = this.visibleAlerts.some((a) => a.type === 'danger');
    this.alertCount = this.visibleAlerts.filter((a) => a.type !== 'info').length;
  }

  clearAllAlerts(): void {
    this.alerts.forEach((a) => this.dismissedAlerts.add(this.dismissKey(a)));
    this.saveDismissedAlerts();
    this.hasCritical = false;
    this.alertCount = 0;
  }

  get unreadNotifications(): AppNotification[] {
    return this.notifications.filter((n) => !n.is_read);
  }

  // Says what the list below holds, so one generic "Some warnings" is not shown for a single alert.
  get alertsHeading(): string {
    const visible = this.visibleAlerts;
    // Unread server notifications are listed above, so the heading cannot claim "All good!" over them.
    if (visible.length === 0)
      return this.translate.instant(
        this.unreadNotifications.length > 0 ? 'dashboard.heading.new' : 'dashboard.heading.allGood',
      );
    if (this.hasCritical) return this.translate.instant('dashboard.heading.attention');
    const warnings = visible.filter((a) => a.type === 'warning').length;
    if (warnings === 0) return this.translate.instant('dashboard.heading.onTrack');
    return this.translate.instant(
      warnings === 1 ? 'dashboard.heading.oneWarning' : 'dashboard.heading.warnings',
      { count: warnings },
    );
  }

  get bellCount(): number {
    return this.alertCount + this.unreadCount;
  }

  toggleAlerts(): void {
    this.showAlerts = !this.showAlerts;
    if (this.showAlerts) this.notificationService.load().subscribe({ error: () => {} });
  }

  markNotificationRead(n: AppNotification): void {
    this.notificationService.markAsRead(n.id).subscribe({ error: () => {} });
  }

  toggleMonthPicker(): void {
    this.showMonthPicker = !this.showMonthPicker;
    if (this.showMonthPicker) this.pickerYear = this.overviewYear;
  }

  pickMonth(month: number, year = this.pickerYear): void {
    this.showMonthPicker = false;
    this.setMonth(year, month);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.showAlerts && !target.closest('.alerts-panel-wrapper')) this.showAlerts = false;
    if (this.showMonthPicker && !target.closest('.month-picker-wrapper'))
      this.showMonthPicker = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showMonthPicker = false;
    this.showAlerts = false;
  }

  loadExpensesByCategory(): void {
    const month = `${this.overviewYear}-${String(this.overviewMonth).padStart(2, '0')}`;
    this.financialService.getExpensesByCategory(month).subscribe({
      next: (data) => {
        this.expensesByCategory = data;
        this.maxExpense = data.length ? Math.max(...data.map((d) => d.total)) : 1;
        this.updateCategoryBreakdownChart();
        this.cdr.markForCheck();
      },
      error: () => {
        this.expensesByCategory = [];
        this.cdr.markForCheck();
      },
    });
  }

  updateMonthBreakdown(): void {
    this.monthBreakdown = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const record = this.yearlyRecords.find(
        (r) => r.year === this.overviewYear && r.month === month,
      );
      const income = parseFloat(String(record?.monthly_income || 0));
      const expenses = parseFloat(String(record?.monthly_expenses || 0));
      return { month, income, expenses, balance: income - expenses };
    });
  }

  getExpensePct(total: number): number {
    return this.maxExpense > 0 ? Math.round((total / this.maxExpense) * 100) : 0;
  }

  getTotalExpenses(): number {
    return this.expensesByCategory.reduce((s, e) => s + e.total, 0);
  }

  getCategoryPct(total: number): number {
    const t = this.getTotalExpenses();
    return t > 0 ? Math.round((total / t) * 100) : 0;
  }

  getCategoryPctCircle(total: number): number {
    return (this.getCategoryPct(total) / 100) * 94.25;
  }

  get baseIncomeValue(): number {
    return this.monthRecord?.is_custom
      ? parseFloat(String(this.monthRecord.base_income || 0))
      : parseFloat(String(this.user?.monthly_income || 0));
  }

  get baseExpensesValue(): number {
    return this.monthRecord?.is_custom
      ? parseFloat(String(this.monthRecord.base_expenses || 0))
      : parseFloat(String(this.user?.monthly_expenses || 0));
  }

  saveMonthBase(income: string, expenses: string): void {
    const baseIncome = parseFloat(income);
    const baseExpenses = parseFloat(expenses);
    if (!isFinite(baseIncome) || !isFinite(baseExpenses) || baseIncome < 0 || baseExpenses < 0) {
      this.baseError = this.translate.instant('dashboard.base.invalid');
      return;
    }
    this.submitMonthBase({ is_custom: true, base_income: baseIncome, base_expenses: baseExpenses });
  }

  resetMonthToDefault(): void {
    this.submitMonthBase({ is_custom: false });
  }

  private submitMonthBase(change: Partial<FinancialRecord>): void {
    this.savingBase = true;
    this.baseError = '';
    this.financialService
      .saveRecord({ year: this.overviewYear, month: this.overviewMonth, ...change })
      .subscribe({
        next: (record) => {
          const index = this.yearlyRecords.findIndex(
            (r) => r.year === record.year && r.month === record.month,
          );
          if (index >= 0) {
            this.yearlyRecords[index] = record;
          } else {
            this.yearlyRecords.push(record);
          }
          this.savingBase = false;
          this.editingBase = false;
          this.updateMonthBreakdown();
          this.updateOverviewFromRecord(record);
          this.loadMonthInsights();
          this.computeAlerts(
            this.overviewYear,
            this.overviewMonth,
            this.overviewIncome,
            this.overviewExpenses,
            this.overviewSavings,
          );
          this.updateChartsWithRealData();
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.savingBase = false;
          this.baseError = error?.message || this.translate.instant('dashboard.base.saveFailed');
          this.cdr.markForCheck();
        },
      });
  }

  prevMonth(): void {
    let year = this.overviewYear;
    let month = this.overviewMonth - 1;
    if (month < 1) {
      month = 12;
      year--;
    }
    this.setMonth(year, month);
  }

  nextMonth(): void {
    let year = this.overviewYear;
    let month = this.overviewMonth + 1;
    if (month > 12) {
      month = 1;
      year++;
    }
    this.setMonth(year, month);
  }

  setMonth(year: number, month: number): void {
    this.overviewYear = year;
    this.overviewMonth = month;
    this.selectedMonth = `${year}-${String(month).padStart(2, '0')}`;
    this.editingBase = false;
    this.baseError = '';
    this.loadOverviewMonth();
    this.loadExpensesByCategory();
  }

  onMonthChange(monthStr: string): void {
    if (!monthStr) return;
    const [year, month] = monthStr.split('-').map(Number);
    this.setMonth(year, month);
  }

  loadOverviewMonth(): void {
    this.available = null;
    this.loadMonthInsights();
    const record = this.yearlyRecords.find(
      (r) => r.year === this.overviewYear && r.month === this.overviewMonth,
    );
    if (record) {
      this.updateMonthBreakdown();
      this.updateOverviewFromRecord(record);
      this.computeAlerts(
        this.overviewYear,
        this.overviewMonth,
        this.overviewIncome,
        this.overviewExpenses,
        this.overviewSavings,
      );
      this.updateChartsWithRealData();
    } else {
      this.financialService.getYearRecords(this.overviewYear).subscribe({
        next: (records) => {
          this.yearlyRecords = records;
          this.updateMonthBreakdown();
          const r = records.find((rec) => rec.month === this.overviewMonth);
          if (r) {
            this.updateOverviewFromRecord(r);
          } else {
            this.overviewIncome = 0;
            this.overviewExpenses = 0;
            this.overviewSavings = 0;
          }
          this.computeAlerts(
            this.overviewYear,
            this.overviewMonth,
            this.overviewIncome,
            this.overviewExpenses,
            this.overviewSavings,
          );
          this.updateChartsWithRealData();
          this.cdr.markForCheck();
        },
        error: () => {
          this.yearlyRecords = [];
          this.updateMonthBreakdown();
          this.overviewIncome = 0;
          this.overviewExpenses = 0;
          this.overviewSavings = 0;
          this.computeAlerts(this.overviewYear, this.overviewMonth, 0, 0, 0);
          this.updateChartsWithRealData();
          this.cdr.markForCheck();
        },
      });
    }
  }

  formatCurrency(value: number | string | null | undefined): string {
    return this.fmtNum(parseFloat(String(value ?? '')) || 0, 2, true);
  }

  updateChartsWithRealData(): void {
    if (this.incomeExpenseChartInstance && this.yearlyRecords.length > 0) {
      const labels = this.monthNames.map((m) => m.slice(0, 3));
      this.incomeExpenseChartInstance.data.labels = labels;
      this.incomeExpenseChartInstance.data.datasets[0].data = this.monthBreakdown.map(
        (m) => m.income,
      );
      this.incomeExpenseChartInstance.data.datasets[1].data = this.monthBreakdown.map(
        (m) => m.expenses,
      );
      this.incomeExpenseChartInstance.data.datasets[2].data = this.monthBreakdown.map((m) =>
        Math.max(0, m.balance),
      );
      this.incomeExpenseChartInstance.update();
    }
  }

  private chartColors() {
    const dark = this.themeService.dark$.value;
    return dark
      ? { legend: '#b4bdd2', tick: '#9ba5be', grid: 'rgba(255,255,255,0.06)' }
      : { legend: '#4b5563', tick: '#6b7280', grid: 'rgba(0,0,0,0.04)' };
  }

  // Chart.js bakes colours into options at creation, so a mode switch rebuilds the charts.
  private redrawChartsForMode(): void {
    this.initIncomeExpenseChart();
    this.initCategoryBreakdownChart();
    this.initDailyBalanceChart();
    this.updateChartsWithRealData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initIncomeExpenseChart();
      this.initCategoryBreakdownChart();
      this.initDailyBalanceChart();
    }, 200);
  }

  initIncomeExpenseChart(): void {
    if (!this.incomeExpenseChart?.nativeElement) return;
    this.incomeExpenseChartInstance?.destroy();
    const ctx = this.incomeExpenseChart.nativeElement.getContext('2d');
    const symbol = this.currencyService.symbol;

    this.incomeExpenseChartInstance = new (chartConstructor())(ctx, {
      type: 'bar',
      data: {
        labels: this.monthNames.map((m) => m.slice(0, 3)),
        datasets: [
          {
            label: this.translate.instant('dashboard.income'),
            data: this.monthBreakdown.map((m) => m.income),
            backgroundColor: '#2dd4bf',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
          {
            label: this.translate.instant('dashboard.expenses'),
            data: this.monthBreakdown.map((m) => m.expenses),
            backgroundColor: '#f87171',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
          {
            label: this.translate.instant('dashboard.balance'),
            data: this.monthBreakdown.map((m) => Math.max(0, m.balance)),
            backgroundColor: '#818cf8',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              padding: 10,
              font: { size: 11 },
              color: this.chartColors().legend,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb',
            bodyColor: '#d1d5db',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (c: CartesianTooltipItem) =>
                ` ${c.dataset.label}: ${symbol}${c.parsed.y.toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: this.chartColors().tick, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: this.chartColors().grid },
            ticks: {
              color: this.chartColors().tick,
              font: { size: 11 },
              callback: (v: number | string) => symbol + v,
            },
          },
        },
      },
    });
  }

  initCategoryBreakdownChart(): void {
    if (!this.categoryBreakdownChart?.nativeElement) return;
    this.categoryBreakdownChartInstance?.destroy();
    const ctx = this.categoryBreakdownChart.nativeElement.getContext('2d');
    this.categoryBreakdownChartInstance = new (chartConstructor())(ctx, {
      type: 'doughnut',
      data: {
        labels: this.expensesByCategory.map((e) => this.categoryNamePipe.transform(e.category)),
        datasets: [
          {
            data: this.expensesByCategory.map((e) => e.total),
            backgroundColor: this.expensesByCategory.map((e) => e.color),
            borderColor: 'transparent',
            borderWidth: 2,
            hoverOffset: 6,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 10,
              padding: 10,
              font: { size: 11 },
              color: this.chartColors().legend,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb',
            bodyColor: '#d1d5db',
            padding: 10,
            cornerRadius: 8,
            callbacks: { label: (c: RadialTooltipItem) => ` ${c.label}: €${c.parsed.toFixed(2)}` },
          },
        },
      },
    });
  }

  updateCategoryBreakdownChart(): void {
    if (!this.categoryBreakdownChartInstance) {
      this.initCategoryBreakdownChart();
      return;
    }
    this.categoryBreakdownChartInstance.data.labels = this.expensesByCategory.map((e) =>
      this.categoryNamePipe.transform(e.category),
    );
    this.categoryBreakdownChartInstance.data.datasets[0].data = this.expensesByCategory.map(
      (e) => e.total,
    );
    this.categoryBreakdownChartInstance.data.datasets[0].backgroundColor =
      this.expensesByCategory.map((e) => e.color);
    this.categoryBreakdownChartInstance.update();
  }

  // This month against the last one, one point per day; "today" is the last point of the current line.
  initDailyBalanceChart(): void {
    if (!this.dailyBalanceChart?.nativeElement) return;
    this.dailyBalanceChartInstance?.destroy();
    const ctx = this.dailyBalanceChart.nativeElement.getContext('2d');
    const symbol = this.currencyService.symbol;
    const current = this.dailyBalance?.current ?? [];
    const previous = this.dailyBalance?.previous ?? [];
    const days = Math.max(current.length, previous.length);
    const today = current.reduce<number>((last, v, i) => (v === null ? last : i), -1);

    this.dailyBalanceChartInstance = new (chartConstructor())(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: days }, (_, i) => i + 1),
        datasets: [
          {
            label: this.translate.instant('dashboard.charts.thisMonth'),
            data: current,
            borderColor: '#2dd4bf',
            backgroundColor: '#2dd4bf',
            borderWidth: 2,
            tension: 0.25,
            pointRadius: current.map((_, i) => (i === today ? 5 : 0)),
          },
          {
            label: this.translate.instant('dashboard.charts.previousMonth'),
            data: previous,
            borderColor: '#9ca3af',
            borderWidth: 1.5,
            borderDash: [4, 4],
            tension: 0.25,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: this.chartColors().legend, boxWidth: 12 } },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb',
            bodyColor: '#d1d5db',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              title: (items: CartesianTooltipItem[]) =>
                this.translate.instant('dashboard.charts.day', { day: items[0].label }),
              label: (c: CartesianTooltipItem) =>
                ` ${c.dataset.label}: ${symbol}${c.parsed.y.toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: this.chartColors().tick, font: { size: 11 } },
          },
          y: {
            grid: { color: this.chartColors().grid },
            ticks: {
              color: this.chartColors().tick,
              font: { size: 11 },
              callback: (v: number | string) => symbol + v,
            },
          },
        },
      },
    });
  }
}

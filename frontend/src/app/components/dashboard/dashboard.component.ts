import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, HostListener, DestroyRef, ChangeDetectorRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService, FinancialRecord } from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { User } from '../../services/auth.service';
import { CartesianTooltipItem, ChartInstance, RadialTooltipItem, chartConstructor } from '../../models/chart';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent, CurrencySymbolPipe],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  user: User | null = null;
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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

  userInitials = '';

  get overviewBalance(): number { return this.overviewIncome - this.overviewExpenses; }

  get greeting(): string {
    const h = new Date().getHours();
    return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  }

  get firstName(): string { return (this.user?.name || '').split(' ')[0]; }

  // % change against the previous month of the same year; null when there is nothing to compare.
  deltaPct(key: 'income' | 'expenses' | 'balance'): number | null {
    const prev = this.monthBreakdown.find(m => m.month === this.overviewMonth - 1);
    const cur = key === 'income' ? this.overviewIncome : key === 'expenses' ? this.overviewExpenses : this.overviewBalance;
    if (!prev || !prev[key]) return null;
    return ((cur - prev[key]) / Math.abs(prev[key])) * 100;
  }

  @ViewChild('incomeExpenseChart') incomeExpenseChart!: ElementRef;
  @ViewChild('categoryChart') categoryChart!: ElementRef;
  @ViewChild('categoryBreakdownChart') categoryBreakdownChart!: ElementRef;
  @ViewChild('monthlyBalanceChart') monthlyBalanceChart!: ElementRef;

  private incomeExpenseChartInstance?: ChartInstance;
  private categoryChartInstance?: ChartInstance;
  private categoryBreakdownChartInstance?: ChartInstance;
  private monthlyBalanceChartInstance?: ChartInstance;

  expensesByCategory: { category: string; color: string; total: number }[] = [];
  private maxExpense = 0;

  showAlerts = false;
  showMonthPicker = false;
  pickerYear = new Date().getFullYear();
  readonly todayYear = new Date().getFullYear();
  readonly todayMonth = new Date().getMonth() + 1;
  alerts: { type: 'danger' | 'warning' | 'info'; title: string; message: string }[] = [];
  // Persisted in localStorage: alerts are recomputed on every load, so an in-memory set would forget the dismissal.
  dismissedAlerts = this.loadDismissedAlerts();
  hasCritical = false;
  alertCount = 0;
  projectedBalance = 0;
  dailyAvgSpend = 0;
  daysRemaining = 0;
  savingsRate = 0;


  constructor(
    private authService: AuthService,
    private financialService: FinancialService,
    private router: Router,
    private transactionService: TransactionService,
    public currencyService: CurrencyService
  ) {
    this.destroyRef.onDestroy(() => {
      this.incomeExpenseChartInstance?.destroy();
      this.categoryChartInstance?.destroy();
      this.categoryBreakdownChartInstance?.destroy();
      this.monthlyBalanceChartInstance?.destroy();
    });
  }

  ngOnInit(): void {
    this.authService.getUserObservable().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(user => {
      this.user = user;
      if (user?.current_year) this.currentYear = user.current_year;
      if (user?.current_month) this.currentMonth = user.current_month;
      this.overviewYear = this.currentYear;
      this.overviewMonth = this.currentMonth;
      this.selectedMonth = `${this.overviewYear}-${String(this.overviewMonth).padStart(2, '0')}`;
      const name: string = user?.name || '';
      this.userInitials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
      this.cdr.markForCheck();
    });

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.financialService.getCurrentRecord().subscribe({
      next: (record) => {
        this.updateOverviewFromRecord(record);
        this.updateChartsWithRealData();
        this.computeAlerts(this.overviewYear, this.overviewMonth, this.overviewIncome, this.overviewExpenses, this.overviewSavings);
        this.cdr.markForCheck();
      },
      error: () => { this.updateChartsWithRealData(); this.cdr.markForCheck(); }
    });

    this.transactionService.getTransactions({ per_page: 5 }).subscribe({
      next: res => { this.recentTransactions = res.data; this.cdr.markForCheck(); },
      error: () => { this.recentTransactions = []; this.cdr.markForCheck(); }
    });

    this.loadExpensesByCategory();

    this.financialService.getYearRecords(this.overviewYear).subscribe({
      next: (records) => {
        this.yearlyRecords = records;
        this.updateMonthBreakdown();
        this.updateChartsWithRealData();
        this.cdr.markForCheck();
      },
      error: () => { this.yearlyRecords = []; this.updateMonthBreakdown(); this.cdr.markForCheck(); }
    });
  }

  updateOverviewFromRecord(record: FinancialRecord): void {
    this.monthRecord = record;
    this.overviewIncome = parseFloat(String(record.monthly_income || 0));
    this.overviewExpenses = parseFloat(String(record.monthly_expenses || 0));
    this.overviewSavings = parseFloat(String(record.savings || 0));
    this.updateOverviewChart();
  }

  computeAlerts(year: number, month: number, income: number, expenses: number, savings: number): void {
    const alerts: { type: 'danger' | 'warning' | 'info'; title: string; message: string }[] = [];
    const now = new Date();
    const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayOfMonth = isCurrent ? now.getDate() : daysInMonth;
    this.daysRemaining = daysInMonth - dayOfMonth;

    const monthName = this.monthNames[month - 1];

    this.dailyAvgSpend = dayOfMonth > 0 ? expenses / dayOfMonth : 0;
    this.projectedBalance = income - expenses - (this.dailyAvgSpend * this.daysRemaining);
    this.savingsRate = income > 0 ? (savings / income) * 100 : 0;

    if (expenses > income) {
      alerts.push({ type: 'danger', title: 'Expenses exceed income', message: `You've spent ${this.currencyService.symbol}${this.formatCurrency(expenses - income)} more than you earned in ${monthName}.` });
    } else if (expenses > income * 0.9) {
      alerts.push({ type: 'warning', title: 'Spending at 90%+ of income', message: `Only ${this.currencyService.symbol}${this.formatCurrency(income - expenses)} left from your income in ${monthName}.` });
    }

    if (this.savingsRate < 10 && income > 0) {
      alerts.push({ type: 'warning', title: 'Low savings rate', message: `You're saving ${this.savingsRate.toFixed(1)}% of income in ${monthName}. Target is at least 20%.` });
    }

    if (this.projectedBalance < 0) {
      alerts.push({ type: 'danger', title: `Negative ${monthName} projection`, message: `At current daily spend (${this.currencyService.symbol}${this.formatCurrency(this.dailyAvgSpend)}/day), you'll end ${monthName} ${this.currencyService.symbol}${this.formatCurrency(Math.abs(this.projectedBalance))} short.` });
    } else if (this.projectedBalance < income * 0.1) {
      alerts.push({ type: 'warning', title: 'Tight projected balance', message: `Projected end of ${monthName} balance is only ${this.currencyService.symbol}${this.formatCurrency(this.projectedBalance)}.` });
    } else {
      alerts.push({ type: 'info', title: `On track in ${monthName}`, message: `Projected to save ${this.currencyService.symbol}${this.formatCurrency(this.projectedBalance)} by end of ${monthName}.` });
    }

    if (isCurrent && this.daysRemaining <= 7 && expenses > income * 0.8) {
      alerts.push({ type: 'warning', title: 'Month ending soon', message: `${this.daysRemaining} days left in ${monthName}. Watch your spending to stay positive.` });
    }

    this.alerts = alerts;
    this.hasCritical = this.visibleAlerts.some(a => a.type === 'danger');
    this.alertCount = this.visibleAlerts.filter(a => a.type !== 'info').length;
  }

  // Scoped to user and month so dismissing in October does not hide the same alert in November.
  // shortcut: dismissed keys are never pruned (a handful per month), clean up if it ever grows.
  private dismissKey(alert: { title: string }): string {
    return `${this.userId()}:${this.overviewYear}-${this.overviewMonth}:${alert.title}`;
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
    return this.alerts.filter(a => !this.dismissedAlerts.has(this.dismissKey(a)));
  }

  dismissAlert(alert: { type: string; title: string; message: string }): void {
    this.dismissedAlerts.add(this.dismissKey(alert));
    this.saveDismissedAlerts();
    this.hasCritical = this.visibleAlerts.some(a => a.type === 'danger');
    this.alertCount = this.visibleAlerts.filter(a => a.type !== 'info').length;
  }

  clearAllAlerts(): void {
    this.alerts.forEach(a => this.dismissedAlerts.add(this.dismissKey(a)));
    this.saveDismissedAlerts();
    this.hasCritical = false;
    this.alertCount = 0;
  }

  toggleAlerts(): void {
    this.showAlerts = !this.showAlerts;
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
    if (this.showMonthPicker && !target.closest('.month-picker-wrapper')) this.showMonthPicker = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showMonthPicker = false;
    this.showAlerts = false;
  }

  loadExpensesByCategory(): void {
    const month = `${this.overviewYear}-${String(this.overviewMonth).padStart(2, '0')}`;
    this.financialService.getExpensesByCategory(month).subscribe({
      next: data => {
        this.expensesByCategory = data;
        this.maxExpense = data.length ? Math.max(...data.map(d => d.total)) : 1;
        this.updateCategoryBreakdownChart();
        this.cdr.markForCheck();
      },
      error: () => { this.expensesByCategory = []; this.cdr.markForCheck(); }
    });
  }

  updateMonthBreakdown(): void {
    this.monthBreakdown = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const record = this.yearlyRecords.find(r => r.year === this.overviewYear && r.month === month);
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
      this.baseError = 'Enter amounts of zero or more.';
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
    this.financialService.saveRecord({ year: this.overviewYear, month: this.overviewMonth, ...change }).subscribe({
      next: (record) => {
        const index = this.yearlyRecords.findIndex(r => r.year === record.year && r.month === record.month);
        if (index >= 0) { this.yearlyRecords[index] = record; } else { this.yearlyRecords.push(record); }
        this.savingBase = false;
        this.editingBase = false;
        this.updateMonthBreakdown();
        this.updateOverviewFromRecord(record);
        this.computeAlerts(this.overviewYear, this.overviewMonth, this.overviewIncome, this.overviewExpenses, this.overviewSavings);
        this.updateChartsWithRealData();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.savingBase = false;
        this.baseError = error?.message || 'Could not save this month. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  prevMonth(): void {
    let year = this.overviewYear;
    let month = this.overviewMonth - 1;
    if (month < 1) { month = 12; year--; }
    this.setMonth(year, month);
  }

  nextMonth(): void {
    let year = this.overviewYear;
    let month = this.overviewMonth + 1;
    if (month > 12) { month = 1; year++; }
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
    const record = this.yearlyRecords.find(r => r.year === this.overviewYear && r.month === this.overviewMonth);
    if (record) {
      this.updateMonthBreakdown();
      this.updateOverviewFromRecord(record);
      this.computeAlerts(this.overviewYear, this.overviewMonth, this.overviewIncome, this.overviewExpenses, this.overviewSavings);
      this.updateChartsWithRealData();
    } else {
      this.financialService.getYearRecords(this.overviewYear).subscribe({
        next: (records) => {
          this.yearlyRecords = records;
          this.updateMonthBreakdown();
          const r = records.find(rec => rec.month === this.overviewMonth);
          if (r) { this.updateOverviewFromRecord(r); }
          else { this.overviewIncome = 0; this.overviewExpenses = 0; this.overviewSavings = 0; this.updateOverviewChart(); }
          this.computeAlerts(this.overviewYear, this.overviewMonth, this.overviewIncome, this.overviewExpenses, this.overviewSavings);
          this.updateChartsWithRealData();
          this.cdr.markForCheck();
        },
        error: () => {
          this.yearlyRecords = [];
          this.updateMonthBreakdown();
          this.overviewIncome = 0; this.overviewExpenses = 0; this.overviewSavings = 0; this.updateOverviewChart();
          this.computeAlerts(this.overviewYear, this.overviewMonth, 0, 0, 0);
          this.updateChartsWithRealData();
          this.cdr.markForCheck();
        }
      });
    }
  }

  formatCurrency(value: number | string | null | undefined): string {
    return (parseFloat(String(value ?? '')) || 0).toFixed(2);
  }

  updateChartsWithRealData(): void {
    if (this.incomeExpenseChartInstance && this.yearlyRecords.length > 0) {
      const labels = this.monthNames.map(m => m.slice(0, 3));
      this.incomeExpenseChartInstance.data.labels = labels;
      this.incomeExpenseChartInstance.data.datasets[0].data = this.monthBreakdown.map(m => m.income);
      this.incomeExpenseChartInstance.data.datasets[1].data = this.monthBreakdown.map(m => m.expenses);
      this.incomeExpenseChartInstance.data.datasets[2].data = this.monthBreakdown.map(m => Math.max(0, m.balance));
      this.incomeExpenseChartInstance.update();
    }
    this.updateOverviewChart();
    this.updateMonthlyBalanceChart();
  }

  updateOverviewChart(): void {
    if (this.categoryChartInstance) {
      this.categoryChartInstance.data.datasets[0].data = [
        this.overviewIncome, this.overviewExpenses, Math.max(0, this.overviewSavings)
      ];
      this.categoryChartInstance.update();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initIncomeExpenseChart();
      this.initCategoryChart();
      this.initCategoryBreakdownChart();
      this.initMonthlyBalanceChart();
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
        labels: this.monthNames.map(m => m.slice(0, 3)),
        datasets: [
          {
            label: 'Income',
            data: this.monthBreakdown.map(m => m.income),
            backgroundColor: '#2dd4bf',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          },
          {
            label: 'Expenses',
            data: this.monthBreakdown.map(m => m.expenses),
            backgroundColor: '#f87171',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          },
          {
            label: 'Balance',
            data: this.monthBreakdown.map(m => Math.max(0, m.balance)),
            backgroundColor: '#818cf8',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, labels: { usePointStyle: true, boxWidth: 8, padding: 10, font: { size: 11 }, color: '#6b7280' } },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: { label: (c: CartesianTooltipItem) => ` ${c.dataset.label}: ${symbol}${c.parsed.y.toFixed(2)}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
          y: {
            beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#9ca3af', font: { size: 11 }, callback: (v: number | string) => symbol + v }
          }
        }
      }
    });
  }

  initCategoryChart(): void {
    if (!this.categoryChart?.nativeElement) return;
    this.categoryChartInstance?.destroy();
    const ctx = this.categoryChart.nativeElement.getContext('2d');
    this.categoryChartInstance = new (chartConstructor())(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Income', 'Expenses', 'Savings'],
        datasets: [{
          data: [this.overviewIncome, this.overviewExpenses, Math.max(0, this.overviewSavings)],
          backgroundColor: ['#2dd4bf', '#f87171', '#818cf8'],
          borderColor: 'transparent',
          borderWidth: 3,
          hoverOffset: 6,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: { label: (c: RadialTooltipItem) => ` ${c.label}: €${c.parsed.toFixed(2)}` }
          }
        }
      }
    });
  }

  initCategoryBreakdownChart(): void {
    if (!this.categoryBreakdownChart?.nativeElement) return;
    this.categoryBreakdownChartInstance?.destroy();
    const ctx = this.categoryBreakdownChart.nativeElement.getContext('2d');
    this.categoryBreakdownChartInstance = new (chartConstructor())(ctx, {
      type: 'doughnut',
      data: {
        labels: this.expensesByCategory.map(e => e.category),
        datasets: [{
          data: this.expensesByCategory.map(e => e.total),
          backgroundColor: this.expensesByCategory.map(e => e.color),
          borderColor: 'transparent',
          borderWidth: 2,
          hoverOffset: 6,
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, padding: 10, font: { size: 11 }, color: '#6b7280' } },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: { label: (c: RadialTooltipItem) => ` ${c.label}: €${c.parsed.toFixed(2)}` }
          }
        }
      }
    });
  }

  updateCategoryBreakdownChart(): void {
    if (!this.categoryBreakdownChartInstance) {
      this.initCategoryBreakdownChart();
      return;
    }
    this.categoryBreakdownChartInstance.data.labels = this.expensesByCategory.map(e => e.category);
    this.categoryBreakdownChartInstance.data.datasets[0].data = this.expensesByCategory.map(e => e.total);
    this.categoryBreakdownChartInstance.data.datasets[0].backgroundColor = this.expensesByCategory.map(e => e.color);
    this.categoryBreakdownChartInstance.update();
  }

  initMonthlyBalanceChart(): void {
    if (!this.monthlyBalanceChart?.nativeElement) return;
    this.monthlyBalanceChartInstance?.destroy();
    const ctx = this.monthlyBalanceChart.nativeElement.getContext('2d');
    const symbol = this.currencyService.symbol;
    const data = this.monthBreakdown.map(m => m.balance);
    const colors = this.monthBreakdown.map(m => m.balance >= 0 ? '#10b981' : '#ef4444');

    this.monthlyBalanceChartInstance = new (chartConstructor())(ctx, {
      type: 'bar',
      data: {
        labels: this.monthNames.map(m => m.slice(0, 3)),
        datasets: [{
          label: 'Balance',
          data,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: { label: (c: CartesianTooltipItem) => ` Balance: ${symbol}${c.parsed.y.toFixed(2)}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9ca3af', font: { size: 11 }, callback: (v: number | string) => symbol + v } }
        }
      }
    });
  }

  updateMonthlyBalanceChart(): void {
    if (!this.monthlyBalanceChartInstance) {
      this.initMonthlyBalanceChart();
      return;
    }
    this.monthlyBalanceChartInstance.data.datasets[0].data = this.monthBreakdown.map(m => m.balance);
    this.monthlyBalanceChartInstance.data.datasets[0].backgroundColor = this.monthBreakdown.map(m => m.balance >= 0 ? '#10b981' : '#ef4444');
    this.monthlyBalanceChartInstance.update();
  }
}

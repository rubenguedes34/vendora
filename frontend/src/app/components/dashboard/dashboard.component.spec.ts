import { provideTestTranslate } from '../../../testing/translate-testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardComponent } from './dashboard.component';
import { TransactionService } from '../../services/transaction.service';

const STORAGE_KEY = 'vendora.dismissedAlerts';

// Only the alert dismissal logic is covered; the template and charts are not rendered.
describe('DashboardComponent alert dismissal', () => {
  function create(): DashboardComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTranslate(),
      ],
    });
    TestBed.overrideComponent(DashboardComponent, { set: { template: '' } });

    const component = TestBed.createComponent(DashboardComponent).componentInstance;
    component.overviewYear = 2026;
    component.overviewMonth = 10;
    // Income 1000 / expenses 950 triggers the "Spending at 90%+ of income" warning.
    component.computeAlerts(2026, 10, 1000, 950, 50);
    return component;
  }

  beforeEach(() => localStorage.removeItem(STORAGE_KEY));

  it('hides a dismissed alert and keeps it hidden after a reload', () => {
    const first = create();
    const alert = first.visibleAlerts.find((a) => a.title === 'Spending at 90%+ of income')!;
    expect(alert).toBeTruthy();

    first.dismissAlert(alert);
    expect(first.visibleAlerts.some((a) => a.title === alert.title)).toBe(false);

    // A new component instance is what a page reload produces.
    const reloaded = create();
    expect(reloaded.visibleAlerts.some((a) => a.title === alert.title)).toBe(false);
  });

  it('does not hide the same alert in another month', () => {
    const first = create();
    first.dismissAlert(first.visibleAlerts.find((a) => a.title === 'Spending at 90%+ of income')!);

    const other = create();
    other.overviewMonth = 11;
    other.computeAlerts(2026, 11, 1000, 950, 50);

    expect(other.visibleAlerts.some((a) => a.title === 'Spending at 90%+ of income')).toBe(true);
  });

  it('clear all hides every alert and zeroes the badge', () => {
    const component = create();
    component.clearAllAlerts();

    expect(component.visibleAlerts).toEqual([]);
    expect(component.alertCount).toBe(0);
    expect(create().visibleAlerts).toEqual([]);
  });
});

describe('DashboardComponent month handling', () => {
  function create(): DashboardComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestTranslate(),
      ],
    });
    TestBed.overrideComponent(DashboardComponent, { set: { template: '' } });
    return TestBed.createComponent(DashboardComponent).componentInstance;
  }

  afterEach(() => localStorage.clear());

  it('treats current_year/current_month sent as strings as the current month', () => {
    const now = new Date();
    localStorage.setItem('token', 't');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        name: 'A',
        email: 'a@a.com',
        current_year: String(now.getFullYear()),
        current_month: String(now.getMonth() + 1),
      }),
    );
    const component = create();
    component.ngOnInit();

    expect(component.overviewYear).toBe(now.getFullYear());
    expect(component.overviewMonth).toBe(now.getMonth() + 1);
  });

  it('deltaPct reads the backend comparison: null without one, an object (even at 0%) otherwise', () => {
    const component = create();
    expect(component.deltaPct('income')).toBeNull();

    const totals = { income: 100, expenses: 50, savings: 50 };
    component.comparison = {
      current: totals,
      previous: totals,
      change_pct: { income: 0, expenses: null, savings: 12.5 },
    };
    expect(component.deltaPct('income')).toEqual({ pct: 0 });
    expect(component.deltaPct('expenses')).toBeNull();
    expect(component.deltaPct('savings')).toEqual({ pct: 12.5 });
  });

  it('exports the selected month: CSV over its date range, PDF by month and currency symbol', () => {
    const component = create();
    const transactions = TestBed.inject(TransactionService);
    const csv = vi.spyOn(transactions, 'exportTransactions').mockImplementation(() => undefined);
    const pdf = vi.spyOn(transactions, 'exportMonthlyPdf').mockImplementation(() => undefined);
    component.overviewYear = 2024;
    component.overviewMonth = 2;

    component.exportMonth('csv');
    expect(csv).toHaveBeenCalledWith({ date_from: '2024-02-01', date_to: '2024-02-29' });

    component.exportMonth('pdf');
    expect(pdf).toHaveBeenCalledWith('2024-02', expect.any(String));
  });

  it('compares the year so far with the same months of the year before', () => {
    const component = create();
    const rec = (year: number, month: number, income: number, expenses: number) =>
      ({ year, month, monthly_income: income, monthly_expenses: expenses }) as never;
    component.overviewYear = 2026;
    component.overviewMonth = 2;
    expect(component.yearToDate).toBeNull();

    component.previousYearRecords = [
      rec(2025, 1, 100, 50),
      rec(2025, 2, 100, 50),
      rec(2025, 3, 999, 999),
    ];
    component.yearlyRecords = [rec(2026, 1, 150, 50), rec(2026, 2, 150, 100)];

    const ytd = component.yearToDate!;
    expect(ytd.current).toEqual({ income: 300, expenses: 150, savings: 150 });
    expect(ytd.previous).toEqual({ income: 200, expenses: 100, savings: 100 }); // March is not counted
    expect(ytd.change_pct.income).toBe(50);
    expect(ytd.change_pct.savings).toBe(50);
  });

  it('only premium users and admins can export the PDF', () => {
    const component = create();
    const as = (roles?: string[]) => {
      component.user = { id: 1, name: 'A', email: 'a@a.com', roles };
      return component.canExportPdf;
    };

    expect(as(['user'])).toBe(false);
    expect(as(undefined)).toBe(false);
    expect(as(['premium'])).toBe(true);
    expect(as(['admin'])).toBe(true);
  });

  it('pickMonth closes the picker and switches the overview month', () => {
    const component = create();
    component.yearlyRecords = [];
    component.showMonthPicker = true;
    component.pickMonth(5, 2025);

    expect(component.showMonthPicker).toBe(false);
    expect(component.overviewMonth).toBe(5);
    expect(component.overviewYear).toBe(2025);
  });

  it('raises projection alerts only once the backend projection is loaded', () => {
    const component = create();
    const titles = () => component.alerts.map((a) => a.title);

    component.computeAlerts(2026, 10, 1000, 900, 100);
    expect(titles().some((t) => t.includes('projection') || t.includes('On track'))).toBe(false);

    component.applyAvailable({
      year: 2026,
      month: 10,
      available: 100,
      days_remaining: 10,
      pending_income: 0,
      pending_expenses: 50,
      daily_avg_spend: 8,
      projected_balance: -30,
      daily_allowance: 5,
    });
    component.computeAlerts(2026, 10, 1000, 900, 100);
    expect(component.projectedBalance).toBe(-30);
    expect(titles()).toContain('Negative October projection');
  });

  it('bell count adds unread server notifications to the calculated alerts', () => {
    const component = create();
    component.alertCount = 2;
    component.unreadCount = 3;
    component.notifications = [
      {
        id: 1,
        type: 't',
        title: 'a',
        body: null,
        data: {},
        is_read: false,
        read_at: null,
        created_at: '',
      },
      {
        id: 2,
        type: 't',
        title: 'b',
        body: null,
        data: {},
        is_read: true,
        read_at: null,
        created_at: '',
      },
    ];

    expect(component.bellCount).toBe(5);
    expect(component.unreadNotifications.map((n) => n.id)).toEqual([1]);
  });

  it('alert heading reflects what is listed', () => {
    const component = create();
    // Everything spent is the monthly base, so nothing is extrapolated: 90%+ spending, low savings and a tight projected balance.
    component.user = {
      id: 1,
      name: 'A',
      email: 'a@a.com',
      monthly_income: 1000,
      monthly_expenses: 950,
    } as never;
    // A past month, so the "month ending soon" warning (current month only) cannot make this date-dependent.
    component.overviewYear = 2025;
    component.overviewMonth = 1;
    component.applyAvailable({
      year: 2025,
      month: 1,
      available: 50,
      days_remaining: 0,
      pending_income: 0,
      pending_expenses: 0,
      daily_avg_spend: 0,
      projected_balance: 50,
      daily_allowance: 0,
    });
    component.computeAlerts(2025, 1, 1000, 950, 50);
    expect(component.hasCritical).toBe(false);
    expect(component.alertsHeading).toBe('3 warnings');

    component.clearAllAlerts();
    expect(component.alertsHeading).toBe('All good!');
  });

  it('asks for recent transactions with a per_page the API accepts and shows five', () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'A', email: 'a@a.com' }));
    const component = create();
    component.ngOnInit();

    const req = TestBed.inject(HttpTestingController).expectOne((r) =>
      /\/transactions\?per_page=\d+$/.test(r.url),
    );
    // IndexTransactionRequest only allows 10, 20, 50 or 100.
    expect(['10', '20', '50', '100']).toContain(req.request.url.split('per_page=')[1]);

    const rows = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    req.flush({ data: rows, current_page: 1, last_page: 1, per_page: 10, total: 10 });
    expect(component.recentTransactions.length).toBe(5);
  });

  it('heading is not "All good!" while unread server notifications are listed', () => {
    const component = create();
    component.alerts = [];
    component.notifications = [
      {
        id: 1,
        type: 'budget_exceeded',
        title: 'Budget exceeded',
        body: null,
        data: {},
        is_read: false,
        read_at: null,
        created_at: '',
      },
    ];
    expect(component.alertsHeading).toBe('New notifications');

    component.notifications = [{ ...component.notifications[0], is_read: true }];
    expect(component.alertsHeading).toBe('All good!');
  });
});

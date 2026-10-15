import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardComponent } from './dashboard.component';

const STORAGE_KEY = 'vendora.dismissedAlerts';

// Only the alert dismissal logic is covered; the template and charts are not rendered.
describe('DashboardComponent alert dismissal', () => {
  function create(): DashboardComponent {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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
      JSON.stringify({ id: 1, name: 'A', email: 'a@a.com', current_year: String(now.getFullYear()), current_month: String(now.getMonth() + 1) })
    );
    const component = create();
    component.ngOnInit();

    expect(component.overviewYear).toBe(now.getFullYear());
    expect(component.overviewMonth).toBe(now.getMonth() + 1);

    component.computeAlerts(component.overviewYear, component.overviewMonth, 1000, 500, 500);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    expect(component.daysRemaining).toBe(daysInMonth - now.getDate());
  });

  it('deltaPct returns null without a previous month and an object (even at 0%) otherwise', () => {
    const component = create();
    component.overviewMonth = 3;
    component.overviewIncome = 100;
    component.monthBreakdown = [];
    expect(component.deltaPct('income')).toBeNull();

    component.monthBreakdown = [{ month: 2, income: 100, expenses: 0, balance: 0 }];
    expect(component.deltaPct('income')).toEqual({ pct: 0 });

    component.overviewIncome = 150;
    expect(component.deltaPct('income')).toEqual({ pct: 50 });
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

  it('projects only transaction spend, not the monthly base, over the remaining days', () => {
    const now = new Date();
    const component = create();
    component.user = { id: 1, name: 'A', email: 'a@a.com', monthly_income: 1350, monthly_expenses: 1300 } as never;

    // Base 1300 plus 0 in transactions: nothing to extrapolate, so the month ends on its plan.
    component.computeAlerts(now.getFullYear(), now.getMonth() + 1, 1350, 1300, 50);
    expect(component.dailyAvgSpend).toBe(0);
    expect(component.projectedBalance).toBe(50);

    // 100 of transactions on top of the base is extrapolated over the days left.
    component.computeAlerts(now.getFullYear(), now.getMonth() + 1, 1350, 1400, -50);
    const expected = 1350 - 1400 - (100 / now.getDate()) * component.daysRemaining;
    expect(component.projectedBalance).toBeCloseTo(expected, 6);
  });
});

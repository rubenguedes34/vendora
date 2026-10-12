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

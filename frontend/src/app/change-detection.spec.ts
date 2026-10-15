import { AccountComponent } from './components/account/account.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { QuickAddComponent } from './components/shared/quick-add/quick-add.component';
import { SidebarComponent } from './components/shared/sidebar/sidebar.component';
import { TransactionsComponent } from './components/transactions/transactions.component';

// Angular 21+ makes components OnPush unless they opt out. These pages mutate plain fields in HTTP/timer
// callbacks, so under OnPush they stayed stale until the next click (e.g. a stuck "Saving...").
describe('change detection', () => {
  it('keeps the stateful pages on the Eager strategy', () => {
    for (const component of [
      AccountComponent,
      DashboardComponent,
      QuickAddComponent,
      SidebarComponent,
      TransactionsComponent,
    ]) {
      expect(
        (component as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp.onPush,
        component.name,
      ).toBe(false);
    }
  });
});

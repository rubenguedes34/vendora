# Mobile Responsiveness Audit & Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Every screen of the Angular SPA is usable at phone width (360, 390) and tablet (768) with no horizontal page scroll, no clipped content, and tap targets >= 44px.

**Architecture:** Audit first with a fixed checklist + a console probe per screen (Claude in Chrome / Playwright), record findings in one table, then fix per screen group with Tailwind responsive classes only (no new CSS framework, no refactors). Re-verify each screen at the same viewports.

**Tech Stack:** Angular 22 standalone, Tailwind 3 (theme CSS vars), Chart.js, Vitest.

**Spec:** the request in chat ("check all screens, login to dashboard, all tabs, account, ai support").

## Global Constraints

- Viewports: 360x640, 390x844, 768x1024. Desktop (>=1280) must not regress.
- Frontend only; no API/backend change. Keep both themes working (theme picker).
- Minimal diffs: add/adjust Tailwind classes, don't restructure components.
- Don't commit/push unless Ruben asks.
- Verify: `cd frontend && npm run build && npm test -- --watch=false`.

## Review Focus

- Wide data (tables, transaction rows, net-worth table at `net-worth.component.html`) overflowing the viewport.
- Modals/forms (quick-add, add transaction/investment, currency picker) taller or wider than the screen; keyboard covering inputs.
- Chart.js canvases not resizing (fixed width/height) on rotate/narrow.
- Fixed elements colliding: quick-add FAB vs scroll-top vs footer vs AI chat input.
- Sidebar/nav: reachable and closable on mobile; no hidden routes.

## Screens (from `app.routes.ts` + components)

Auth: `/login`, `/register`, `/auth/callback`, `/setup`
App: `/dashboard`, `/transactions`, `/budgets`, `/investments`, `/allocation`, `/recurrent-transactions`, `/net-worth`, `/notifications` (+ alert rules), `/health-score`, `/ai-support`, `/account`
Shared: sidebar, footer, quick-add, scroll-top, theme-picker, currency-picker.

Heaviest templates (most risk): investments (1125 lines), dashboard (914), transactions (841), budget (421), net-worth (388, has a `<table>`), account (343).

---

### Task 1: Audit (no code changes)

**Files:** Create `docs/superpowers/plans/2026-10-15-mobile-audit-findings.md`

- [ ] **Step 1:** Start stack (`docker compose up` or `ng serve` + `php artisan serve`) and log in with a seeded user; confirm `/login` loads.
- [ ] **Step 2:** For each screen x each viewport, resize and run this probe via `javascript_tool`; expected `overflow: []` and `hOverflow: false`:
  ```js
  ({hOverflow: document.documentElement.scrollWidth > innerWidth,
    overflow: [...document.querySelectorAll('body *')]
      .filter(e => e.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 8).map(e => e.tagName + '.' + e.className.toString().slice(0, 60)),
    smallTargets: [...document.querySelectorAll('button,a,input,select')]
      .filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.height < 40 || r.width < 40) }).length})
  ```
- [ ] **Step 3:** Screenshot each screen; eyeball: truncated text, overlapping fixed elements, unreadable charts, modals cut off. Open every modal/dropdown/form on that screen.
- [ ] **Step 4:** Write findings table (screen | viewport | issue | file:line | severity).
- Note: Chrome's `resize_window` may refuse widths below ~500px; if so use the Playwright MCP `browser_resize` for 360/390.

### Task 2: Fix shell + auth (login, register, setup, sidebar, footer, quick-add, scroll-top, pickers)

**Files:** Modify `frontend/src/app/components/{login,register,setup}/*.html`, `shared/{sidebar,footer,quick-add,scroll-top}/*`, `app.html` as findings dictate.

- [ ] **Step 1:** Fix each Task 1 finding for these screens with responsive Tailwind classes (`w-full sm:w-auto`, `flex-col sm:flex-row`, `p-4 sm:p-6`, `min-h-[44px]`).
- [ ] **Step 2:** Re-run probe at 3 viewports; expect no overflow.
- [ ] **Step 3:** `npm run build && npm test -- --watch=false` passes.

### Task 3: Fix dashboard + notifications + health-score + account + ai-support

**Files:** Modify matching `frontend/src/app/components/{dashboard,notifications,health-score,account,ai-support}/*.html` (+ `.ts` only if a Chart.js option like `maintainAspectRatio` needs it).

- [ ] **Step 1:** Fix Task 1 findings (grids -> `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, charts in a `relative w-full` container with fixed height, chat input pinned with safe-area padding).
- [ ] **Step 2:** Re-run probe + screenshots at 3 viewports.
- [ ] **Step 3:** Build + tests pass.

### Task 4: Fix transactions + recurrent + budgets

**Files:** Modify `frontend/src/app/components/{transactions,recurrent-transactions,budget}/*.html`.

- [ ] **Step 1:** Fix findings (rows become stacked cards or get `overflow-x-auto` wrapper; filter bars wrap; modals `max-h-[90vh] overflow-y-auto`).
- [ ] **Step 2:** Re-run probe + screenshots.
- [ ] **Step 3:** Build + tests pass.

### Task 5: Fix investments + allocation + net-worth

**Files:** Modify `frontend/src/app/components/{investments,allocation,net-worth}/*.html`.

- [ ] **Step 1:** Fix findings (net-worth `<table>` wrapped in `overflow-x-auto` or card layout; investment lists/forms; allocation charts).
- [ ] **Step 2:** Re-run probe + screenshots.
- [ ] **Step 3:** Build + tests pass.

### Task 6: Final sweep

- [ ] **Step 1:** Full pass of all screens x 3 viewports, both themes, plus desktop 1440 regression check.
- [ ] **Step 2:** `cd frontend && npm run build && npm test -- --watch=false`; `graphify update .`.
- [ ] **Step 3:** Show diff summary to Ruben; wait for commit instruction.

---

Task order rationale: audit gates everything (we don't know the real breakage yet); tasks 2-5 are independent per screen group and can run in parallel subagents.

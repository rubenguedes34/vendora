# Bank statement import (ActivoBank PDF)

Drop a monthly "Extrato combinado" PDF, review a preview, import the ticked rows as transactions.
Original design and decisions: `docs/superpowers/specs/2026-10-18-bank-statement-import-design.md` (local).

## Flow

1. `POST /api/transactions/import/preview` (multipart `file`, PDF, size capped by `config('vendora.max_upload_kb')`).
   Parses and returns `period`, `reconciliation`, and `rows`. **Writes nothing.**
2. The user ticks rows and picks a category per row in the preview.
3. `POST /api/transactions/import` (JSON `rows`, 1-500). Creates them in one DB transaction; any failure
   rolls everything back. Returns `{imported: n}` with 201.

Both routes: `permission:import statements` (admin only for now) + `throttle:import` (10/min/user), and sit
before `apiResource('transactions')` in `routes/api.php`.

## Backend pieces

- `PdfTextExtractor` (interface) bound to `SmalotPdfTextExtractor` in `AppServiceProvider`.
- `BankStatementParser` -> `ParsedStatement`: reads lines, takes the year from the header, skips carry-over
  rows. **Debit vs credit comes from the running balance** (new balance - previous), not column position.
  The opening/closing balances must reconcile or parsing fails.
- `StatementImportAnalyzer`: per row adds `type`, `is_transfer`, `is_duplicate`, `suggested_category_id`.
- `StatementParseException`: message is a fixed code; the controller turns it into `messages.import_<code>`
  (422 with `code`). **Never put statement text in an exception, response or log.**
- `TransactionImportController`, `ImportPreviewRequest`, `ImportTransactionsRequest`.

## Rules

- Own-account transfer: >= 2 name tokens (3+ chars) of `users.name` in the description, or a keyword
  (`revolut`, `millennium`). Transfers start unticked; if ticked they import as plain income/expense (there is
  no transfer type).
- Duplicates are **flagged, not dropped**: same date + amount + type + normalised description, count-aware.
  Flagged rows start unticked. `import` does not filter duplicates; the preview is where they surface.
- Category suggestion: the category of the user's latest transaction with the same description and type.
  A row needs a category to be imported; rows without one start unticked.
- `amount` is stored unsigned; `type` carries the sign. `category_id` must match the type
  (`Category::assertMatchesTransactionType`).
- Descriptions are trimmed, whitespace-normalised, cut to 255 chars before comparison.

## Frontend

- `components/transactions/statement-import.ts`: pure helpers (`toImportRows`, `withCategory`,
  `importableRows`, `categoriesForType`) with `statement-import.spec.ts`.
- `TransactionsComponent` hosts the panel; `TransactionService` has the preview/import calls.
- The button is hidden unless the user is admin: a UI hint only, the backend permission is the authority.
- i18n keys in `frontend/public/i18n/{en,pt}/transactions.json`; the parity spec
  `frontend/src/app/i18n/i18n-keys.spec.ts` must pass.

## Extending

- Second bank: add a parser behind the same `ParsedStatement` shape; today only ActivoBank exists.
- Opening it to other roles: `givePermissionTo('import statements')`, no code change (permission migration
  `2026_10_18_120000_add_import_statements_permission.php` + `RoleSeeder`).

Tests: `Unit/BankStatementParserTest`, `Unit/SmalotPdfTextExtractorTest`, `Feature/StatementImport*Test`,
`Feature/TransactionImport{Preview,Store}Test`, fixtures in `tests/fixtures/`.

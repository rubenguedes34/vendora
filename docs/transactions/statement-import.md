# Bank statement import (ActivoBank PDF)

Drop a monthly "Extrato combinado" PDF, review a preview, import the ticked rows as transactions.
Original design and decisions: `docs/superpowers/specs/2026-10-18-bank-statement-import-design.md` (local).

## Flow

1. `POST /api/transactions/import/preview` (multipart `file`, PDF, size capped by `config('vendora.max_upload_kb')`).
   Parses and returns `period`, `reconciliation`, `rows`, `other_categories` (`{income, expense}` ids of "Other Income" /
   "Other Expenses", the fallback per type), `file_hash` (sha256 of the PDF) and `previous_import`
   (`{imported_at, rows_imported}` when the same file was imported before, else `null`). **Writes nothing.**
2. `POST /api/transactions/import/suggest` (JSON `rows` of `{description, type}`): optional AI categories, see
   "AI suggestions". The SPA calls it right after the preview.
3. The user ticks rows and picks a category per row in the preview.
4. `POST /api/transactions/import` (JSON `rows`, 1-500, each with optional `notes` and
   `source_description` (the bank's own text, kept when the user renames the movement); optional
   `statement {hash, from, to}` from the preview). Creates them in one DB transaction; any failure
   rolls everything back (monthly totals are re-summed once per affected month, not per row). With `statement` it also stores a `statement_imports` record (hash, period, row count),
   which is what `previous_import` reads. Returns `{imported: n}` with 201.

All three routes: `permission:import statements` (admin only for now) + `throttle:import` (10/min/user), and sit
before `apiResource('transactions')` in `routes/api.php`.

## Backend pieces

- `PdfTextExtractor` (interface) bound to `SmalotPdfTextExtractor` in `AppServiceProvider`.
- `BankStatementParser` -> `ParsedStatement`: reads lines, takes the year from the header, skips carry-over
  rows. **Debit vs credit comes from the running balance** (new balance - previous), not column position.
  The opening/closing balances must reconcile or parsing fails. Overdraft (negative balance) statements are
  not supported: they fail as `balance_mismatch`.
- `StatementImportAnalyzer`: per row adds `type`, `is_transfer`, `is_duplicate`, `suggested_category_id`.
- `StatementParseException`: message is a fixed code; the controller turns it into `messages.import_<code>`
  (422 with `code`). **Never put statement text in an exception, response or log.**
- `TransactionImportController`, `ImportPreviewRequest`, `ImportTransactionsRequest`.
- `StatementImport` model (`user->statementImports()`): the light record behind `previous_import`.

## AI suggestions

- `StatementCategorizer`: groups rows by (type, description), asks in chunks of 25, stops starting new chunks
  after ~150 s (answered chunks are kept). Each id is checked against real categories and the row type; the model
  only proposes.
- `LaravelStatementAi` runs on **local Ollama only**: no suggestions if the provider is not `ollama`, an Ollama
  API key is set, or a model name contains "cloud" (descriptions can hold people's names). Models and timeout:
  `AI_STATEMENT_MODELS` / `AI_STATEMENT_TIMEOUT`, falling back to the support chat's.
- One run per user (`Cache::lock('statement-ai:<id>')`, TTL 600 s). A second request waits `ai.statement.lock_wait` (60 s),
  then answers `busy: true`. Worst case on the server: 60 s wait + 150 s budget + one more model call (120 s);
  the SPA timeout (360 s) is kept above that, so change them together. This assumes
  `AI_STATEMENT_TIMEOUT` x number of models <= 120 s (the compose default is one model at 120 s); with more, raise the
  SPA timeout or lower the budget.
- Response: `available`, `busy`, `suggestions` (one `{category_id}` per row, same order). No model or
  failure = `available: false`, never an error status.

## Rules

- Own-account transfer: >= 2 name tokens (3+ chars) of `users.name` in the description, or a keyword
  (`revolut`, `millennium`). Transfers start unticked; if ticked they import as plain income/expense (there is
  no transfer type).
- Duplicates are **flagged, not dropped**: same date + amount + type + normalised description, count-aware. The comparison uses the bank's text
  (`transactions.source_description`, else `description` for manually entered ones), so renaming a movement in the
  preview does not hide it from the next import.
  Flagged rows start unticked. `import` does not filter duplicates; the preview is where they surface.
- Category suggestion: the category of the user's latest transaction with the same bank text (`source_description`,
  else `description`) and type.
  Every row starts on that category, else the "Other" category of its type, so saving never lacks one. Only rows
  with a history category (and not a transfer or duplicate) start ticked.
- `amount` is stored unsigned; `type` carries the sign. `category_id` must match the type
  (`Category::assertMatchesTransactionType`).
- Descriptions are trimmed, whitespace-normalised, cut to 255 chars before comparison.

## Frontend

- `components/transactions/statement-import.ts`: pure helpers (`toImportRows`, `withCategory`,
  `importableRows`, `categoriesForType`, `applySuggestions`) with `statement-import.spec.ts`.
- `TransactionsComponent` hosts the panel; `TransactionService` has the preview/suggest/import calls.
- AI step: only rows still on their default/no category, not transfers or duplicates, max 100 rows, only
  `description` and `type` are sent. Suggestions fill untouched rows with an "AI" badge and **do not tick them**.
  If the call fails or returns nothing, the panel shows "AI unavailable" (or "another suggestion is still running"
  on `busy`) and the import carries on. A statement with no movements shows a notice instead of an empty table.
- The button is hidden unless the user is admin: a UI hint only, the backend permission is the authority.
- i18n keys in `frontend/public/i18n/{en,pt}/transactions.json`; the parity spec
  `frontend/src/app/i18n/i18n-keys.spec.ts` must pass.

## Extending

- Second bank: add a parser behind the same `ParsedStatement` shape; today only ActivoBank exists.
- Known gaps: only the first 100 pending rows go to the AI; the SPA's 5 MB receipt check does not follow
  `MAX_UPLOAD_KB`; the "same file" notice only matches byte-identical PDFs; `CategorySeeder` (run at container
  start) recreates default categories an admin deleted.
- Opening it to other roles: `givePermissionTo('import statements')`, no code change (permission migration
  `2026_10_18_120000_add_import_statements_permission.php` + `RoleSeeder`).

Tests: `Unit/BankStatementParserTest`, `Unit/SmalotPdfTextExtractorTest`, `Feature/StatementImport*Test`,
`Feature/TransactionImport{Preview,Store}Test`, fixtures in `tests/fixtures/`.

import { StatementImportRow, StatementPreviewRow } from '../../services/transaction.service';

/** A preview row the user can tick and categorise before importing. */
export interface ImportRow extends StatementPreviewRow {
  /** Position in the statement; stable while the table is sorted. */
  id: number;
  category_id: number | null;
  selected: boolean;
  /** Where the category came from: the user's history, the default "Other", the AI, or a manual choice. */
  source: 'history' | 'default' | 'ai' | 'user' | null;
  /** The category came from the AI suggestion (shown with a badge). */
  ai: boolean;
  /** Optional advisory note from the AI second opinion. */
  warning: string | null;
  /** The bank's text, kept so an emptied description falls back to it. */
  source_description: string;
  /** The user's own note for the transaction (optional). */
  notes: string;
  /** UI only: the note field is shown. */
  noteOpen: boolean;
}

/** The catch-all category per type, used when a row has no category of its own. */
export type OtherCategories = { income: number | null; expense: number | null };

/** Ticked by default only when it needs no decision: has a category, is not a transfer, not a duplicate. */
export function toImportRows(
  rows: StatementPreviewRow[],
  other: OtherCategories = { income: null, expense: null },
): ImportRow[] {
  return rows.map((r, id) => {
    const history = r.suggested_category_id;
    const categoryId = history ?? other[r.type];
    return {
      ...r,
      id,
      // Every row starts on its history category, else the "Other" of its type: saving never lacks a category.
      category_id: categoryId,
      source: history !== null ? 'history' : categoryId !== null ? 'default' : null,
      selected: history !== null && !r.is_transfer && !r.is_duplicate,
      ai: false,
      warning: null,
      source_description: r.description,
      notes: '',
      noteOpen: false,
    };
  });
}

/** Choosing a category is an explicit decision, so it ticks the row (also a transfer or duplicate). */
export function withCategory(row: ImportRow, categoryId: number | null): ImportRow {
  return {
    ...row,
    category_id: categoryId,
    source: categoryId !== null ? 'user' : null,
    selected: categoryId !== null,
    ai: false,
  };
}

/** Ticks or unticks a row. A ticked row always needs a category, so it gets the "Other" one when it has none. */
export function setSelected(row: ImportRow, selected: boolean, other: OtherCategories): ImportRow {
  if (!selected) return { ...row, selected: false };
  const categoryId = row.category_id ?? other[row.type];
  return { ...row, category_id: categoryId, selected: categoryId !== null };
}

export function importableRows(rows: ImportRow[]): StatementImportRow[] {
  return rows
    .filter((r) => r.selected && r.category_id !== null)
    .map((r) => {
      const notes = r.notes.trim();
      return {
        date: r.date,
        description: r.description.trim() || r.source_description,
        ...(notes ? { notes } : {}),
        amount: r.amount,
        type: r.type,
        category_id: r.category_id as number,
      };
    });
}

/** Income rows take income categories; expense rows take expense and savings categories. */
export function categoriesForType<T extends { type: 'income' | 'expense' | 'savings' }>(
  categories: T[],
  type: 'income' | 'expense',
): T[] {
  return categories.filter((c) => (type === 'income' ? c.type === 'income' : c.type !== 'income'));
}

/** Translation key for a failed preview/import: a known backend code, a rejected file, or a generic message. */
export function importErrorKey(err?: { code?: string; errors?: Record<string, string[]> }): string {
  const known = ['unreadable_pdf', 'unsupported_format', 'balance_mismatch'];
  if (err?.code && known.includes(err.code)) return `transactions.import.errors.${err.code}`;
  if (err?.errors?.['file']) return 'transactions.import.errors.invalidFile';
  return 'transactions.import.errors.generic';
}

export type ImportSortKey = 'date' | 'amount';

/** A sorted copy (the table order only); amount sorts by size, ties keep the statement order. */
export function sortRows(
  rows: ImportRow[],
  key: ImportSortKey,
  direction: 'asc' | 'desc',
): ImportRow[] {
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const diff = key === 'date' ? a.date.localeCompare(b.date) : a.amount - b.amount;
    return diff !== 0 ? sign * diff : a.id - b.id;
  });
}

/** Rows still on no category or the default "Other"; transfers and duplicates are left out (skipped by default). */
export function pendingForSuggestions(rows: ImportRow[]): ImportRow[] {
  return rows.filter(
    (r) => (r.category_id === null || r.source === 'default') && !r.is_transfer && !r.is_duplicate,
  );
}

/** Merges AI suggestions (same order as `ids`) into the rows. A category the user already chose is kept. */
export function applySuggestions(
  rows: ImportRow[],
  ids: number[],
  suggestions: { category_id: number | null; warning: string | null }[],
): ImportRow[] {
  const byId = new Map(ids.map((id, k) => [id, suggestions[k]]));
  return rows.map((row) => {
    const s = byId.get(row.id);
    if (!s) return row;
    // Only an untouched row (no category, or the default "Other") takes the AI's proposal.
    const take = (row.category_id === null || row.source === 'default') && s.category_id !== null;
    return {
      ...row,
      warning: s.warning,
      category_id: take ? s.category_id : row.category_id,
      source: take ? 'ai' : row.source,
      // Proposed, not ticked: the AI only suggests, the user confirms (one click with "Include all").
      selected: row.selected,
      ai: take,
    };
  });
}

/** "Include all": ticks (or clears) every row; rows without a category get the "Other" one for their type. */
export function setAllSelected(
  rows: ImportRow[],
  selected: boolean,
  other: OtherCategories,
): ImportRow[] {
  return rows.map((r) => setSelected(r, selected, other));
}

/** True when there is at least one row and all of them are ticked. */
export function allIncludable(rows: ImportRow[]): boolean {
  return rows.length > 0 && rows.every((r) => r.selected);
}

export function anySuggested(rows: ImportRow[]): boolean {
  return rows.some((r) => r.ai);
}

/** True when the model proposed at least one category, whatever the table looks like by now. */
export function hasUsableSuggestions(
  suggestions: { category_id: number | null; warning: string | null }[],
): boolean {
  return suggestions.some((s) => s.category_id !== null);
}

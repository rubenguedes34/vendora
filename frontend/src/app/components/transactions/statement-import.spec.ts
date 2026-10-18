import { StatementPreviewRow } from '../../services/transaction.service';
import {
  ImportRow,
  categoriesForType,
  importErrorKey,
  allIncludable,
  anySuggested,
  hasUsableSuggestions,
  setAllSelected,
  setSelected,
  applySuggestions,
  pendingForSuggestions,
  sortRows,
  importableRows,
  toImportRows,
  withCategory,
} from './statement-import';

const preview = (over: Partial<StatementPreviewRow> = {}): StatementPreviewRow => ({
  date: '2026-09-02',
  description: 'COMPRA 1 LOJA',
  amount: 10,
  type: 'expense',
  is_transfer: false,
  is_duplicate: false,
  suggested_category_id: null,
  ...over,
});

describe('statement import view model', () => {
  it('ticks a row only when it has a category and is neither a transfer nor a duplicate', () => {
    const rows = toImportRows([
      preview({ suggested_category_id: 3 }),
      preview({ suggested_category_id: null }),
      preview({ suggested_category_id: 3, is_transfer: true }),
      preview({ suggested_category_id: 3, is_duplicate: true }),
    ]);

    expect(rows.map((r) => r.selected)).toEqual([true, false, false, false]);
    expect(rows[0].category_id).toBe(3);
  });

  it('choosing a category ticks the row, even a transfer or duplicate (an explicit decision)', () => {
    const [plain, dup] = toImportRows([preview(), preview({ is_duplicate: true })]);

    expect(withCategory(plain, 5).selected).toBe(true);
    expect(withCategory(dup, 5).selected).toBe(true);
    expect(withCategory(dup, null).selected).toBe(false);
  });

  it('only ticked rows with a category are importable, mapped to the API payload', () => {
    const rows: ImportRow[] = [
      { ...toImportRows([preview()])[0], selected: true, category_id: 4 },
      { ...toImportRows([preview()])[0], selected: true, category_id: null },
      { ...toImportRows([preview()])[0], selected: false, category_id: 4 },
    ];

    expect(importableRows(rows)).toEqual([
      {
        date: '2026-09-02',
        description: 'COMPRA 1 LOJA',
        amount: 10,
        type: 'expense',
        category_id: 4,
      },
    ]);
  });

  it('filters categories by row type: income ↔ income, expense ↔ expense + savings', () => {
    const cats = [
      { id: 1, type: 'income' },
      { id: 2, type: 'expense' },
      { id: 3, type: 'savings' },
    ] as { id: number; type: 'income' | 'expense' | 'savings' }[];

    expect(categoriesForType(cats, 'income').map((c) => c.id)).toEqual([1]);
    expect(categoriesForType(cats, 'expense').map((c) => c.id)).toEqual([2, 3]);
  });

  it('maps backend errors to a translation key: known code, rejected file, otherwise generic', () => {
    expect(importErrorKey({ code: 'balance_mismatch' })).toBe(
      'transactions.import.errors.balance_mismatch',
    );
    expect(importErrorKey({ errors: { file: ['The file failed to upload.'] } })).toBe(
      'transactions.import.errors.invalidFile',
    );
    expect(importErrorKey({ code: 'something_new' })).toBe('transactions.import.errors.generic');
    expect(importErrorKey(undefined)).toBe('transactions.import.errors.generic');
  });

  it('sorts by date or by amount size, either direction, keeping statement order on ties', () => {
    const rows = toImportRows([
      preview({ date: '2026-09-05', amount: 10, type: 'income' }),
      preview({ date: '2026-09-02', amount: 50, type: 'expense' }),
      preview({ date: '2026-09-05', amount: 20, type: 'expense' }),
    ]);

    expect(sortRows(rows, 'date', 'asc').map((r) => r.id)).toEqual([1, 0, 2]); // tie keeps order
    expect(sortRows(rows, 'date', 'desc').map((r) => r.id)).toEqual([0, 2, 1]);
    expect(sortRows(rows, 'amount', 'desc').map((r) => r.id)).toEqual([1, 2, 0]); // size, not sign
    expect(sortRows(rows, 'amount', 'asc').map((r) => r.id)).toEqual([0, 2, 1]);
    expect(rows.map((r) => r.id)).toEqual([0, 1, 2]); // input untouched
  });

  it('only rows still needing a category (not transfers/duplicates) are sent to the AI', () => {
    const rows = toImportRows([
      preview(),
      preview({ suggested_category_id: 2 }),
      preview({ is_transfer: true }),
      preview({ is_duplicate: true }),
    ]);

    expect(pendingForSuggestions(rows).map((r) => r.id)).toEqual([0]);
  });

  it('applies AI suggestions: category + ai flag (the user ticks), warnings kept, user choices never overwritten', () => {
    const rows = toImportRows([preview(), preview(), preview()]);
    rows[2] = withCategory(rows[2], 9); // the user picked one while the AI was thinking

    const out = applySuggestions(
      rows,
      [0, 1, 2],
      [
        { category_id: 4, warning: null },
        { category_id: null, warning: 'Unusual amount' },
        { category_id: 5, warning: null },
      ],
    );

    expect(out[0]).toMatchObject({ category_id: 4, selected: false, ai: true, warning: null }); // proposed, not ticked
    expect(out[1]).toMatchObject({
      category_id: null,
      selected: false,
      ai: false,
      warning: 'Unusual amount',
    });
    expect(out[2]).toMatchObject({ category_id: 9, ai: false }); // untouched
  });

  it('ticking a row without a category gives it the "Other" category of its type', () => {
    const other = { income: 7, expense: 8 };
    const [exp, inc] = toImportRows([preview({ type: 'expense' }), preview({ type: 'income' })]);

    expect(setSelected(exp, true, other)).toMatchObject({ selected: true, category_id: 8 });
    expect(setSelected(inc, true, other)).toMatchObject({ selected: true, category_id: 7 });
    expect(setSelected({ ...exp, category_id: 3 }, true, other).category_id).toBe(3); // kept
    expect(setSelected(exp, false, other).selected).toBe(false);
  });

  it('cannot tick a row that has no category when there is no "Other" category to use', () => {
    const [row] = toImportRows([preview()]);

    expect(setSelected(row, true, { income: null, expense: null })).toMatchObject({
      selected: false,
      category_id: null,
    });
  });

  it('include all ticks every row (transfers and duplicates too); clearing unticks them', () => {
    const other = { income: 7, expense: 8 };
    const rows = toImportRows([
      preview({ suggested_category_id: 1 }),
      preview({ is_transfer: true }),
      preview({ is_duplicate: true, type: 'income' }),
    ]);

    const ticked = setAllSelected(rows, true, other);
    expect(ticked.map((r) => r.selected)).toEqual([true, true, true]);
    expect(ticked.map((r) => r.category_id)).toEqual([1, 8, 7]);
    expect(allIncludable(ticked)).toBe(true);

    const cleared = setAllSelected(ticked, false, other);
    expect(cleared.every((r) => !r.selected)).toBe(true);
    expect(allIncludable(cleared)).toBe(false);
  });

  it('knows whether the AI suggested anything', () => {
    const rows = toImportRows([preview(), preview()]);

    expect(anySuggested(rows)).toBe(false);
    expect(anySuggested([{ ...rows[0], ai: true }, rows[1]])).toBe(true);
  });

  it('imports the edited description and note, falling back to the statement text when emptied', () => {
    const [a, b, c] = toImportRows([
      preview({ description: 'TRF MB WAY P/ X', suggested_category_id: 1 }),
      preview({ description: 'COMPRA 1', suggested_category_id: 1 }),
      preview({ description: 'COMPRA 2', suggested_category_id: 1 }),
    ]);

    const out = importableRows([
      { ...a, description: '  Jantar com o João  ', notes: ' Aniversário ' },
      { ...b, description: '   ' },
      { ...c },
    ]);

    expect(out[0]).toMatchObject({ description: 'Jantar com o João', notes: 'Aniversário' });
    expect(out[1].description).toBe('COMPRA 1'); // emptied → statement text
    expect(out[1].notes).toBeUndefined();
    expect(out[2].notes).toBeUndefined();
  });

  it('judges the AI by what it answered, not by what ended up in the table', () => {
    expect(hasUsableSuggestions([])).toBe(false);
    expect(hasUsableSuggestions([{ category_id: null, warning: null }])).toBe(false);
    expect(
      hasUsableSuggestions([
        { category_id: null, warning: null },
        { category_id: 4, warning: null },
      ]),
    ).toBe(true);
  });

  it('starts every row on the "Other" category of its type, ticking only history suggestions', () => {
    const other = { income: 7, expense: 8 };
    const rows = toImportRows(
      [
        preview({ type: 'expense' }),
        preview({ type: 'income' }),
        preview({ type: 'expense', suggested_category_id: 3 }),
        preview({ type: 'expense', is_transfer: true }),
      ],
      other,
    );

    expect(rows.map((r) => r.category_id)).toEqual([8, 7, 3, 8]);
    expect(rows.map((r) => r.selected)).toEqual([false, false, true, false]);
    expect(rows.map((r) => r.source)).toEqual(['default', 'default', 'history', 'default']);
  });

  it('the AI may replace a default "Other" but never the history or the user choice', () => {
    const other = { income: 7, expense: 8 };
    const rows = toImportRows([preview(), preview({ suggested_category_id: 3 }), preview()], other);
    rows[2] = withCategory(rows[2], 9); // the user picked

    expect(pendingForSuggestions(rows).map((r) => r.id)).toEqual([0]); // only the untouched default

    const out = applySuggestions(
      rows,
      [0, 1, 2],
      [
        { category_id: 4, warning: null },
        { category_id: 5, warning: null },
        { category_id: 6, warning: null },
      ],
    );
    expect(out[0]).toMatchObject({ category_id: 4, source: 'ai', ai: true });
    expect(out[1]).toMatchObject({ category_id: 3, source: 'history' });
    expect(out[2]).toMatchObject({ category_id: 9, source: 'user' });
  });

  it('without an "Other" category a row simply has none', () => {
    const [row] = toImportRows([preview()], { income: null, expense: null });

    expect(row).toMatchObject({ category_id: null, source: null, selected: false });
  });
});

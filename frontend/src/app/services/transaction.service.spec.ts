import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TransactionService } from './transaction.service';
import { environment } from '../../environments/environment';

describe('TransactionService statement import', () => {
  let service: TransactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TransactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('previewStatement uploads the file as multipart to /transactions/import/preview', () => {
    const file = new File(['x'], 'statement.pdf', { type: 'application/pdf' });
    service.previewStatement(file).subscribe();

    const req = http.expectOne({
      method: 'POST',
      url: `${environment.apiUrl}/transactions/import/preview`,
    });
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('file')).toBeTruthy();
    req.flush({ period: { from: '', to: '' }, reconciliation: { ok: true }, rows: [] });
  });

  it('importStatement posts the rows to /transactions/import', () => {
    const rows = [
      {
        date: '2026-09-02',
        description: 'X',
        amount: 5,
        type: 'expense' as const,
        category_id: 1,
      },
    ];
    let result: unknown;
    service.importStatement(rows).subscribe((r) => (result = r));

    const req = http.expectOne({
      method: 'POST',
      url: `${environment.apiUrl}/transactions/import`,
    });
    expect(req.request.body).toEqual({ rows });
    req.flush({ imported: 1 });

    expect(result).toEqual({ imported: 1 });
  });

  it('keeps the backend error code so the UI can translate it', () => {
    let error: unknown;
    service.previewStatement(new File(['x'], 'a.pdf')).subscribe({ error: (e) => (error = e) });

    http
      .expectOne(`${environment.apiUrl}/transactions/import/preview`)
      .flush(
        { message: 'x', code: 'balance_mismatch' },
        { status: 422, statusText: 'Unprocessable' },
      );

    expect((error as { code?: string }).code).toBe('balance_mismatch');
  });

  it('suggestCategories posts descriptions and types only', () => {
    let result: unknown;
    service
      .suggestCategories([{ description: 'COMPRA 1', type: 'expense' }])
      .subscribe((r) => (result = r));

    const req = http.expectOne({
      method: 'POST',
      url: `${environment.apiUrl}/transactions/import/suggest`,
    });
    expect(req.request.body).toEqual({ rows: [{ description: 'COMPRA 1', type: 'expense' }] });
    req.flush({ available: true, suggestions: [{ category_id: 3, warning: null }] });

    expect(result).toEqual({ available: true, suggestions: [{ category_id: 3, warning: null }] });
  });

  it('importStatement also sends the statement fingerprint when given', () => {
    const statement = { hash: 'a'.repeat(64), from: '2026-03-01', to: '2026-03-31' };
    service.importStatement([], statement).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/transactions/import`);
    expect(req.request.body).toEqual({ rows: [], statement });
    req.flush({ imported: 0 });
  });
});

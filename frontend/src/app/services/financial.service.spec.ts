import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FinancialService } from './financial.service';
import { environment } from '../../environments/environment';

describe('FinancialService', () => {
  let service: FinancialService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FinancialService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('copyPreviousBudgets posts the target month and returns the result', () => {
    let result: unknown;
    service.copyPreviousBudgets('2026-03').subscribe((r) => (result = r));

    const req = http.expectOne({
      method: 'POST',
      url: `${environment.apiUrl}/budgets/copy-previous`,
    });
    expect(req.request.body).toEqual({ month: '2026-03' });
    req.flush({ copied: 2, source_month: '2026-02' });

    expect(result).toEqual({ copied: 2, source_month: '2026-02' });
  });
});

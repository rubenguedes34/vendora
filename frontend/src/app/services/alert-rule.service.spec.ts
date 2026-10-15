import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AlertRuleService } from './alert-rule.service';
import { environment } from '../../environments/environment';

describe('AlertRuleService', () => {
  let service: AlertRuleService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/alert-rules`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AlertRuleService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists, creates, updates and deletes against /alert-rules', () => {
    service.list().subscribe();
    http.expectOne({ method: 'GET', url }).flush([]);

    service.create({ type: 'total_spend_limit', threshold: 500 }).subscribe();
    const create = http.expectOne({ method: 'POST', url });
    expect(create.request.body).toEqual({ type: 'total_spend_limit', threshold: 500 });
    create.flush({});

    service.update(3, { is_active: false }).subscribe();
    const update = http.expectOne({ method: 'PUT', url: `${url}/3` });
    expect(update.request.body).toEqual({ is_active: false });
    update.flush({});

    service.delete(3).subscribe();
    http.expectOne({ method: 'DELETE', url: `${url}/3` }).flush({ message: 'ok' });
  });
});

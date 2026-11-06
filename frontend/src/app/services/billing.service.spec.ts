import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BillingService } from './billing.service';
import { environment } from '../../environments/environment';

describe('BillingService', () => {
  let service: BillingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BillingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the status from /billing', () => {
    service.getStatus().subscribe();
    http.expectOne({ method: 'GET', url: `${environment.apiUrl}/billing` }).flush({});
  });

  it('checkout posts the chosen plan', () => {
    service.checkout('quarterly').subscribe();
    const req = http.expectOne({ method: 'POST', url: `${environment.apiUrl}/billing/checkout` });
    expect(req.request.body).toEqual({ plan: 'quarterly' });
    req.flush({ url: 'https://checkout.stripe.com/x' });
  });

  it('portal posts to /billing/portal', () => {
    service.portal().subscribe();
    http.expectOne({ method: 'POST', url: `${environment.apiUrl}/billing/portal` }).flush({});
  });
});

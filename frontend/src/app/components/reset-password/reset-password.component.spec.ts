import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideTestTranslate } from '../../../testing/translate-testing';
import { ResetPasswordComponent } from './reset-password.component';
import { ForgotPasswordComponent } from '../forgot-password/forgot-password.component';

const setup = (queryParams: Record<string, string>) => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideTestTranslate(),
      { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } },
    ],
  });
  return TestBed.inject(HttpTestingController);
};

describe('ResetPasswordComponent', () => {
  it('posts token, email and the new password', () => {
    const http = setup({ token: 'tok', email: 'a@b.co' });
    const c = TestBed.createComponent(ResetPasswordComponent).componentInstance;

    c.form.setValue({ password: 'brand-new-pass', password_confirmation: 'brand-new-pass' });
    c.onSubmit();

    const req = http.expectOne((r) => r.url.endsWith('/reset-password'));
    expect(req.request.body).toEqual({
      token: 'tok',
      email: 'a@b.co',
      password: 'brand-new-pass',
      password_confirmation: 'brand-new-pass',
    });
    req.flush({ message: 'ok' });
    expect(c.done).toBe(true);
  });

  it('rejects short or mismatched passwords like the backend', () => {
    setup({ token: 'tok', email: 'a@b.co' });
    const c = TestBed.createComponent(ResetPasswordComponent).componentInstance;

    c.form.setValue({ password: 'short', password_confirmation: 'short' });
    expect(c.form.invalid).toBe(true);
    c.form.setValue({ password: 'long-enough-1', password_confirmation: 'different-1' });
    expect(c.form.hasError('mismatch')).toBe(true);
  });

  it('is disabled with an error when the link has no token', () => {
    setup({});
    const c = TestBed.createComponent(ResetPasswordComponent).componentInstance;

    expect(c.form.disabled).toBe(true);
    expect(c.errorMessage).not.toBe('');
  });
});

describe('ForgotPasswordComponent', () => {
  it('posts the email and shows the answer', () => {
    const http = setup({});
    const c = TestBed.createComponent(ForgotPasswordComponent).componentInstance;

    c.form.setValue({ email: 'a@b.co' });
    c.onSubmit();

    const req = http.expectOne((r) => r.url.endsWith('/forgot-password'));
    expect(req.request.body).toEqual({ email: 'a@b.co' });
    req.flush({ message: 'sent' });
    expect(c.message).toBe('sent');
  });
});

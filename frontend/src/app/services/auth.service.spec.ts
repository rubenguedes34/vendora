import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isLoggedIn() should return false when no token', () => {
    expect(service.isLoggedIn()).toBeFalsy();
  });

  it('isLoggedIn() should return true after setToken()', () => {
    service.setToken('test-token');
    expect(service.isLoggedIn()).toBeTruthy();
  });

  it('getTokenValue() returns null initially', () => {
    expect(service.getTokenValue()).toBeNull();
  });

  it('getTokenValue() returns token after setToken()', () => {
    service.setToken('abc123');
    expect(service.getTokenValue()).toBe('abc123');
  });

  it('getUserValue() returns null initially', () => {
    expect(service.getUserValue()).toBeNull();
  });

  it('setUser() stores user and getUserValue() returns it', () => {
    const user = { id: 1, name: 'Test', email: 'test@example.com' };
    service.setUser(user as any);
    expect(service.getUserValue()?.name).toBe('Test');
  });

  it('clearAuth() removes token and user', () => {
    service.setToken('tok');
    service.setUser({ id: 1, name: 'A', email: 'a@b.com' } as any);
    service.clearAuth();
    expect(service.isLoggedIn()).toBeFalsy();
    expect(service.getUserValue()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('login() sends POST to /api/login', () => {
    service.login({ email: 'a@b.com', password: 'pass' }).subscribe();
    const req = httpMock.expectOne('http://localhost:8000/api/login');
    expect(req.request.method).toBe('POST');
    req.flush({ user: { id: 1 }, token: 'tok' });
  });

  it('logout() sends POST to /api/logout', () => {
    service.logout().subscribe();
    const req = httpMock.expectOne('http://localhost:8000/api/logout');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('restores token from localStorage on init', () => {
    localStorage.setItem('token', 'persisted-token');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    const restored = TestBed.inject(AuthService);
    expect(restored.getTokenValue()).toBe('persisted-token');
  });
});

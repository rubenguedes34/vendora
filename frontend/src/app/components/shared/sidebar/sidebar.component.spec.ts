import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../../services/auth.service';
import { BehaviorSubject, of, Subject } from 'rxjs';

const routes = [
  { path: 'login', component: class {} },
];

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let component: SidebarComponent;
  let authService: Partial<AuthService>;
  let router: Router;
  let userSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    userSubject = new BehaviorSubject<any>({ id: 1, name: 'John Doe', email: 'john@example.com' });

    authService = {
      getUserObservable: vi.fn().mockReturnValue(userSubject.asObservable()),
      getTokenValue: vi.fn().mockReturnValue('mock-token'),
      loggedOut$: new Subject<void>(),
      logout: vi.fn().mockReturnValue(of({})),
      clearAuth: vi.fn(),
      isLoggedIn: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Initials ──────────────────────────────────────────────────────────────

  it('derives initials from full name', () => {
    expect(component.initials).toBe('JD');
  });

  it('derives single initial when only one word', () => {
    userSubject.next({ id: 2, name: 'Alice', email: 'alice@example.com' });
    fixture.detectChanges();
    expect(component.initials).toBe('A');
  });

  it('uses ? as fallback when user has no name', () => {
    userSubject.next({ id: 3, name: '', email: 'noname@example.com' });
    fixture.detectChanges();
    expect(component.initials).toBe('?');
  });

  it('uses ? as fallback when user is null', () => {
    userSubject.next(null);
    fixture.detectChanges();
    expect(component.initials).toBe('?');
  });

  // ── Mobile open/close ─────────────────────────────────────────────────────

  it('mobileOpen starts as false', () => {
    expect(component.mobileOpen).toBeFalsy();
  });

  it('hamburger button sets mobileOpen to true', () => {
    const hamburger = fixture.debugElement.query(By.css('[data-testid="sidebar-hamburger"]'));
    hamburger.nativeElement.click();
    expect(component.mobileOpen).toBeTruthy();
  });

  it('backdrop click sets mobileOpen to false', () => {
    const hamburger = fixture.debugElement.query(By.css('[data-testid="sidebar-hamburger"]'));
    hamburger.nativeElement.click();
    fixture.detectChanges();
    const backdrop = fixture.debugElement.query(By.css('[data-testid="sidebar-backdrop"]'));
    expect(backdrop).toBeTruthy();
    backdrop.nativeElement.click();
    expect(component.mobileOpen).toBeFalsy();
  });

  it('close button inside sidebar sets mobileOpen to false', () => {
    const hamburger = fixture.debugElement.query(By.css('[data-testid="sidebar-hamburger"]'));
    hamburger.nativeElement.click();
    fixture.detectChanges();
    const closeBtn = fixture.debugElement.query(By.css('[data-testid="sidebar-close"]'));
    closeBtn.nativeElement.click();
    expect(component.mobileOpen).toBeFalsy();
  });

  it('Escape key closes the sidebar', () => {
    component.mobileOpen = true;
    component.onEscape();
    expect(component.mobileOpen).toBeFalsy();
  });

  it('nav link clicks close mobile sidebar', () => {
    component.mobileOpen = true;
    fixture.detectChanges();
    const navLinks = fixture.debugElement.queryAll(By.css('nav a'));
    navLinks[0].nativeElement.click();
    expect(component.mobileOpen).toBeFalsy();
  });

  it('shows admin link for users with admin or manager roles', async () => {
    component.user = { id: 1, name: 'John Doe', email: 'john@example.com', roles: ['manager'] };
    fixture.detectChanges();
    await fixture.whenStable();
    const adminLink = fixture.debugElement.query(By.css('a[title="Open admin panel"]'));
    expect(adminLink).toBeTruthy();
    expect(adminLink.nativeElement.getAttribute('href')).toBe('http://localhost:8000/admin');
  });

  it('opens admin link in a new tab via window.open', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    component.user = { id: 1, name: 'John Doe', email: 'john@example.com', roles: ['admin'] };
    fixture.detectChanges();
    await fixture.whenStable();
    const adminLink = fixture.debugElement.query(By.css('a[title="Open admin panel"]'));
    adminLink.nativeElement.click();
    expect(openSpy).toHaveBeenCalledWith('http://localhost:8000/admin', '_blank');
    openSpy.mockRestore();
  });

  // ── isActive ──────────────────────────────────────────────────────────────

  it('isActive returns true for current route', async () => {
    await router.navigate(['/']);
    expect(component.isActive('/')).toBeTruthy();
  });

  it('isActive returns false for a different route', () => {
    expect(component.isActive('/some-other-path')).toBeFalsy();
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  it('logout() calls authService.logout and clearAuth', () => {
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
    expect(authService.clearAuth).toHaveBeenCalled();
  });

  // ── Template rendering ────────────────────────────────────────────────────

  it('aside has -translate-x-full class when closed', () => {
    expect(component.mobileOpen).toBeFalsy();
    const aside = fixture.debugElement.query(By.css('aside'));
    expect(aside.classes['-translate-x-full']).toBeTruthy();
  });

  it('aside has translate-x-0 class when open', () => {
    const hamburger = fixture.debugElement.query(By.css('[data-testid="sidebar-hamburger"]'));
    hamburger.nativeElement.click();
    fixture.detectChanges();
    const aside = fixture.debugElement.query(By.css('aside'));
    expect(aside.classes['translate-x-0']).toBeTruthy();
  });

  it('backdrop is only rendered when mobileOpen is true', () => {
    expect(fixture.debugElement.query(By.css('[data-testid="sidebar-backdrop"]'))).toBeNull();
    const hamburger = fixture.debugElement.query(By.css('[data-testid="sidebar-hamburger"]'));
    hamburger.nativeElement.click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="sidebar-backdrop"]'))).toBeTruthy();
  });
});

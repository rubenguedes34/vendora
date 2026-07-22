import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ThemePickerComponent } from './theme-picker.component';
import { ThemeService } from '../../../services/theme.service';

describe('ThemePickerComponent', () => {
  let fixture: ComponentFixture<ThemePickerComponent>;
  let component: ThemePickerComponent;
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');

    await TestBed.configureTestingModule({
      imports: [ThemePickerComponent],
    }).compileComponents();

    themeService = TestBed.inject(ThemeService);
    fixture = TestBed.createComponent(ThemePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes all available themes', () => {
    expect(component.themes.length).toBe(themeService.themes.length);
  });

  it('sets the active theme to the saved theme on init', () => {
    expect(component.activeTheme).toBe(themeService.getSavedTheme());
  });

  it('renders a button for each theme', () => {
    const toggle = fixture.debugElement.query(By.css('button'));
    toggle.nativeElement.click();
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button[title]'));
    expect(buttons.length).toBe(themeService.themes.length);
  });

  it('updates the active theme and service when a swatch is clicked', () => {
    const toggle = fixture.debugElement.query(By.css('button'));
    toggle.nativeElement.click();
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button[title]'));
    const firstTheme = component.themes[0];
    const target = component.themes[1];

    expect(component.activeTheme).toBe(firstTheme.id);

    buttons[1].nativeElement.click();
    fixture.detectChanges();

    expect(component.activeTheme).toBe(target.id);
    expect(themeService.getSavedTheme()).toBe(target.id);
    expect(document.documentElement.getAttribute('data-theme')).toBe(target.id);
  });
});

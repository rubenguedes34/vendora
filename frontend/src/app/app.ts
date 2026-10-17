import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { PwaService } from './services/pwa.service';
import { FooterComponent } from './components/shared/footer/footer.component';
import { ScrollTopComponent } from './components/shared/scroll-top/scroll-top.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterOutlet, FooterComponent, ScrollTopComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('frontend');

  // Injected here so PwaService catches beforeinstallprompt on every page, not only with the sidebar.
  constructor(
    private themeService: ThemeService,
    _pwa: PwaService,
  ) {
    this.themeService.setTheme(this.themeService.getSavedTheme());
  }
}

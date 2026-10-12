import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { FooterComponent } from './components/shared/footer/footer.component';
import { ScrollTopComponent } from './components/shared/scroll-top/scroll-top.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent, ScrollTopComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');

  constructor(private themeService: ThemeService) {
    this.themeService.setTheme(this.themeService.getSavedTheme());
  }
}

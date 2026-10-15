import { Component, HostListener, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-scroll-top',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  template: `
    <button
      type="button"
      (click)="scrollToTop()"
      aria-label="Scroll to top"
      title="Back to top"
      class="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-24 z-40 w-11 h-11 rounded-full bg-white text-gray-600 border border-gray-200 shadow-lg hover:text-primary-600 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center"
      [class.opacity-0]="!visible"
      [class.pointer-events-none]="!visible"
      [class.translate-y-3]="!visible"
      [attr.tabindex]="visible ? 0 : -1"
      [attr.aria-hidden]="!visible">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  `,
})
export class ScrollTopComponent {
  visible = false;

  @HostListener('window:scroll')
  onScroll(): void {
    this.visible = window.scrollY > 400;
  }

  scrollToTop(): void {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
}

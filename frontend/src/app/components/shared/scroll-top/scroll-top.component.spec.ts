import { TestBed } from '@angular/core/testing';
import { ScrollTopComponent } from './scroll-top.component';

describe('ScrollTopComponent', () => {
  it('shows only after scrolling down and scrolls back to the top on click', () => {
    const fixture = TestBed.createComponent(ScrollTopComponent);
    const component = fixture.componentInstance;
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    component.onScroll();
    expect(component.visible).toBe(false);

    Object.defineProperty(window, 'scrollY', { value: 800, configurable: true });
    component.onScroll();
    expect(component.visible).toBe(true);

    component.scrollToTop();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });
});

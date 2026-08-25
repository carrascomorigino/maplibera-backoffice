import { Directive, DestroyRef, ElementRef, inject, output } from '@angular/core';

@Directive({
  selector: '[appInfiniteScroll]',
})
export class InfiniteScrollDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly nearEnd = output<void>();

  private readonly observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        this.nearEnd.emit();
      }
    },
    { rootMargin: '200px' },
  );

  constructor() {
    this.observer.observe(this.elementRef.nativeElement);
    this.destroyRef.onDestroy(() => this.observer.disconnect());
  }
}

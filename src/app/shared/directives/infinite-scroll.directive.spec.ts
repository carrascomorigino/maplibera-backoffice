import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InfiniteScrollDirective } from './infinite-scroll.directive';

class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);

  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }

  trigger(isIntersecting: boolean): void {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

@Component({
  template: `<div appInfiniteScroll (nearEnd)="onNearEnd()"></div>`,
  imports: [InfiniteScrollDirective],
})
class HostComponent {
  onNearEnd(): void {}
}

describe('InfiniteScrollDirective', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    global.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
    TestBed.configureTestingModule({});
  });

  it('observes the host element with a rootMargin', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const observer = FakeIntersectionObserver.instances[0];
    expect(observer.observe).toHaveBeenCalledWith(fixture.nativeElement.querySelector('div'));
    expect(observer.options).toEqual({ rootMargin: '200px' });
  });

  it('emits nearEnd when the host element becomes intersecting', () => {
    const fixture = TestBed.createComponent(HostComponent);
    const spy = vi.spyOn(fixture.componentInstance, 'onNearEnd');
    fixture.detectChanges();

    FakeIntersectionObserver.instances[0].trigger(true);

    expect(spy).toHaveBeenCalled();
  });

  it('does not emit nearEnd when the entry is not intersecting', () => {
    const fixture = TestBed.createComponent(HostComponent);
    const spy = vi.spyOn(fixture.componentInstance, 'onNearEnd');
    fixture.detectChanges();

    FakeIntersectionObserver.instances[0].trigger(false);

    expect(spy).not.toHaveBeenCalled();
  });

  it('disconnects the observer on destroy', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const observer = FakeIntersectionObserver.instances[0];
    fixture.destroy();

    expect(observer.disconnect).toHaveBeenCalled();
  });
});

import { TestBed } from '@angular/core/testing';
import { ImageCarousel } from './image-carousel';
import { LanguageService } from '../../../core/i18n/language.service';

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
}

describe('ImageCarousel', () => {
  let language: LanguageService;

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    global.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
    Element.prototype.scrollIntoView = vi.fn();
    TestBed.configureTestingModule({});
    language = TestBed.inject(LanguageService);
    language.setLanguage('en');
  });

  function createFixture(images: { url: string; description?: string }[]) {
    const fixture = TestBed.createComponent(ImageCarousel);
    fixture.componentRef.setInput('images', images);
    fixture.detectChanges();
    return fixture;
  }

  it('renders nothing when there are no images', () => {
    const fixture = createFixture([]);

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0);
  });

  it('renders a plain img with no dots for a single image', () => {
    const fixture = createFixture([{ url: 'https://example.com/a.jpg', description: 'A photo' }]);

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/a.jpg');
    expect(img.alt).toBe('A photo');
    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0);
  });

  it('renders a scroll track with a dot per image for multiple images', () => {
    const images = [
      { url: 'https://example.com/a.jpg' },
      { url: 'https://example.com/b.jpg' },
      { url: 'https://example.com/c.jpg' },
    ];
    const fixture = createFixture(images);

    expect(fixture.nativeElement.querySelectorAll('img').length).toBe(3);
    const dots = fixture.nativeElement.querySelectorAll('[data-testid="carousel-dot"]');
    expect(dots.length).toBe(3);
    expect(dots[0].getAttribute('aria-label')).toBe(language.t().imageCarousel.goToImageAria(1));
  });

  it('updates the active dot and scrolls to the slide when a dot is clicked', () => {
    const images = [
      { url: 'https://example.com/a.jpg' },
      { url: 'https://example.com/b.jpg' },
    ];
    const fixture = createFixture(images);

    const dots = fixture.nativeElement.querySelectorAll(
      '[data-testid="carousel-dot"]',
    ) as NodeListOf<HTMLButtonElement>;
    expect(dots[0].style.opacity).toBe('1');
    expect(dots[1].style.opacity).toBe('0.7');

    dots[1].click();
    fixture.detectChanges();

    expect(dots[1].style.opacity).toBe('1');
    expect(dots[0].style.opacity).toBe('0.7');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('renders previous/next buttons, disabled at the boundaries', () => {
    const images = [
      { url: 'https://example.com/a.jpg' },
      { url: 'https://example.com/b.jpg' },
      { url: 'https://example.com/c.jpg' },
    ];
    const fixture = createFixture(images);

    const previous = fixture.nativeElement.querySelector(
      '[data-testid="carousel-previous"]',
    ) as HTMLButtonElement;
    const next = fixture.nativeElement.querySelector('[data-testid="carousel-next"]') as HTMLButtonElement;
    expect(previous.getAttribute('aria-label')).toBe(language.t().imageCarousel.previousImageAria);
    expect(next.getAttribute('aria-label')).toBe(language.t().imageCarousel.nextImageAria);
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    next.click();
    fixture.detectChanges();
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(false);

    next.click();
    fixture.detectChanges();
    expect(next.disabled).toBe(true);
  });
});

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../../../core/i18n/language.service';

export interface CarouselImage {
  url: string;
  description?: string;
}

@Component({
  selector: 'app-image-carousel',
  imports: [MatIconModule],
  templateUrl: './image-carousel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block aspect-square w-full',
  },
})
export class ImageCarousel {
  protected readonly language = inject(LanguageService);

  readonly images = input<CarouselImage[]>([]);

  protected readonly activeIndex = signal(0);

  private readonly slideRefs = viewChildren<ElementRef<HTMLImageElement>>('slide');

  constructor() {
    effect((onCleanup) => {
      const slides = this.slideRefs();
      if (slides.length === 0) {
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            const index = slides.findIndex((slide) => slide.nativeElement === entry.target);
            if (index !== -1) {
              this.activeIndex.set(index);
            }
          }
        },
        { threshold: 0.5 },
      );
      slides.forEach((slide) => observer.observe(slide.nativeElement));
      onCleanup(() => observer.disconnect());
    });
  }

  protected goToSlide(index: number): void {
    this.activeIndex.set(index);
    this.slideRefs()[index]?.nativeElement.scrollIntoView({ behavior: 'smooth', inline: 'start' });
  }

  protected goToPrevious(): void {
    this.goToSlide(Math.max(0, this.activeIndex() - 1));
  }

  protected goToNext(): void {
    this.goToSlide(Math.min(this.images().length - 1, this.activeIndex() + 1));
  }
}

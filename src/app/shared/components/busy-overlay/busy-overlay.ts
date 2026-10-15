import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LanguageService } from '../../../core/i18n/language.service';

/** Covers its nearest positioned ancestor with a translucent layer and a spinner. */
@Component({
  selector: 'app-busy-overlay',
  imports: [MatProgressSpinnerModule],
  template: `
    <mat-progress-spinner
      mode="indeterminate"
      diameter="32"
      [attr.aria-label]="language.t().busyOverlay.label"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-testid': 'busy-overlay',
    role: 'status',
    class:
      'absolute inset-0 z-10 flex cursor-wait items-center justify-center rounded-[inherit] bg-surface-card/70 backdrop-blur-[1px]',
  },
})
export class BusyOverlay {
  protected readonly language = inject(LanguageService);
}

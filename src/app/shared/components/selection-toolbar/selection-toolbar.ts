import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LanguageService } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-selection-toolbar',
  imports: [MatButtonModule],
  templateUrl: './selection-toolbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex items-center justify-between gap-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2',
  },
})
export class SelectionToolbar {
  protected readonly language = inject(LanguageService);

  readonly selectedCount = input.required<number>();

  readonly deleteRequested = output<void>();
  readonly clearRequested = output<void>();
}

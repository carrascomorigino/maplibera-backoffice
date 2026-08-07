import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LanguageService } from '../../language.service';
import { UiLanguage } from '../../models/language.model';

@Component({
  selector: 'app-language-toggle',
  imports: [MatButtonToggleModule],
  templateUrl: './language-toggle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageToggle {
  protected readonly language = inject(LanguageService);

  protected onChange(value: UiLanguage): void {
    this.language.setLanguage(value);
  }
}

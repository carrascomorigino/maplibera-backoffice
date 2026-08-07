import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LanguageService } from './core/i18n/language.service';
import { LanguageToggle } from './core/i18n/components/language-toggle/language-toggle';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LanguageToggle],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly language = inject(LanguageService);
}

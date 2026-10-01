import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { LanguageService } from './core/i18n/language.service';
import { LanguageToggle } from './core/i18n/components/language-toggle/language-toggle';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LanguageToggle],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    class: 'flex h-full flex-col bg-surface',
  },
})
export class App {
  protected readonly language = inject(LanguageService);
  protected readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}

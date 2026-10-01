import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthError, AuthErrorKey } from '../../../../core/auth/models/auth-user.model';
import { LanguageService } from '../../../../core/i18n/language.service';

/** Google is the only sign-in method; admins are Google accounts with a `role: 'admin'` claim. */
@Component({
  selector: 'app-login',
  imports: [MatButtonModule],
  templateUrl: './login.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex min-h-full items-center justify-center p-6',
  },
})
export class LoginPage {
  protected readonly language = inject(LanguageService);

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly pending = signal(false);
  protected readonly error = signal<AuthErrorKey | null>(null);

  protected async signInWithGoogle(): Promise<void> {
    this.pending.set(true);
    this.error.set(null);

    try {
      await this.auth.signInWithGoogle();
      await this.router.navigateByUrl(this.redirectTo());
    } catch (error) {
      this.error.set(error instanceof AuthError ? error.key : 'unknown');
    } finally {
      this.pending.set(false);
    }
  }

  /** Set by `authGuard` when it bounces an unauthenticated visitor off a protected route. */
  private redirectTo(): string {
    return this.route.snapshot.queryParamMap.get('redirectTo') ?? '/';
  }
}

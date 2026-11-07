import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { AccountFlowService } from '../../../../core/services/account-flow.service';
import { AuthService, EMAIL_PATTERN, PASSWORD_RULE, PHONE_PATTERN, isStrongPassword, normalizePhone } from '../../../../core/services/auth.service';
import { QuizService } from '../../../../core/services/quiz.service';
import { PasswordToggleDirective } from '../../../../shared/ui/password-toggle.directive';

const REMEMBERED_LOGIN_KEY = 'fm.rememberedLogin';

function readRemembered(): string {
  try {
    return localStorage.getItem(REMEMBERED_LOGIN_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeRemembered(value: string | null): void {
  try {
    if (value) localStorage.setItem(REMEMBERED_LOGIN_KEY, value);
    else localStorage.removeItem(REMEMBERED_LOGIN_KEY);
  } catch {
    // storage unavailable: the shopper just types it again
  }
}

type AuthMode = 'login' | 'register';

/**
 * C10 + C11: Sign in and Create account on one page. The photo panel stays put; the tabs swap only the
 * form, and the URL is updated in place (/login or /register) without a navigation.
 */
@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [PasswordToggleDirective, FormsModule, RouterLink, NgClass],
  templateUrl: './auth.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
  private readonly auth = inject(AuthService);
  private readonly flow = inject(AccountFlowService);
  private readonly location = inject(Location);
  private readonly title = inject(Title);
  private readonly route = inject(ActivatedRoute);
  private readonly params = this.route.snapshot.queryParamMap;
  readonly pendingSave = inject(QuizService).pendingSave;

  readonly mode = signal<AuthMode>(this.route.snapshot.data['mode'] === 'register' ? 'register' : 'login');
  readonly returnUrl = this.params.get('returnUrl');
  readonly resetDone = this.params.get('reset') === '1';

  // Sign in
  readonly identifier = signal(readRemembered());
  readonly password = signal('');
  readonly remember = signal(true);
  readonly busy = signal(false);

  // Create account
  readonly passwordRule = PASSWORD_RULE;
  readonly form = signal({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', acceptTerms: false });
  readonly touched = signal(false);

  readonly error = signal('');

  readonly issues = computed(() => {
    const f = this.form();
    return {
      fullName: f.fullName.trim().length < 2,
      email: !EMAIL_PATTERN.test(f.email.trim()),
      phone: !PHONE_PATTERN.test(normalizePhone(f.phone)),
      password: !isStrongPassword(f.password),
      confirmPassword: !f.confirmPassword || f.confirmPassword !== f.password,
      acceptTerms: !f.acceptTerms,
    };
  });
  readonly passwordChecks = computed(() => {
    const p = this.form().password;
    return [
      { label: '8+ characters', ok: p.length >= 8 },
      { label: 'Uppercase', ok: /[A-Z]/.test(p) },
      { label: 'Lowercase', ok: /[a-z]/.test(p) },
      { label: 'Number', ok: /\d/.test(p) },
    ];
  });

  setMode(mode: AuthMode): void {
    if (this.mode() === mode) return;
    this.error.set('');
    this.mode.set(mode);
    const query = this.returnUrl ? `returnUrl=${encodeURIComponent(this.returnUrl)}` : '';
    this.location.replaceState(mode === 'register' ? '/register' : '/login', query);
    this.title.setTitle(mode === 'register' ? 'Create Account | FOLMARÉ' : 'Sign In | FOLMARÉ');
  }

  set(field: string, value: string | boolean): void {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  submit(): void {
    this.error.set('');
    if (!this.identifier().trim() || !this.password()) {
      this.error.set('Please enter your email (or phone) and password.');
      return;
    }
    this.busy.set(true);
    try {
      const user = this.auth.login(this.identifier(), this.password(), this.remember());
      writeRemembered(this.remember() ? this.identifier().trim() : null);
      this.flow.completeSignIn(user.id, this.returnUrl, '/');
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  register(): void {
    this.touched.set(true);
    this.error.set('');
    try {
      const user = this.auth.register(this.form());
      this.flow.completeSignIn(user.id, this.returnUrl, '/');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { AccountFlowService } from '../../../../core/services/account-flow.service';
import { AuthService, EMAIL_PATTERN, PASSWORD_RULE, PHONE_PATTERN, isStrongPassword, normalizePhone } from '../../../../core/services/auth.service';
import { QuizService } from '../../../../core/services/quiz.service';

/** C11 — Create account. */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly flow = inject(AccountFlowService);
  readonly pendingSave = inject(QuizService).pendingSave;
  readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');
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

  set(field: string, value: string | boolean): void {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  submit(): void {
    this.touched.set(true);
    this.error.set('');
    try {
      const user = this.auth.register(this.form());
      this.flow.completeSignIn(user.id, this.returnUrl, '/profile');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { AuthService, PASSWORD_RULE } from '../../../../core/services/auth.service';
import { ClockService } from '../../../../core/services/clock.service';
import { PasswordToggleDirective } from '../../../../shared/ui/password-toggle.directive';

/** C12: Forgot & reset password with a 6-digit OTP (10-minute validity, 5 attempts, 60 s resend). */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [PasswordToggleDirective, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly clock = inject(ClockService);
  private readonly router = inject(Router);
  readonly passwordRule = PASSWORD_RULE;

  readonly step = signal<1 | 2>(1);
  readonly email = signal('');
  readonly code = signal('');
  readonly password = signal('');
  readonly confirm = signal('');
  readonly sandboxCode = signal<string | null>(null);
  readonly resendAt = signal(0);
  readonly error = signal('');
  readonly info = signal('');

  readonly resendIn = computed(() => Math.max(0, Math.ceil((this.resendAt() - this.clock.now()) / 1000)));

  sendCode(): void {
    this.error.set('');
    try {
      const result = this.auth.requestOtp(this.email());
      this.sandboxCode.set(result.sandboxCode);
      this.resendAt.set(result.resendAt);
      this.info.set('If this email is registered, a 6-digit code has been sent. It is valid for 10 minutes.');
      this.step.set(2);
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  reset(): void {
    this.error.set('');
    try {
      this.auth.resetPassword(this.email(), this.code(), this.password(), this.confirm());
      void this.router.navigate(['/login'], { queryParams: { reset: 1 } });
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}

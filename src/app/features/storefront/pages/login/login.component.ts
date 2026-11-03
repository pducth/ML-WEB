import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { AccountFlowService } from '../../../../core/services/account-flow.service';
import { AuthService } from '../../../../core/services/auth.service';
import { QuizService } from '../../../../core/services/quiz.service';

/** C10 — Sign in. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly flow = inject(AccountFlowService);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly pendingSave = inject(QuizService).pendingSave;

  readonly returnUrl = this.params.get('returnUrl');
  readonly resetDone = this.params.get('reset') === '1';
  readonly identifier = signal('');
  readonly password = signal('');
  readonly remember = signal(true);
  readonly error = signal('');
  readonly busy = signal(false);

  submit(): void {
    this.error.set('');
    if (!this.identifier().trim() || !this.password()) {
      this.error.set('Please enter your email (or phone) and password.');
      return;
    }
    this.busy.set(true);
    try {
      const user = this.auth.login(this.identifier(), this.password(), this.remember());
      this.flow.completeSignIn(user.id, this.returnUrl, '/profile');
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}

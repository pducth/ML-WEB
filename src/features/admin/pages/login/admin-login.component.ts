import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal('');
  readonly errorMessage = signal('');
  readonly submitting = signal(false);

  signIn(): void {
    this.errorMessage.set('');
    this.submitting.set(true);
    const previousUser = this.auth.currentUser();
    this.auth.login({ email: this.email(), password: this.password() }).subscribe({
      next: ({ user }) => {
        this.submitting.set(false);
        if (user.role !== 'Admin') {
          this.auth.setCurrentUser(previousUser);
          this.errorMessage.set('Invalid credentials.');
          return;
        }
        const requestedUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination =
          requestedUrl?.startsWith('/') && !requestedUrl.startsWith('//') && requestedUrl !== '/admin/login'
            ? requestedUrl
            : '/admin/dashboard';
        void this.router.navigateByUrl(destination);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('Invalid credentials.');
      },
    });
  }
}

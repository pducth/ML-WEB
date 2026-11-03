import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../core/environment/environment';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { safeReturnUrl } from '../../../../core/services/account-flow.service';
import { AdminAuthService } from '../../../../core/services/admin-auth.service';

/** A01 — Admin sign-in at /admin/login. */
@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm">
      <div class="app login">
        <main>
          <div class="view">
            <section class="login-shell">
              <div class="login-intro">
                <img class="login-intro-logo" src="/assets/folmare/logo/png/folmare-primary-dark.png" alt="FOLMARÉ Botanical Haircare Edit" width="1242" height="749" />
                <h1>Welcome back.</h1>
                <p>Sign in to manage your store and track business performance.</p>
              </div>
              <form class="card lg" (ngSubmit)="submit()" novalidate>
                <img class="brand-logo" src="/assets/folmare/logo/png/folmare-wordmark-dark.png" alt="FOLMARÉ" width="1573" height="247" />
                <div class="login-heading">
                  <h2>Admin sign-in</h2>
                  <p>Enter your account details to continue.</p>
                </div>
                <label for="le">Email<input id="le" name="email" type="email" autocomplete="username" placeholder="admin@haircare.vn" [ngModel]="email()" (ngModelChange)="email.set($event); error.set('')" required /></label>
                <label for="lp">Password<input id="lp" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" [ngModel]="password()" (ngModelChange)="password.set($event); error.set('')" [attr.aria-invalid]="error() ? true : null" required /></label>
                @if (error()) { <div class="alert" role="alert">{{ error() }}</div> }
                <button class="btn" type="submit">Sign in</button>
                @if (devTools) { <small class="login-demo">Demo account: admin&#64;haircare.vn<br />Password: admin123</small> }
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  `,
})
export class AdminLoginComponent {
  private readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');
  readonly devTools = environment.devTools;
  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal('');

  submit(): void {
    try {
      this.admin.login(this.email(), this.password());
      const target = safeReturnUrl(this.returnUrl, '/admin/dashboard');
      void this.router.navigateByUrl(target.startsWith('/admin') ? target : '/admin/dashboard');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}

import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../core/environment/environment';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { safeReturnUrl } from '../../../../core/services/account-flow.service';
import { AdminAuthService } from '../../../../core/services/admin-auth.service';
import { PasswordToggleDirective } from '../../../../shared/ui/password-toggle.directive';

/** A01: Admin sign-in at /admin/login. */
@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, PasswordToggleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    /* A forest gradient with two soft glows, and the sign-in card floating in the middle. */
    .al {
      position: relative;
      overflow: hidden;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #1d302c;
      font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(150deg, #082a22 0%, #0f3d32 50%, #2f6f5c 100%);
    }
    .al::before,
    .al::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }
    .al::before {
      width: 720px;
      height: 720px;
      right: -240px;
      top: -280px;
      background: radial-gradient(circle, rgb(156 195 180 / 34%) 0%, transparent 66%);
    }
    .al::after {
      width: 640px;
      height: 640px;
      left: -220px;
      bottom: -300px;
      background: radial-gradient(circle, rgb(255 173 140 / 20%) 0%, transparent 70%);
    }
    .al-stack {
      position: relative;
      z-index: 1;
      width: min(100%, 440px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
    }
    .al-logo {
      display: block;
      width: 210px;
      max-width: 60%;
      height: auto;
      filter: brightness(0) invert(1) drop-shadow(0 2px 14px rgb(0 0 0 / 35%));
    }

    /* ---------- The card ---------- */
    .al-form {
      width: 100%;
      padding: 44px 40px 36px;
      background: rgb(251 251 248 / 93%);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 20px;
      box-shadow: 0 34px 80px -24px rgb(0 0 0 / 55%), 0 0 0 1px rgb(255 255 255 / 40%) inset;
    }
    .al-form h2 {
      margin: 0 0 30px;
      text-align: center;
      font-family: 'Absans', 'Lora', Georgia, serif;
      font-size: clamp(30px, 3vw, 38px);
      font-weight: 400;
      line-height: 1.1;
      letter-spacing: -0.01em;
      color: #0f3d32;
    }
    .al-field { display: block; margin-bottom: 20px; }
    .al-label {
      display: block;
      margin-bottom: 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #0f3d32;
    }
    .al-field input {
      display: block;
      width: 100%;
      height: 52px;
      padding: 0 16px;
      font: inherit;
      font-size: 15px;
      color: #1d302c;
      background: #fff;
      border: 1px solid #dce5e0;
      border-radius: 10px;
      outline: none !important;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .al-field input::placeholder { color: #85968e; }
    .al-field input:hover { border-color: #b5c8bd; }
    .al-field input:focus {
      border-color: #0f3d32;
      box-shadow: 0 0 0 3px rgb(15 61 50 / 10%);
    }
    .al-field input[aria-invalid='true'] { border-color: #c9503a; }
    .al-alert {
      margin: 0 0 18px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.5;
      color: #9a2f1d;
      background: #fbe7e0;
      border-left: 3px solid #c9503a;
      border-radius: 6px;
    }
    .al-submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      height: 52px;
      margin-top: 8px;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #fff;
      cursor: pointer;
      background: #0f3d32;
      border: 0;
      border-radius: 10px;
      transition: background-color 0.25s, transform 0.2s;
    }
    .al-submit:hover { background: #19594a; }
    .al-submit:active { transform: scale(0.99); }
    .al-submit:focus-visible { outline: 2px solid #0f3d32; outline-offset: 3px; }
    .al-submit svg { width: 16px; height: 16px; transition: transform 0.25s; }
    .al-submit:hover svg { transform: translateX(3px); }
    .al-demo {
      margin: 26px 0 0;
      padding: 13px 16px;
      font-size: 12px;
      line-height: 1.8;
      text-align: center;
      color: #5e6f68;
      background: #eef3ef;
      border: 1px dashed #b5c8bd;
      border-radius: 10px;
      overflow-wrap: anywhere;
    }

    @media (max-width: 480px) {
      .al { padding: 28px 14px; }
      .al-form { padding: 34px 24px 28px; border-radius: 16px; }
    }
  `,
  template: `
    <div class="al">
      <div class="al-stack">
        <img class="al-logo" src="/assets/folmare/logo/png/folmare-primary-dark.png" alt="FOLMARÉ Botanical Haircare Edit" width="1242" height="749" />

        <form class="al-form" (ngSubmit)="submit()" novalidate>
          <h2>Admin sign-in</h2>

          <div class="al-field">
            <label class="al-label" for="le">Email</label>
            <input id="le" name="email" type="email" autocomplete="username" placeholder="admin@haircare.vn" [ngModel]="email()" (ngModelChange)="email.set($event); error.set('')" required />
          </div>
          <div class="al-field">
            <label class="al-label" for="lp">Password</label>
            <input id="lp" name="password" type="password" appPasswordToggle autocomplete="current-password" placeholder="Enter your password" [ngModel]="password()" (ngModelChange)="password.set($event); error.set('')" [attr.aria-invalid]="error() ? true : null" required />
          </div>

          @if (error()) { <div class="al-alert" role="alert">{{ error() }}</div> }

          <button class="al-submit" type="submit">
            <span>Sign in</span>
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>

          @if (devTools) { <p class="al-demo">Demo account: admin&#64;haircare.vn<br />Password: admin123</p> }
        </form>
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

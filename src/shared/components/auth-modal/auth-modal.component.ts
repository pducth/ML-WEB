import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './auth-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthModalComponent {
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  close(): void {
    this.auth.closeAuthModal();
  }

  switchTab(tab: 'login' | 'register'): void {
    this.auth.setAuthTab(tab);
  }

  login(event: SubmitEvent, email: string, password: string): void {
    event.preventDefault();
    this.auth.login({ email, password }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.finishSignIn('Đăng nhập thành công! Chào mừng bạn trở lại.'),
      error: () => this.toast.show('Email hoặc mật khẩu không chính xác.', 'error'),
    });
  }

  register(event: SubmitEvent, fullName: string, email: string, phone: string): void {
    event.preventDefault();
    this.auth
      .register({ fullName, email, phone, password: '********' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.finishSignIn('Tạo tài khoản thành công.'),
        error: () => this.toast.show('Không thể tạo tài khoản. Vui lòng thử lại.', 'error'),
      });
  }

  private finishSignIn(message: string): void {
    const target = this.auth.returnUrl() ?? '/profile';
    this.auth.returnUrl.set(null);
    this.auth.closeAuthModal();
    this.toast.show(message, 'success');
    void this.router.navigateByUrl(target);
  }
}

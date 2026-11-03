import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from './cart.service';
import { QuizService } from './quiz.service';
import { ToastService } from './toast.service';

/** Only same-site paths are accepted as return URLs (no open redirects). */
export function safeReturnUrl(url: string | null | undefined, fallback = '/'): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : fallback;
}

/**
 * Shared post-authentication steps for C10 sign-in and C11 sign-up:
 * merge the guest bag (BR-ACC-04), honour a pending "Save to Hair Profile" (BR-QUZ-07) and
 * return the customer to where they were (`returnUrl`).
 */
@Injectable({ providedIn: 'root' })
export class AccountFlowService {
  private readonly cart = inject(CartService);
  private readonly quiz = inject(QuizService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  completeSignIn(userId: string, returnUrl: string | null, fallback: string): void {
    const notes = this.cart.mergeGuestCart(userId);
    if (notes.length) this.toast.show(notes.join(' '), 'info');

    if (this.quiz.pendingSave() && this.quiz.result()) {
      if (this.quiz.myProfile()) {
        // An existing profile must not be overwritten without confirmation.
        void this.router.navigate(['/quiz/results'], { queryParams: { confirmSave: 1 } });
        return;
      }
      this.quiz.saveToProfile();
      this.toast.show('Hair Profile saved!', 'success');
      void this.router.navigateByUrl('/quiz/results');
      return;
    }
    void this.router.navigateByUrl(safeReturnUrl(returnUrl, fallback));
  }
}

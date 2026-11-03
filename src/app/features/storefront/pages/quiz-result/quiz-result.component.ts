import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { defaultVariant, type Product, type RoutineStep } from '../../../../core/models';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { QuizService } from '../../../../core/services/quiz.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StoreModalComponent } from '../../../../shared/ui/store-modal.component';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

const STEP_STYLE: Record<RoutineStep, string> = {
  cleanse: 'text-[#19594A] bg-[#19594A]/10',
  condition: 'text-[#4F7F72] bg-[#4F7F72]/10',
  treat: 'text-[#C9503A] bg-[#FF7F64]/10',
  style_protect: 'text-[#0F3D32] bg-[#0F3D32]/10',
};

/** C05 — Quiz result & personalised routine. */
@Component({
  selector: 'app-quiz-result',
  standalone: true,
  imports: [DatePipe, RouterLink, UsdPipe, StoreModalComponent],
  templateUrl: './quiz-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizResultComponent {
  private readonly quiz = inject(QuizService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly result = this.quiz.result;
  readonly existingProfile = this.quiz.myProfile;
  readonly stepStyle = STEP_STYLE;
  readonly confirmOpen = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('confirmSave') === '1' && this.quiz.result() !== null);
  readonly defaultVariant = defaultVariant;

  readonly routineProducts = computed(() => (this.result()?.steps ?? []).filter((s) => s.product).map((s) => s.product!));
  readonly routineTotal = computed(() => this.routineProducts().reduce((sum, p) => sum + (defaultVariant(p)?.price ?? 0), 0));

  addRoutine(): void {
    try {
      const { added, skipped } = this.quiz.addRoutineToCart();
      if (added) this.toast.show(`Added ${added} routine product${added > 1 ? 's' : ''} to your bag.${skipped.length ? ` Not added: ${skipped.join(', ')}.` : ''}`);
      else this.toast.error(`No routine products could be added${skipped.length ? `: ${skipped.join(', ')}` : ''}.`);
      if (added) this.cart.openDrawer();
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  addAddon(product: Product): void {
    const variant = defaultVariant(product);
    if (!variant) return;
    try {
      this.cart.add(product.id, variant.id, 1);
      this.toast.show(`${product.name} added to your bag.`);
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  save(): void {
    if (!this.auth.isLoggedIn()) {
      // BR-QUZ-07: keep the result in the session with a pending_save flag, then sign in.
      this.quiz.requestSaveAfterLogin();
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/quiz/results' } });
      return;
    }
    if (this.existingProfile()) {
      this.confirmOpen.set(true);
      return;
    }
    this.persist();
  }

  persist(): void {
    try {
      this.quiz.saveToProfile();
      this.confirmOpen.set(false);
      this.toast.show('Hair Profile saved!');
      void this.router.navigate([], { queryParams: {} });
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  cancelOverwrite(): void {
    this.confirmOpen.set(false);
    this.quiz.clearPendingSave();
    void this.router.navigate([], { queryParams: {} });
  }

  retake(): void {
    this.quiz.start();
    void this.router.navigateByUrl('/quiz');
  }
}

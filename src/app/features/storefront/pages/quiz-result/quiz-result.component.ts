import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { defaultVariant, type Product, type RoutineStep } from '../../../../core/models';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { HairRoutineEngineService } from '../../../../core/services/hair-routine-engine.service';
import { QuizService } from '../../../../core/services/quiz.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StoreModalComponent } from '../../../../shared/ui/store-modal.component';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

const ANSWER_LABEL: Record<string, string> = {
  scalp_condition: 'Scalp',
  hair_texture: 'Texture',
  hair_thickness: 'Thickness',
  hair_damage: 'Condition',
  chemical_history: 'Treatments',
  wash_frequency: 'Washing',
  primary_goal: 'Goal',
  formula_preference: 'Formula',
};

const STEP_HOW: Record<RoutineStep, { when: string; tip: string }> = {
  cleanse: { when: 'Every wash', tip: 'Massage into the scalp, then rinse with lukewarm water.' },
  condition: { when: 'Every wash', tip: 'Smooth through lengths and ends, leave for two minutes, rinse.' },
  treat: { when: 'Once or twice a week', tip: 'Use in place of conditioner or as directed on the pack.' },
  style_protect: { when: 'Whenever you style', tip: 'Apply to towel-dried or dry hair before or after styling.' },
};

const WASH_RHYTHM: Record<string, string> = {
  daily: 'a daily wash',
  every_2_3_days: 'a wash every 2 to 3 days',
  weekly: 'a wash once or twice a week',
};

/** C05: Quiz result & personalised routine. */
@Component({
  selector: 'app-quiz-result',
  standalone: true,
  imports: [DatePipe, RouterLink, UsdPipe, StoreModalComponent],
  templateUrl: './quiz-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizResultComponent {
  private readonly quiz = inject(QuizService);
  private readonly engine = inject(HairRoutineEngineService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly result = this.quiz.result;
  readonly existingProfile = this.quiz.myProfile;
  readonly stepHow = STEP_HOW;
  readonly confirmOpen = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('confirmSave') === '1' && this.quiz.result() !== null);
  readonly defaultVariant = defaultVariant;

  /** The shopper's own answers, in quiz order, with the option labels they picked. */
  readonly answerRows = computed(() => {
    const answers = this.quiz.answers();
    return this.engine
      .steps()
      .flatMap((step) => step.questions)
      .flatMap((question) => {
        const raw = answers[question.id];
        const picked = Array.isArray(raw) ? raw : raw ? [raw] : [];
        const labels = question.options.filter((option) => picked.includes(option.id)).map((option) => option.label);
        const skip = question.id === 'formula_preference' && picked[0] === 'none';
        return labels.length && !skip ? [{ name: ANSWER_LABEL[question.id] ?? question.text, value: labels.join(', ') }] : [];
      });
  });

  /** Each focus area with the plain-English reasons that put it on the list, main focus first. */
  readonly focusAreas = computed(() => {
    const r = this.result();
    if (!r) return [];
    return r.activeLabels.map((label) => ({
      label,
      title: this.engine.labelTitle(label),
      main: label === r.primaryLabel,
      reasons: [...new Set(r.matchedRules.filter((rule) => rule.label === label).map((rule) => rule.reason))],
    }));
  });

  readonly washRhythm = computed(() => WASH_RHYTHM[String(this.quiz.answers()['wash_frequency'] ?? '')] ?? '');

  /** First sentence of the product's own directions, kept short for the report. */
  howTo(product: Product): string {
    const first = product.howToUse.split(/(?<=[.!?])\s/)[0]?.trim() ?? '';
    return first.length > 150 ? first.slice(0, 147).trimEnd() + '…' : first;
  }

  benefits(product: Product): string[] {
    return product.keyBenefits.filter((b) => b.trim()).slice(0, 3);
  }

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

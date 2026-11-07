import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { defaultVariant, type Product } from '../../../../core/models';
import { CartService } from '../../../../core/services/cart.service';
import { HairRoutineEngineService, type QuizOptionView, type QuizQuestionView } from '../../../../core/services/hair-routine-engine.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { QuizService } from '../../../../core/services/quiz.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';
import { QUIZ_ART_QUESTIONS, QuizOptionArtComponent } from './quiz-option-art.component';

type Phase = 'intro' | 'questions' | 'analyzing' | 'result';

const STEP_SHORT: Record<string, string> = { scalp: 'Scalp', hair_condition: 'Strands', habits_history: 'Color & wash', goal: 'Goal' };
const AUTO_ADVANCE_MS = 350;
const ANALYZING_MS = 1600;

/** C04: full-screen Hair Routine Quiz: one question per screen (hair texture and thickness are illustrated), then the C05 routine with per-item and full-set add to bag. */
@Component({
  selector: 'app-hair-quiz',
  standalone: true,
  imports: [NgClass, RouterLink, UsdPipe, QuizOptionArtComponent],
  templateUrl: './hair-quiz.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HairQuizComponent {
  private readonly engine = inject(HairRoutineEngineService);
  private readonly quiz = inject(QuizService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly settings = inject(SettingsService).settings;
  readonly steps = this.engine.steps();
  readonly version = this.engine.version();
  readonly stepShort = STEP_SHORT;
  readonly defaultVariant = defaultVariant;

  /** Every question in ruleset order, tagged with the step it belongs to. */
  readonly flow = this.steps.flatMap((step, stepIndex) =>
    step.questions.map((question, pos) => ({ step, stepIndex, question, pos, countInStep: step.questions.length })),
  );

  readonly answers = this.quiz.answers;
  readonly result = this.quiz.result;
  readonly phase = signal<Phase>('intro');
  readonly cursor = signal(0);
  readonly showError = signal(false);

  readonly current = computed(() => this.flow[this.cursor()]);
  readonly isLast = computed(() => this.cursor() === this.flow.length - 1);
  readonly answered = computed(() => !this.isEmpty(this.answers()[this.current().question.id]));
  readonly canContinue = computed(() => !this.current().question.required || this.answered());
  /** Fill ratio (0–1) of each of the 4 step segments in the progress bar. */
  readonly segments = computed(() => {
    if (this.phase() === 'analyzing' || this.phase() === 'result') return this.steps.map(() => 1);
    if (this.phase() === 'intro') return this.steps.map(() => 0);
    const { stepIndex, pos, countInStep } = this.current();
    return this.steps.map((_, i) => (i < stepIndex ? 1 : i > stepIndex ? 0 : (pos + 1) / countInStep));
  });

  readonly routineProducts = computed(() => (this.result()?.steps ?? []).filter((s) => s.product).map((s) => s.product!));
  readonly routineTotal = computed(() => this.routineProducts().reduce((sum, p) => sum + (defaultVariant(p)?.price ?? 0), 0));
  readonly inBag = computed(() => new Set(this.cart.lines().map((line) => line.productId)));
  readonly routineInBag = computed(() => this.routineProducts().length > 0 && this.routineProducts().every((p) => this.inBag().has(p.id)));

  constructor() {
    if (this.quiz.completed()) this.quiz.start();
    // Resume an unfinished quiz at the first unanswered required question.
    const answers = this.answers();
    if (Object.values(answers).some((v) => !this.isEmpty(v))) {
      const firstOpen = this.flow.findIndex((f) => f.question.required && this.isEmpty(answers[f.question.id]));
      this.cursor.set(firstOpen === -1 ? this.flow.length - 1 : firstOpen);
      this.phase.set('questions');
    }

    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  begin(): void {
    this.quiz.start();
    this.cursor.set(0);
    this.showError.set(false);
    this.phase.set('questions');
    this.scrollTop();
  }

  hasArt(questionId: string): boolean {
    return QUIZ_ART_QUESTIONS.includes(questionId);
  }

  isSelected(question: QuizQuestionView, option: QuizOptionView): boolean {
    const value = this.answers()[question.id];
    return Array.isArray(value) ? value.includes(option.id) : value === option.id;
  }

  choose(question: QuizQuestionView, option: QuizOptionView): void {
    this.showError.set(false);
    if (question.type === 'single') {
      // Optional questions can be cleared by clicking the selected answer again.
      const same = this.answers()[question.id] === option.id;
      const value = same && !question.required ? null : option.id;
      this.quiz.setAnswer(question.id, value);
      // The last question waits for an explicit "See my routine" click.
      if (value && !this.isLast()) this.autoAdvance();
      return;
    }
    const current = (this.answers()[question.id] as string[] | null) ?? [];
    let next: string[];
    if (current.includes(option.id)) next = current.filter((id) => id !== option.id);
    else if (option.exclusive) next = [option.id];
    else {
      const exclusive = question.options.filter((o) => o.exclusive).map((o) => o.id);
      next = [...current.filter((id) => !exclusive.includes(id)), option.id];
    }
    this.quiz.setAnswer(question.id, next.length ? next : null);
  }

  next(): void {
    this.clearTimer();
    if (!this.canContinue()) {
      this.showError.set(true);
      return;
    }
    if (this.isLast()) {
      this.finish();
      return;
    }
    this.cursor.update((i) => i + 1);
    this.scrollTop();
  }

  /** Optional questions only: leave unanswered and move on. */
  skip(): void {
    this.quiz.setAnswer(this.current().question.id, null);
    this.next();
  }

  back(): void {
    this.clearTimer();
    this.showError.set(false);
    if (this.cursor() === 0) this.phase.set('intro');
    else this.cursor.update((i) => i - 1);
    this.scrollTop();
  }

  goTo(stepIndex: number): void {
    // Only already-reached steps are clickable in the progress bar.
    const target = this.flow.findIndex((f) => f.stepIndex === stepIndex);
    if (this.phase() !== 'questions' || target < 0 || target > this.cursor()) return;
    this.clearTimer();
    this.cursor.set(target);
    this.scrollTop();
  }

  addProduct(product: Product): void {
    const variant = defaultVariant(product);
    if (!variant) return;
    try {
      this.cart.add(product.id, variant.id, 1);
      this.toast.show(`${product.name} added to your bag.`);
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

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

  openBag(): void {
    this.cart.openDrawer();
  }

  retake(): void {
    this.begin();
  }

  private finish(): void {
    try {
      this.quiz.complete();
    } catch (error) {
      this.toast.error(errorMessage(error));
      return;
    }
    this.phase.set('analyzing');
    this.scrollTop();
    this.timer = setTimeout(() => {
      this.phase.set('result');
      this.scrollTop();
    }, ANALYZING_MS);
  }

  private autoAdvance(): void {
    this.clearTimer();
    const at = this.cursor();
    this.timer = setTimeout(() => {
      if (this.phase() === 'questions' && this.cursor() === at) this.next();
    }, AUTO_ADVANCE_MS);
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private scrollTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private isEmpty(value: string | string[] | null | undefined): boolean {
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  }
}

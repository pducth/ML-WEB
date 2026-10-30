import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { HairRoutineResult } from '../../../../core/services/hair-routine-engine.service';
import { HairRoutineEngineService, type HairRoutineConfig } from '../../../../core/services/hair-routine-engine.service';
import { ToastService } from '../../../../core/services/toast.service';

type AnswerValue = string | string[] | null;
type QuizAnswers = Record<string, AnswerValue>;

const QUIZ_RESULT_KEY = 'haircare-quiz-result';
const QUIZ_ANSWERS_KEY = 'haircare-quiz-answers';

@Component({
  selector: 'app-hair-quiz',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './hair-quiz.component.html',
  styleUrl: './hair-quiz.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HairQuizComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly engine = inject(HairRoutineEngineService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<'quiz' | 'results'>('quiz');
  readonly config = signal<HairRoutineConfig | null>(null);
  readonly answers = signal<QuizAnswers>({});
  readonly result = signal<HairRoutineResult | null>(null);
  readonly currentStep = signal(0);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const resultsPage = data['customerPage'] === 'quiz-results';
      this.mode.set(resultsPage ? 'results' : 'quiz');
      if (resultsPage) {
        this.loadStoredResult();
      } else {
        this.loadQuiz();
      }
    });
  }

  private loadQuiz(): void {
    this.loading.set(true);
    this.engine.getConfig().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (config) => {
        this.config.set(config);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('The Hair Quiz configuration could not be loaded. Please try again later.');
        this.loading.set(false);
      },
    });
  }

  private loadStoredResult(): void {
    try {
      const storedResult = sessionStorage.getItem(QUIZ_RESULT_KEY);
      if (!storedResult) {
        void this.router.navigate(['/quiz']);
        return;
      }
      this.result.set(JSON.parse(storedResult) as HairRoutineResult);
      this.loading.set(false);
    } catch {
      this.errorMessage.set('Your Hair Quiz results could not be read. Please retake the quiz.');
      this.loading.set(false);
    }
  }

  setAnswer(questionId: string, optionId: string, type: 'single' | 'multi', exclusive = false): void {
    this.answers.update((answers) => {
      if (type === 'single') return { ...answers, [questionId]: optionId };
      const current = Array.isArray(answers[questionId]) ? answers[questionId] as string[] : [];
      const next = exclusive
        ? current.includes(optionId) ? [] : [optionId]
        : current.includes(optionId)
          ? current.filter((value) => value !== optionId)
          : [...current.filter((value) => value !== 'none'), optionId];
      return { ...answers, [questionId]: next };
    });
    this.errorMessage.set('');
  }

  isSelected(questionId: string, optionId: string): boolean {
    const answer = this.answers()[questionId];
    return Array.isArray(answer) ? answer.includes(optionId) : answer === optionId;
  }

  canContinue(): boolean {
    const step = this.config()?.steps[this.currentStep()];
    if (!step) return false;
    return step.questions.every((question) => {
      if (!question.required) return true;
      const answer = this.answers()[question.id];
      return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
    });
  }

  next(): void {
    if (!this.canContinue()) {
      this.errorMessage.set('Please answer all required questions before continuing.');
      return;
    }
    const finalStep = (this.config()?.steps.length ?? 1) - 1;
    if (this.currentStep() < finalStep) {
      this.currentStep.update((step) => step + 1);
      this.errorMessage.set('');
      return;
    }
    this.engine.infer(this.answers()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        try {
          sessionStorage.setItem(QUIZ_RESULT_KEY, JSON.stringify(result));
          sessionStorage.setItem(QUIZ_ANSWERS_KEY, JSON.stringify(this.answers()));
          this.result.set(result);
          void this.router.navigate(['/quiz/results']);
        } catch {
          this.errorMessage.set('Your browser could not save the result. Please enable session storage and try again.');
        }
      },
      error: (error: unknown) => {
        this.errorMessage.set(error instanceof Error ? error.message : 'The routine could not be generated.');
      },
    });
  }

  back(): void {
    if (this.currentStep() > 0) this.currentStep.update((step) => step - 1);
  }

  retake(): void {
    this.answers.set({});
    this.result.set(null);
    this.currentStep.set(0);
    try {
      sessionStorage.removeItem(QUIZ_RESULT_KEY);
      sessionStorage.removeItem(QUIZ_ANSWERS_KEY);
    } catch {
      this.toast.show('Browser storage is unavailable; previous result may remain in this session.', 'error');
    }
    void this.router.navigate(['/quiz']);
  }

  openShop(): void {
    const label = this.result()?.primaryLabel;
    void this.router.navigate(['/shop'], { queryParams: label ? { q: label } : {} });
  }
}

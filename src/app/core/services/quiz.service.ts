import { Injectable, computed, inject, signal } from '@angular/core';
import { readJson, writeJson } from '../data/browser-storage';
import { DomainError, MockDbService, newId, nowIso } from '../data/mock-db.service';
import { defaultVariant, type HairProfile, type QuizAnswers } from '../models';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';
import { HairRoutineEngineService, type HairRoutineResult } from './hair-routine-engine.service';

interface QuizSession {
  answers: QuizAnswers;
  eventId: string | null;
  completedAt: string | null;
}

const QUIZ_SESSION_KEY = 'haircare-insight:quiz';
const PENDING_SAVE_KEY = 'haircare-insight:quiz-pending-save';

@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly store = inject(MockDbService);
  private readonly engine = inject(HairRoutineEngineService);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly session = signal<QuizSession>(readJson<QuizSession>('session', QUIZ_SESSION_KEY, { answers: {}, eventId: null, completedAt: null }));

  readonly answers = computed(() => this.session().answers);
  readonly completed = computed(() => this.session().completedAt !== null);
  /** Recomputed against live stock so the C05 routine never shows an unavailable product. */
  readonly result = computed<HairRoutineResult | null>(() => {
    const session = this.session();
    if (!session.completedAt) return null;
    this.store.db();
    try {
      return this.engine.infer(session.answers);
    } catch {
      return null;
    }
  });
  readonly pendingSave = signal(readJson<boolean>('session', PENDING_SAVE_KEY, false));

  readonly myProfile = computed<HairProfile | null>(() => {
    const user = this.auth.currentUser();
    return user ? (this.store.db().hairProfiles.find((p) => p.userId === user.id) ?? null) : null;
  });

  start(): void {
    this.persist({ answers: {}, eventId: null, completedAt: null });
  }

  setAnswer(questionId: string, value: string | string[] | null): void {
    this.persist({ ...this.session(), answers: { ...this.session().answers, [questionId]: value } });
  }

  /** Runs the engine and records an anonymous Quiz_Event (time, labels, ruleset version only — BR-QUZ-10). */
  complete(): HairRoutineResult {
    const answers = Object.fromEntries(Object.entries(this.session().answers).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length)));
    const result = this.engine.infer(answers);
    const eventId = newId('qe');
    this.store.mutate((db) => {
      db.quizEvents.push({ id: eventId, at: nowIso(), primaryLabel: result.primaryLabel, secondaryLabel: result.secondaryLabel, rulesetVersion: result.rulesetVersion, addedRoutineToCart: false });
    });
    this.persist({ answers, eventId, completedAt: nowIso() });
    return result;
  }

  /** "Add Full Routine to Cart": every routine product in its default in-stock size, one click. */
  addRoutineToCart(): { added: number; skipped: string[] } {
    const result = this.result();
    if (!result) throw new DomainError('Please complete the Hair Quiz first.');
    let added = 0;
    const skipped: string[] = [];
    for (const step of result.steps) {
      if (!step.product) continue;
      const variant = defaultVariant(step.product);
      try {
        if (!variant) throw new DomainError('unavailable');
        this.cart.add(step.product.id, variant.id, 1);
        added++;
      } catch {
        skipped.push(step.product.name);
      }
    }
    const eventId = this.session().eventId;
    if (added && eventId) {
      this.store.mutate((db) => {
        const event = db.quizEvents.find((e) => e.id === eventId);
        if (event) event.addedRoutineToCart = true;
      });
    }
    return { added, skipped };
  }

  /** Remembers that a guest asked to save, so the profile is written right after sign-in (BR-QUZ-07). */
  requestSaveAfterLogin(): void {
    this.pendingSave.set(true);
    writeJson('session', PENDING_SAVE_KEY, true);
  }

  clearPendingSave(): void {
    this.pendingSave.set(false);
    writeJson('session', PENDING_SAVE_KEY, null);
  }

  saveToProfile(): HairProfile {
    const user = this.auth.currentUser();
    const result = this.result();
    if (!user) throw new DomainError('Please sign in to save your Hair Profile.');
    if (!result) throw new DomainError('Please complete the Hair Quiz first.');
    const profile = this.store.mutate((db) => {
      const existing = db.hairProfiles.find((p) => p.userId === user.id);
      const next: HairProfile = {
        id: existing?.id ?? newId('hp'),
        userId: user.id,
        answers: this.session().answers,
        primaryLabel: result.primaryLabel,
        secondaryLabel: result.secondaryLabel,
        routine: result.steps.map((step) => ({ step: step.id, productId: step.product?.id ?? null, productName: step.product?.name ?? null })),
        addonProductId: result.addon?.id ?? null,
        rulesetVersion: result.rulesetVersion,
        savedAt: nowIso(),
      };
      if (existing) Object.assign(existing, next);
      else db.hairProfiles.push(next);
      return next;
    });
    this.clearPendingSave();
    return profile;
  }

  private persist(session: QuizSession): void {
    this.session.set(session);
    writeJson('session', QUIZ_SESSION_KEY, session);
  }
}

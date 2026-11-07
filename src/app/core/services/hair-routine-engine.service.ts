import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DomainError } from '../data/mock-db.service';
import { productAvailable, type Product, type QuizAnswers, type RoutineStep } from '../models';
import { ProductService } from './product.service';

interface RuleCondition {
  q?: string;
  op?: 'eq' | 'in' | 'contains_any';
  value?: string | string[];
  all?: RuleCondition[];
  any?: RuleCondition[];
  not?: RuleCondition;
}

interface RulesetOption {
  id: string;
  label_en: string;
  hint_en?: string;
  exclusive?: boolean;
}

interface RulesetQuestion {
  id: string;
  type: 'single' | 'multi';
  required: boolean;
  text_en: string;
  options: RulesetOption[];
}

interface RulesetStep {
  id: string;
  order: number;
  title_en: string;
  subtitle_en: string;
  questions: RulesetQuestion[];
}

interface Candidate {
  product: string;
  when?: RuleCondition;
}

interface Ruleset {
  ruleset_version: string;
  steps: RulesetStep[];
  labels: { priority_order: string[]; goal_to_label?: Record<string, string>; definitions: Record<string, { display_en: string }> };
  rules: Array<{ id: string; label: string; description: string; reason_en?: string; when: RuleCondition }>;
  fallback: { rule_id: string; label: string; description: string; reason_en?: string };
  routine: {
    steps: Array<{ id: RoutineStep; order: number; title_en: string }>;
    min_steps: number;
    by_label: Record<string, Record<string, Candidate[]>>;
    addons_by_label: Record<string, Candidate[]>;
    preference?: { question: string; product_tag: string; none_value: string };
  };
  disclaimer: { text_en: string };
}

export interface QuizOptionView {
  id: string;
  label: string;
  hint: string;
  exclusive: boolean;
}

export interface QuizQuestionView {
  id: string;
  type: 'single' | 'multi';
  required: boolean;
  text: string;
  options: QuizOptionView[];
}

export interface QuizStepView {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  questions: QuizQuestionView[];
}

export interface RoutineStepResult {
  id: RoutineStep;
  order: number;
  title: string;
  status: 'ok' | 'substituted' | 'skipped';
  product: Product | null;
  substitutedFor: Product | null;
  note: string | null;
}

export interface HairRoutineResult {
  rulesetVersion: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  activeLabels: string[];
  fallbackUsed: boolean;
  matchedRules: Array<{ id: string; label: string; description: string; reason: string }>;
  diagnosis: { title: string; advice: string; secondaryTitle: string | null; secondaryAdvice: string | null };
  steps: RoutineStepResult[];
  addon: Product | null;
  notes: string[];
  meetsMinSteps: boolean;
  disclaimer: string;
}

const LABEL_ADVICE: Record<string, string> = {
  Repair: 'Your strands show signs of damage. Rebuild them with a restorative mask once or twice a week, and keep hot tools to a minimum.',
  Scalp: 'A healthy scalp is the foundation of healthy hair. Cleanse gently with lukewarm water and let the formulas do the work, without scratching.',
  Color: 'Color-treated hair loses vibrancy quickly. Choose color-safe formulas and limit hot water and UV exposure to keep your shade true.',
  Curl: 'Curls thrive on moisture and definition. Layer curl-specific formulas to control frizz and keep every coil defined.',
  Hydration: 'Your hair is craving moisture. A consistent hydrating routine restores softness, smoothness and ease of styling.',
  Volume: 'Lightweight, lifting formulas add body at the roots without weighing hair down.',
  Styling: 'The right prep makes every finish last. Smooth or texturise with products matched to your hair type.',
};

/** One short line for the "also" focus area shown beside the main diagnosis. */
const LABEL_SECONDARY: Record<string, string> = {
  Repair: 'Strengthen weakened strands with a weekly restorative mask.',
  Scalp: 'Keep the scalp balanced and comfortable between washes.',
  Color: 'Protect your color from fading and brassiness.',
  Curl: 'Boost curl definition and reduce frizz.',
  Hydration: 'Lock in moisture for softer, smoother hair.',
  Volume: 'Add lift and body without the weight.',
  Styling: 'Finish with smoothness, texture and hold.',
};

/**
 * Deterministic rule-based Hair Routine Engine (C04/C05), a TypeScript port of
 * docs/HairRoutineEngine/hair_routine_engine.py using the same JSON ruleset. Inventory is read
 * live from the store: a product is eligible only if Active and Available > 0 (BR-QUZ-05).
 */
@Injectable({ providedIn: 'root' })
export class HairRoutineEngineService {
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(ProductService);
  private readonly ruleset = signal<Ruleset | null>(null);

  readonly version = () => this.ruleset()?.ruleset_version ?? '';

  async load(): Promise<void> {
    this.ruleset.set(await firstValueFrom(this.http.get<Ruleset>('/assets/hair-routine/hair_routine_rules.json')));
  }

  steps(): QuizStepView[] {
    return this.requireRuleset().steps.map((step) => ({
      id: step.id,
      order: step.order,
      title: step.title_en,
      subtitle: step.subtitle_en,
      questions: step.questions.map((question) => ({
        id: question.id,
        type: question.type,
        required: question.required,
        text: question.text_en,
        options: question.options.map((option) => ({
          id: option.id,
          label: option.label_en,
          hint: option.hint_en ?? '',
          exclusive: option.exclusive === true,
        })),
      })),
    }));
  }

  labelTitle(label: string): string {
    return this.ruleset()?.labels.definitions[label]?.display_en ?? label;
  }

  /** Returns the list of unanswered required questions of one step (BR-QUZ-01). */
  missingRequired(stepId: string, answers: QuizAnswers): string[] {
    const step = this.requireRuleset().steps.find((s) => s.id === stepId);
    return (step?.questions ?? []).filter((q) => q.required && this.isEmpty(answers[q.id])).map((q) => q.id);
  }

  infer(rawAnswers: QuizAnswers): HairRoutineResult {
    const ruleset = this.requireRuleset();
    const answers = this.validate(ruleset, rawAnswers);
    const rank = (label: string) => ruleset.labels.priority_order.indexOf(label);
    const fired = ruleset.rules.filter((rule) => this.matches(rule.when, answers));
    let active = [...new Set(fired.map((rule) => rule.label))].sort((a, b) => rank(a) - rank(b));
    const notes: string[] = [];
    const fallbackUsed = active.length === 0;
    if (fallbackUsed) {
      active = [ruleset.fallback.label];
      notes.push('Your answers did not match a specialist rule, so we suggest a gentle daily hydration routine that suits every hair type.');
    }
    // The shopper's own goal decides the main label when the rule for it fired; the others follow by priority.
    const goalLabel = ruleset.labels.goal_to_label?.[String(answers['primary_goal'])];
    if (goalLabel && active.includes(goalLabel)) active = [goalLabel, ...active.filter((label) => label !== goalLabel)];
    const primary = active[0];
    const secondary = active[1] ?? null;

    const byKey = new Map(this.catalog.products().map((product) => [product.key, product]));
    const scalp = String(answers['scalp_condition']);
    const used = new Set<string>();
    const steps: RoutineStepResult[] = [...ruleset.routine.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => {
        const result = this.pickStep(ruleset, step, primary, answers, scalp, byKey);
        if (result.product) used.add(result.product.key);
        if (result.note) notes.push(result.note);
        return result;
      });
    const filled = steps.filter((step) => step.product).length;
    const meetsMinSteps = filled >= ruleset.routine.min_steps;
    if (!meetsMinSteps) notes.push(`Your routine currently has ${filled}/4 steps because some products are out of stock.`);

    let addon: Product | null = null;
    if (secondary) {
      const eligible = this.preferFirst(
        ruleset,
        (ruleset.routine.addons_by_label[secondary] ?? [])
          .filter((c) => !c.when || this.matches(c.when, answers))
          .map((c) => byKey.get(c.product))
          .filter((p): p is Product => p !== undefined && this.scalpOk(p, scalp)),
        answers,
      );
      addon = eligible.find((product) => !used.has(product.key) && this.inStock(product)) ?? null;
    }

    return {
      rulesetVersion: ruleset.ruleset_version,
      primaryLabel: primary,
      secondaryLabel: secondary,
      activeLabels: active,
      fallbackUsed,
      matchedRules: fired.length
        ? fired.map(({ id, label, description, reason_en }) => ({ id, label, description, reason: reason_en ?? description }))
        : [{ id: ruleset.fallback.rule_id, label: ruleset.fallback.label, description: ruleset.fallback.description, reason: ruleset.fallback.reason_en ?? ruleset.fallback.description }],
      diagnosis: {
        title: this.labelTitle(primary),
        advice: LABEL_ADVICE[primary] ?? '',
        secondaryTitle: secondary ? this.labelTitle(secondary) : null,
        secondaryAdvice: secondary ? (LABEL_SECONDARY[secondary] ?? null) : null,
      },
      steps,
      addon,
      notes,
      meetsMinSteps,
      disclaimer: ruleset.disclaimer.text_en,
    };
  }

  private pickStep(
    ruleset: Ruleset,
    step: { id: RoutineStep; order: number; title_en: string },
    label: string,
    answers: QuizAnswers,
    scalp: string,
    byKey: Map<string, Product>,
  ): RoutineStepResult {
    const base = { id: step.id, order: step.order, title: step.title_en };
    const candidates = ruleset.routine.by_label[label]?.[step.id] ?? [];
    const eligible = this.preferFirst(
      ruleset,
      candidates
        .filter((c) => !c.when || this.matches(c.when, answers))
        .map((c) => byKey.get(c.product))
        .filter((p): p is Product => p !== undefined && this.scalpOk(p, scalp)),
      answers,
    );
    if (!eligible.length) {
      return { ...base, status: 'skipped', product: null, substitutedFor: null, note: `${step.title_en}: no product matches your hair profile yet, so this step is skipped.` };
    }
    const preferred = eligible[0];
    // 1) candidates declared by the ruleset, in order
    const declared = eligible.find((product) => this.inStock(product));
    if (declared) return this.chosen(base, declared, preferred);
    // 2) automatic equivalent: same step, covers the label, substitutable, not already listed for the step
    const listed = new Set(candidates.map((c) => c.product));
    const pool = this.catalog
      .products()
      .filter((p) => p.quiz.step === step.id && p.quiz.needs.includes(label) && p.allowAutoSubstitute && !listed.has(p.key) && this.scalpOk(p, scalp) && this.inStock(p))
      .sort((a, b) => Number(!this.prefers(ruleset, a, answers)) - Number(!this.prefers(ruleset, b, answers)) || a.quiz.needs.length - b.quiz.needs.length || a.key.localeCompare(b.key));
    if (pool.length) return this.chosen(base, pool[0], preferred);
    // 3) nothing available → skip with a transparent note
    return { ...base, status: 'skipped', product: null, substitutedFor: preferred, note: `${step.title_en}: ${preferred.name} is temporarily out of stock and has no equivalent, so this step is skipped.` };
  }

  private chosen(base: { id: RoutineStep; order: number; title: string }, product: Product, preferred: Product): RoutineStepResult {
    if (product.key === preferred.key) return { ...base, status: 'ok', product, substitutedFor: null, note: null };
    return { ...base, status: 'substituted', product, substitutedFor: preferred, note: `${preferred.name} is temporarily out of stock, so it was replaced with ${product.name}, which offers the same benefits.` };
  }

  /** The optional formula preference only reorders products that already suit the shopper; it never drops one. */
  private prefers(ruleset: Ruleset, product: Product, answers: QuizAnswers): boolean {
    const preference = ruleset.routine.preference;
    const wanted = preference ? answers[preference.question] : null;
    return !!preference && typeof wanted === 'string' && wanted !== preference.none_value && (product.quiz.formula ?? []).includes(wanted);
  }

  private preferFirst(ruleset: Ruleset, products: Product[], answers: QuizAnswers): Product[] {
    return [...products].sort((a, b) => Number(!this.prefers(ruleset, a, answers)) - Number(!this.prefers(ruleset, b, answers)));
  }

  private inStock(product: Product): boolean {
    return product.status === 'Active' && productAvailable(product) > 0;
  }

  private scalpOk(product: Product, scalp: string): boolean {
    return product.quiz.scalp.includes('all') || product.quiz.scalp.includes(scalp);
  }

  private isEmpty(value: string | string[] | null | undefined): boolean {
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  }

  private validate(ruleset: Ruleset, answers: QuizAnswers): QuizAnswers {
    const issues: string[] = [];
    const normalized: QuizAnswers = {};
    const known = new Map(ruleset.steps.flatMap((s) => s.questions).map((q) => [q.id, q]));
    for (const key of Object.keys(answers)) if (!known.has(key)) issues.push(`Unknown question ${key}`);
    for (const question of known.values()) {
      const raw = answers[question.id];
      if (this.isEmpty(raw)) {
        if (question.required) issues.push(question.text_en);
        continue;
      }
      const ids = new Set(question.options.map((o) => o.id));
      if (question.type === 'single') {
        if (typeof raw !== 'string' || !ids.has(raw)) issues.push(question.text_en);
        else normalized[question.id] = raw;
        continue;
      }
      const values = [...new Set(Array.isArray(raw) ? raw : [raw as string])].sort();
      const exclusive = question.options.filter((o) => o.exclusive).map((o) => o.id);
      if (values.some((v) => !ids.has(v)) || (values.some((v) => exclusive.includes(v)) && values.length > 1)) {
        issues.push(question.text_en);
        continue;
      }
      normalized[question.id] = values;
    }
    if (issues.length) throw new DomainError(`Please review your answers: ${issues.join('; ')}.`);
    return normalized;
  }

  private matches(condition: RuleCondition, answers: QuizAnswers): boolean {
    if (condition.all) return condition.all.every((c) => this.matches(c, answers));
    if (condition.any) return condition.any.some((c) => this.matches(c, answers));
    if (condition.not) return !this.matches(condition.not, answers);
    const answer = condition.q ? answers[condition.q] : undefined;
    if (answer === undefined || answer === null) return false;
    if (condition.op === 'eq') return answer === condition.value;
    if (condition.op === 'in') return typeof answer === 'string' && Array.isArray(condition.value) && condition.value.includes(answer);
    if (condition.op === 'contains_any') return Array.isArray(answer) && Array.isArray(condition.value) && answer.some((a) => condition.value!.includes(a));
    return false;
  }

  private requireRuleset(): Ruleset {
    const ruleset = this.ruleset();
    if (!ruleset) throw new Error('Hair routine ruleset is not loaded.');
    return ruleset;
  }
}

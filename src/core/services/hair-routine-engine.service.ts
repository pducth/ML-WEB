import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, shareReplay } from 'rxjs';

interface QuizOption {
  id: string;
  label_vi: string;
  description_vi?: string;
  exclusive?: boolean;
}

interface QuizQuestion {
  id: string;
  type: 'single' | 'multi';
  required: boolean;
  text_vi: string;
  options: QuizOption[];
}

interface QuizStep {
  id: string;
  order: number;
  title_vi: string;
  questions: QuizQuestion[];
}

interface RuleCondition {
  q?: string;
  op?: 'eq' | 'in' | 'contains_any';
  value?: string | string[];
  all?: RuleCondition[];
  any?: RuleCondition[];
  not?: RuleCondition;
}

interface QuizRule {
  id: string;
  label: string;
  description: string;
  when: RuleCondition;
}

interface RoutineCandidate {
  product: string;
  when?: RuleCondition;
}

interface Ruleset {
  ruleset_version: string;
  steps: QuizStep[];
  labels: {
    priority_order: string[];
    definitions: Record<string, { display_en: string; advice_vi: string }>;
  };
  rules: QuizRule[];
  fallback: { rule_id: string; label: string; description: string };
  routine: {
    steps: Array<{ id: string; order: number; title_en: string; title_vi: string }>;
    min_steps: number;
    max_addons: number;
    by_label: Record<string, Record<string, RoutineCandidate[]>>;
    addons_by_label: Record<string, RoutineCandidate[]>;
  };
  disclaimer: { text_en: string; text_vi: string };
}

interface CatalogProduct {
  product_id: string;
  active: boolean;
  name: string;
  category: string;
  url: string;
  image_url: string;
  price_usd: number;
  key: string;
  inventory_available: number;
  quiz: { scalp: string[]; needs: string[]; step: string };
  allow_auto_substitute: boolean;
}

interface ProductCatalog {
  products: CatalogProduct[];
}

export interface RoutineStepResult {
  id: string;
  title: string;
  product: CatalogProduct | null;
  substituted: boolean;
  note: string;
}

export interface HairRoutineResult {
  rulesetVersion: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  diagnosis: { displayName: string; advice: string };
  fallbackUsed: boolean;
  steps: RoutineStepResult[];
  addon: CatalogProduct | null;
  notes: string[];
  disclaimer: string;
}

export interface HairRoutineConfig {
  steps: QuizStep[];
  version: string;
}

@Injectable({ providedIn: 'root' })
export class HairRoutineEngineService {
  private readonly http = inject(HttpClient);
  private readonly config$ = forkJoin({
    ruleset: this.http.get<Ruleset>('/assets/hair-routine/hair_routine_rules.json'),
    catalog: this.http.get<ProductCatalog>('/assets/hair-routine/product_quiz_catalog.json'),
  }).pipe(
    map(({ ruleset, catalog }) => {
      if (!ruleset.steps.length || !catalog.products.length) {
        throw new Error('Hair routine rules or catalog is empty.');
      }
      return { ruleset, catalog };
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  getConfig() {
    return this.config$.pipe(
      map(({ ruleset }): HairRoutineConfig => ({
        steps: [...ruleset.steps].sort((a, b) => a.order - b.order),
        version: ruleset.ruleset_version,
      })),
    );
  }

  infer(answers: Record<string, string | string[] | null>) {
    return this.config$.pipe(map(({ ruleset, catalog }) => this.evaluate(ruleset, catalog, answers)));
  }

  private evaluate(
    ruleset: Ruleset,
    catalog: ProductCatalog,
    answers: Record<string, string | string[] | null>,
  ): HairRoutineResult {
    this.validateAnswers(ruleset, answers);
    const firedRules = ruleset.rules.filter((rule) => this.matches(rule.when, answers));
    const matchedLabels = [...new Set(firedRules.map((rule) => rule.label))].sort(
      (left, right) => ruleset.labels.priority_order.indexOf(left) - ruleset.labels.priority_order.indexOf(right),
    );
    const fallbackUsed = matchedLabels.length === 0;
    const labels = fallbackUsed ? [ruleset.fallback.label] : matchedLabels;
    const primaryLabel = labels[0];
    const secondaryLabel = labels[1] ?? null;
    const productByKey = new Map(catalog.products.map((product) => [product.key, product]));
    const scalp = String(answers['scalp_condition']);
    const steps: RoutineStepResult[] = [];
    const used = new Set<string>();
    const notes: string[] = [];

    for (const step of [...ruleset.routine.steps].sort((a, b) => a.order - b.order)) {
      const candidates = ruleset.routine.by_label[primaryLabel]?.[step.id] ?? [];
      const eligible = candidates.filter(
        (candidate) =>
          (!candidate.when || this.matches(candidate.when, answers)) &&
          this.matchesScalp(productByKey.get(candidate.product), scalp),
      );
      const selected = eligible.find((candidate) => this.isAvailable(productByKey.get(candidate.product)));
      const preferred = eligible[0]?.product;
      let product = selected ? productByKey.get(selected.product) ?? null : null;
      let substituted = false;
      let note = '';

      if (!eligible.length) {
        note = `No matching product was configured for ${step.title_en}.`;
      } else if (!product && preferred) {
        const listed = new Set(candidates.map((candidate) => candidate.product));
        const replacement = catalog.products
          .filter(
            (item) =>
              item.quiz.step === step.id &&
              item.quiz.needs.includes(primaryLabel) &&
              item.allow_auto_substitute &&
              !listed.has(item.key) &&
              this.matchesScalp(item, scalp) &&
              this.isAvailable(item),
          )
          .sort((left, right) => left.quiz.needs.length - right.quiz.needs.length || left.key.localeCompare(right.key))[0];
        if (replacement) {
          product = replacement;
          substituted = true;
          note = `${productByKey.get(preferred)?.name ?? preferred} is unavailable; an equivalent item is suggested.`;
        } else {
          note = `${productByKey.get(preferred)?.name ?? preferred} is unavailable and has no in-stock substitute.`;
        }
      }

      if (product) used.add(product.key);
      if (note) notes.push(note);
      steps.push({ id: step.id, title: step.title_en, product, substituted, note });
    }

    const addon = secondaryLabel
      ? (ruleset.routine.addons_by_label[secondaryLabel] ?? [])
          .filter((candidate) => !candidate.when || this.matches(candidate.when, answers))
          .map((candidate) => productByKey.get(candidate.product))
          .find(
            (product): product is CatalogProduct =>
              product !== undefined &&
              !used.has(product.key) &&
              this.matchesScalp(product, scalp) &&
              this.isAvailable(product),
          ) ?? null
      : null;

    if (fallbackUsed) {
      notes.unshift('Your answers did not match a specialist rule, so a daily hydration routine is suggested.');
    }

    const definition = ruleset.labels.definitions[primaryLabel];
    return {
      rulesetVersion: ruleset.ruleset_version,
      primaryLabel,
      secondaryLabel,
      diagnosis: { displayName: definition.display_en, advice: definition.advice_vi },
      fallbackUsed,
      steps,
      addon,
      notes,
      disclaimer: ruleset.disclaimer.text_en,
    };
  }

  private validateAnswers(
    ruleset: Ruleset,
    answers: Record<string, string | string[] | null>,
  ): void {
    const issues: string[] = [];
    const knownQuestions = new Set<string>();
    for (const step of ruleset.steps) {
      for (const question of step.questions) {
        knownQuestions.add(question.id);
        const value = answers[question.id];
        if (question.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length))) {
          issues.push(question.text_vi);
          continue;
        }
        if (value === undefined || value === null || value === '') continue;
        const optionIds = question.options.map((option) => option.id);
        if (question.type === 'single') {
          if (typeof value !== 'string' || !optionIds.includes(value)) issues.push(question.text_vi);
          continue;
        }
        if (!Array.isArray(value) || value.some((answer) => !optionIds.includes(answer))) {
          issues.push(question.text_vi);
          continue;
        }
        const exclusive = question.options.find((option) => option.exclusive)?.id;
        if (exclusive && value.includes(exclusive) && value.length > 1) issues.push(question.text_vi);
      }
    }
    if (Object.keys(answers).some((key) => !knownQuestions.has(key))) {
      issues.push('Unexpected quiz answer was provided.');
    }
    if (issues.length) throw new Error(`Please review your answers: ${issues.join(', ')}`);
  }

  private matches(condition: RuleCondition, answers: Record<string, string | string[] | null>): boolean {
    if (condition.all) return condition.all.every((item) => this.matches(item, answers));
    if (condition.any) return condition.any.some((item) => this.matches(item, answers));
    if (condition.not) return !this.matches(condition.not, answers);
    if (!condition.q || !condition.op) return false;
    const answer = answers[condition.q];
    if (answer === undefined || answer === null) return false;
    const expected = condition.value;
    if (condition.op === 'eq') return typeof answer === 'string' && answer === expected;
    if (condition.op === 'in') {
      return typeof answer === 'string' && Array.isArray(expected) && expected.includes(answer);
    }
    return Array.isArray(answer) && Array.isArray(expected) && answer.some((item) => expected.includes(item));
  }

  private matchesScalp(product: CatalogProduct | undefined, scalp: string): boolean {
    return Boolean(product && (product.quiz.scalp.includes('all') || product.quiz.scalp.includes(scalp)));
  }

  private isAvailable(product: CatalogProduct | undefined): boolean {
    return Boolean(product && product.active && product.inventory_available > 0);
  }
}

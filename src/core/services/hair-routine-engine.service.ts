import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, shareReplay } from 'rxjs';

interface QuizOption {
  id: string;
  label_vi: string;
  label_en?: string;
  description_vi?: string;
  description_en?: string;
  exclusive?: boolean;
}

interface QuizQuestion {
  id: string;
  type: 'single' | 'multi';
  required: boolean;
  text_vi: string;
  text_en?: string;
  options: QuizOption[];
}

interface QuizStep {
  id: string;
  order: number;
  title_vi: string;
  title_en?: string;
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
    definitions: Record<string, { display_en: string; advice_vi: string; advice_en?: string }>;
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

type ProductCatalogResponse = CatalogProduct[] | ProductCatalog;

const ROUTINE_CATEGORY_IMAGES: Readonly<Record<string, string>> = {
  'Conditioner': '/assets/images/unsplash-photo-1601049541289-9b1b7bbbfe19.jpg',
  'Dry Shampoo': '/assets/images/unsplash-photo-1598440947619-2c35fc9aa908.jpg',
  'Hair Masks': '/assets/images/unsplash-photo-1571781926291-c477ebfd024b.jpg',
  'Shampoo': '/assets/images/unsplash-photo-1535585209827-a15fcdbc4c2d.jpg',
  'Styling & Finishing': '/assets/images/unsplash-photo-1522337360788-8b13dee7a37e.jpg',
  'Treatment / Oil': '/assets/images/unsplash-photo-1608248597359-543329158fa9.jpg',
};

const QUIZ_STEP_GROUPS: ReadonlyArray<{ title: string; stepIds: string[] }> = [
  { title: 'Hair type', stepIds: ['hair_condition'] },
  { title: 'Hair concerns', stepIds: ['scalp', 'habits_history'] },
  { title: 'Your routine goals', stepIds: ['goal'] },
];

const QUESTION_COPY: Readonly<Record<string, string>> = {
  scalp_condition: 'How would you describe your scalp?',
  hair_damage: 'How would you describe your hair’s current condition?',
  hair_texture: 'What is your natural hair texture?',
  hair_thickness: 'How thick are your strands?',
  wash_frequency: 'How often do you wash your hair?',
  chemical_history: 'Has your hair been chemically treated?',
  heat_styling: 'How often do you heat-style your hair?',
  primary_goal: 'What is your primary hair goal?',
};

const OPTION_COPY: Readonly<Record<string, string>> = {
  'scalp_condition.normal': 'Normal and comfortable',
  'scalp_condition.oily': 'Oily quickly',
  'scalp_condition.dry_sensitive': 'Dry, itchy, or sensitive',
  'scalp_condition.flaky': 'Dandruff or flaking',
  'hair_damage.healthy': 'Healthy and smooth',
  'hair_damage.dry_frizzy': 'Dry, coarse, or frizzy',
  'hair_damage.damaged': 'Damaged',
  'hair_texture.straight': 'Straight',
  'hair_texture.wavy': 'Wavy',
  'hair_texture.curly': 'Curly',
  'hair_thickness.fine': 'Fine and limp',
  'hair_thickness.medium': 'Medium',
  'hair_thickness.thick': 'Thick and coarse',
  'wash_frequency.daily': 'Daily',
  'wash_frequency.every_2_3_days': 'Every 2–3 days',
  'wash_frequency.weekly': '1–2 times a week',
  'chemical_history.none': 'No chemical treatments',
  'chemical_history.dyed': 'Color-treated',
  'chemical_history.bleached': 'Bleached or lightened',
  'chemical_history.permed': 'Permed or chemically straightened',
  'heat_styling.never': 'Rarely or never',
  'heat_styling.sometimes': 'Sometimes',
  'heat_styling.often': 'Frequently',
  'primary_goal.repair': 'Repair damage',
  'primary_goal.scalp_care': 'Care for my scalp',
  'primary_goal.color_protect': 'Protect my color',
  'primary_goal.define_curls': 'Define my curls',
  'primary_goal.hydrate': 'Add hydration',
  'primary_goal.volume': 'Add volume',
  'primary_goal.smooth_style': 'Smooth and style',
  'primary_goal.maintain': 'Maintain healthy hair',
};

const ROUTINE_ADVICE: Readonly<Record<string, string>> = {
  Repair: 'Prioritize a restorative mask once or twice a week and reduce heat styling.',
  Scalp: 'Choose gentle cleansing, avoid scratching, and use comfortably warm water.',
  Color: 'Use color-protecting care and limit hot water and UV exposure to help preserve color.',
  Curl: 'Support curls with moisture and curl-specific styling products to maintain definition and reduce frizz.',
  Hydration: 'Add moisture to help hair feel softer, smoother, and easier to style.',
  Volume: 'Choose lightweight formulas that do not weigh down the roots.',
  Styling: 'Use heat protection and frizz control to style while caring for your hair.',
};

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
    catalog: this.http.get<ProductCatalogResponse>('/assets/hair-routine/product_quiz_catalog.json'),
  }).pipe(
    map(({ ruleset, catalog }) => {
      const products = Array.isArray(catalog) ? catalog : catalog.products;
      if (!ruleset.steps.length || !products.length) {
        throw new Error('Hair routine rules or catalog is empty.');
      }
      return {
        ruleset,
        catalog: {
          products: products.map((product) => ({
            ...product,
            image_url: ROUTINE_CATEGORY_IMAGES[product.category] ?? ROUTINE_CATEGORY_IMAGES['Treatment / Oil'],
          })),
        },
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  getConfig() {
    return this.config$.pipe(
      map(({ ruleset }): HairRoutineConfig => {
        const sourceSteps = new Map(ruleset.steps.map((step) => [step.id, step]));
        const steps = QUIZ_STEP_GROUPS.map((group, index) => ({
          id: `step-${index + 1}`,
          order: index + 1,
          title_vi: group.title,
          title_en: group.title,
          questions: group.stepIds
            .flatMap((stepId) => sourceSteps.get(stepId)?.questions ?? [])
            .map((question) => ({
              ...question,
              text_en: QUESTION_COPY[question.id] ?? question.text_vi,
              options: question.options.map((option) => ({
                ...option,
                label_en: OPTION_COPY[`${question.id}.${option.id}`] ?? option.label_vi,
                description_en: undefined,
              })),
            })),
        }));
        return { steps, version: ruleset.ruleset_version };
      }),
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
      diagnosis: {
        displayName: definition.display_en,
        advice: ROUTINE_ADVICE[primaryLabel] ?? 'Use a consistent routine tailored to your hair and scalp needs.',
      },
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

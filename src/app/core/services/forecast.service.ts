import { Injectable, computed, inject } from '@angular/core';
import { MockDbService, nowIso } from '../data/mock-db.service';
import { OrderStatus, availableOf, type ForecastCategory, type Product, type ProductVariant } from '../models';
import { SettingsService } from './settings.service';

export interface ForecastRow {
  product: Product;
  variant: ProductVariant;
  /** SKU share of its category over the last 8 weeks. */
  share: number;
  forecast14d: number;
  available: number;
  incoming: number;
  safetyStock: number;
  /** null for cold-start SKUs: the admin decides the quantity from the category-level forecast. */
  suggested: number | null;
  coldStart: boolean;
  categoryForecast: number;
}

export interface CategoryHealth extends ForecastCategory {
  latestWape: number;
  drift: boolean;
}

const DAY = 86400_000;

/**
 * A03 — category-level demand forecast (from the ML pipeline output in the seed) allocated to SKUs by
 * their 8-week sales share, plus the closed-loop reorder formula:
 *   Reorder = max(0, 14-day forecast + Safety stock − (Available + Incoming))
 */
@Injectable({ providedIn: 'root' })
export class ForecastService {
  private readonly store = inject(MockDbService);
  private readonly settings = inject(SettingsService);

  readonly forecast = computed(() => this.store.db().forecast);

  /** Model drift: WAPE above the threshold for two consecutive weeks raises a "Low confidence" flag. */
  readonly categories = computed<CategoryHealth[]>(() => {
    const threshold = this.settings.settings().wapeThreshold;
    return this.forecast().categories.map((category) => {
      const weeks = category.weeklyWape;
      const lastTwo = weeks.slice(-2);
      return { ...category, latestWape: weeks[weeks.length - 1] ?? 0, drift: lastTwo.length === 2 && lastTwo.every((w) => w > threshold) };
    });
  });

  readonly driftCategories = computed(() => this.categories().filter((c) => c.drift));

  readonly rows = computed<ForecastRow[]>(() => {
    const db = this.store.db();
    const settings = this.settings.settings();
    const now = Date.now();
    const since = now - 56 * DAY;
    const unitsByVariant = new Map<string, number>();
    const unitsByCategory = new Map<string, number>();
    for (const order of db.orders) {
      if (Date.parse(order.createdAt) < since || order.status === OrderStatus.Cancelled) continue;
      for (const item of order.items) {
        unitsByVariant.set(item.variantId, (unitsByVariant.get(item.variantId) ?? 0) + item.quantity);
        unitsByCategory.set(item.category, (unitsByCategory.get(item.category) ?? 0) + item.quantity);
      }
    }
    const categoryForecast = new Map(this.forecast().categories.map((c) => [c.category, c.forecast14d]));
    const rows: ForecastRow[] = [];
    for (const product of db.products) {
      if (product.status !== 'Active') continue;
      const siblings = db.products.filter((p) => p.category === product.category && p.status === 'Active').flatMap((p) => p.variants.filter((v) => v.forSale));
      for (const variant of product.variants.filter((v) => v.forSale)) {
        const categoryUnits = unitsByCategory.get(product.category) ?? 0;
        const share = categoryUnits ? (unitsByVariant.get(variant.id) ?? 0) / categoryUnits : 1 / Math.max(1, siblings.length);
        const catForecast = categoryForecast.get(product.category) ?? 0;
        const forecast14d = Math.round(catForecast * share);
        const coldStart = now - Date.parse(variant.createdAt) < 60 * DAY;
        const available = availableOf(variant);
        rows.push({
          product,
          variant,
          share,
          forecast14d,
          available,
          incoming: variant.incoming,
          safetyStock: settings.safetyStock,
          suggested: coldStart ? null : Math.max(0, Math.ceil(forecast14d + settings.safetyStock - (available + variant.incoming))),
          coldStart,
          categoryForecast: catForecast,
        });
      }
    }
    return rows.sort((a, b) => (b.suggested ?? -1) - (a.suggested ?? -1));
  });

  /**
   * "Retrain Model" queues the offline batch pipeline (data/ml/B_Plan/mapped_59_skus/run_mapped_forecast.py).
   * The browser cannot train models, so this records the request time; metrics refresh when the
   * pipeline output is regenerated into the seed (scripts/build_mock_db.py).
   */
  requestRetrain(): void {
    this.store.mutate((db) => {
      db.forecast.lastTrainedAt = nowIso();
    });
  }
}

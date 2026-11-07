import { Injectable, computed, inject } from '@angular/core';
import { DomainError, MockDbService, newId, nowIso } from '../data/mock-db.service';
import {
  OrderStatus,
  PRODUCT_CATEGORIES,
  SIZE_LABELS,
  productAvailable,
  startingPrice,
  type Product,
  type ProductCategory,
  type ProductStatus,
  type ProductVariant,
} from '../models';

export type ShopSort = 'best-sellers' | 'price-asc' | 'price-desc' | 'newest' | 'name-asc' | 'name-desc';
export type StockFilter = 'all' | 'in' | 'out';

export interface ShopQuery {
  q: string;
  /** Selected categories; empty means every category. */
  category: ProductCategory[];
  /** Selected brands, lower-case; empty means every brand. */
  brand: string[];
  minPrice: number | null;
  maxPrice: number | null;
  stock: StockFilter;
  sort: ShopSort;
}

export interface ProductInput {
  name: string;
  category: ProductCategory;
  description: string;
  keyBenefits: string[];
  ingredients: string;
  howToUse: string;
  images: string[];
  quiz: Product['quiz'];
  allowAutoSubstitute: boolean;
  status: ProductStatus;
  variants: Array<Pick<ProductVariant, 'id' | 'sku' | 'sizeLabel' | 'volume' | 'price' | 'onHand' | 'forSale'>>;
}

const CATEGORY_CODE: Record<ProductCategory, string> = {
  Shampoo: 'SH',
  Conditioner: 'CD',
  'Hair Masks': 'HM',
  'Treatment / Oil': 'TO',
  'Dry Shampoo': 'DS',
  'Styling & Finishing': 'ST',
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

/** Classic Levenshtein edit distance with an early exit once it exceeds `max`. */
export function levenshtein(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly store = inject(MockDbService);

  readonly products = computed(() => this.store.db().products);
  /** BR-PRD: inactive products are never shown on the storefront. */
  readonly activeProducts = computed(() => this.products().filter((p) => p.status === 'Active'));

  readonly productsWithOrders = computed(() => new Set(this.store.db().orders.flatMap((o) => o.items.map((i) => i.productId))));

  readonly categoryCounts = computed(() => {
    const counts = new Map<ProductCategory, number>();
    for (const category of PRODUCT_CATEGORIES) counts.set(category, 0);
    for (const product of this.activeProducts()) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    return counts;
  });

  /** Brands of the curated edit with their active product counts, in catalog order. */
  readonly brandCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const product of this.activeProducts()) counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
    return counts;
  });

  readonly bestSellers = computed(() => this.sortProducts(this.activeProducts(), 'best-sellers'));

  /** The ten products with the most units sold (only products that sold at all qualify). */
  readonly bestSellerIds = computed(() => new Set(this.bestSellers().filter((p) => p.soldTotal > 0).slice(0, 10).map((p) => p.id)));

  /** Products launched within the last 45 days. */
  readonly newArrivalIds = computed(() => {
    const since = Date.now() - 45 * 86400_000;
    return new Set(this.activeProducts().filter((p) => Date.parse(p.createdAt) >= since).map((p) => p.id));
  });

  getById(id: string): Product | undefined {
    return this.products().find((product) => product.id === id);
  }

  query(query: ShopQuery): Product[] {
    let list = query.q.trim() ? this.search(query.q) : this.activeProducts();
    if (query.category.length) list = list.filter((p) => query.category.includes(p.category));
    if (query.brand.length) list = list.filter((p) => query.brand.includes(p.brand.toLowerCase()));
    if (query.minPrice !== null) list = list.filter((p) => startingPrice(p) >= query.minPrice!);
    if (query.maxPrice !== null) list = list.filter((p) => startingPrice(p) <= query.maxPrice!);
    if (query.stock === 'in') list = list.filter((p) => productAvailable(p) > 0);
    if (query.stock === 'out') list = list.filter((p) => productAvailable(p) === 0);
    const ordered = query.q.trim() && query.sort === 'best-sellers' ? list : this.sortProducts(list, query.sort);
    // Sold-out products go last, keeping the chosen order within each group.
    return [...ordered.filter((p) => productAvailable(p) > 0), ...ordered.filter((p) => productAvailable(p) === 0)];
  }

  /**
   * Smart search (C02): case/diacritic-insensitive, fuzzy (Levenshtein ≤ 2) over name, category,
   * key benefits and ingredients. Short tokens use a tighter tolerance so "oil" doesn't match "all".
   * Results are ranked by relevance (name matches first).
   */
  search(rawQuery: string): Product[] {
    const tokens = normalize(rawQuery).split(/\s+/).filter(Boolean);
    if (!tokens.length) return this.activeProducts();
    const tolerance = (token: string) => (token.length >= 6 ? 2 : token.length >= 4 ? 1 : 0);
    const scored: Array<{ product: Product; score: number }> = [];
    for (const product of this.activeProducts()) {
      const fields = [
        { words: normalize(product.name).split(/\s+/), weight: 5 },
        { words: normalize(product.brand).split(/\s+/), weight: 4 },
        { words: normalize(product.category).split(/\s+/), weight: 3 },
        { words: normalize(product.keyBenefits.join(' ')).split(/\s+/), weight: 2 },
        { words: normalize(product.ingredients).split(/\s+/), weight: 1 },
      ];
      let score = 0;
      let allTokensMatched = true;
      for (const token of tokens) {
        let best = 0;
        for (const field of fields) {
          for (const word of field.words) {
            if (!word) continue;
            if (word.includes(token)) best = Math.max(best, field.weight * 2);
            else if (tolerance(token) && levenshtein(token, word, tolerance(token)) <= tolerance(token)) best = Math.max(best, field.weight);
          }
        }
        if (!best) {
          allTokensMatched = false;
          break;
        }
        score += best;
      }
      if (allTokensMatched) scored.push({ product, score });
    }
    return scored.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name)).map((entry) => entry.product);
  }

  sortProducts(list: Product[], sort: ShopSort): Product[] {
    const copy = [...list];
    switch (sort) {
      case 'price-asc':
        return copy.sort((a, b) => startingPrice(a) - startingPrice(b));
      case 'price-desc':
        return copy.sort((a, b) => startingPrice(b) - startingPrice(a));
      case 'name-asc':
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return copy.sort((a, b) => b.name.localeCompare(a.name));
      case 'newest':
        // Same clock as the "New" badge (launch date), so tagged products always lead; edits don't bump a product up.
        return copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      default:
        return copy.sort((a, b) => b.soldTotal - a.soldTotal || b.sourceReviewCount - a.sourceReviewCount);
    }
  }

  // ------------------------------------------------------------- admin (A04–A06)

  create(input: ProductInput): Product {
    this.validate(input, true);
    return this.store.mutate((db) => {
      const now = nowIso();
      const id = newId('prd');
      const key = this.uniqueKey(db.products, input.name);
      const product: Product = {
        id,
        key,
        name: input.name.trim(),
        brand: 'Moroccanoil',
        category: input.category,
        description: input.description.trim(),
        keyBenefits: input.keyBenefits.filter(Boolean),
        ingredients: input.ingredients.trim(),
        howToUse: input.howToUse.trim(),
        images: input.images,
        sourceRating: 0,
        sourceReviewCount: 0,
        soldTotal: 0,
        ratingBase: [0, 0, 0, 0, 0],
        status: input.status,
        quiz: input.quiz,
        allowAutoSubstitute: input.allowAutoSubstitute,
        variants: input.variants.map((variant) => ({
          id: `${id}-${variant.sizeLabel.toLowerCase()}`,
          sku: variant.sku.trim().toUpperCase(),
          sizeLabel: variant.sizeLabel,
          volume: variant.volume.trim() || 'Standard',
          price: Math.round(variant.price * 100) / 100,
          onHand: variant.onHand,
          reserved: 0,
          incoming: 0,
          forSale: variant.forSale,
          createdAt: now,
        })),
        createdAt: now,
        updatedAt: now,
      };
      this.assertUniqueSkus(db.products, product.variants.map((v) => v.sku), id);
      db.products.push(product);
      return product;
    });
  }

  /** Stock quantities are not edited here, they are managed in A07 Inventory. */
  update(id: string, input: ProductInput): void {
    this.validate(input, false);
    this.store.mutate((db) => {
      const product = db.products.find((p) => p.id === id);
      if (!product) throw new DomainError('Product not found.');
      const now = nowIso();
      const variants: ProductVariant[] = input.variants.map((variant) => {
        const existing = product.variants.find((v) => v.sizeLabel === variant.sizeLabel);
        return existing
          ? { ...existing, sku: variant.sku.trim().toUpperCase(), volume: variant.volume.trim() || existing.volume, price: Math.round(variant.price * 100) / 100, forSale: variant.forSale }
          : {
              id: `${id}-${variant.sizeLabel.toLowerCase()}`,
              sku: variant.sku.trim().toUpperCase(),
              sizeLabel: variant.sizeLabel,
              volume: variant.volume.trim() || 'Standard',
              price: Math.round(variant.price * 100) / 100,
              onHand: variant.onHand,
              reserved: 0,
              incoming: 0,
              forSale: variant.forSale,
              createdAt: now,
            };
      });
      const removed = product.variants.filter((v) => !variants.some((n) => n.id === v.id));
      if (removed.some((v) => v.reserved > 0)) throw new DomainError('A size with reserved stock cannot be removed. Mark it as not for sale instead.');
      this.assertUniqueSkus(db.products, variants.map((v) => v.sku), id);
      Object.assign(product, {
        name: input.name.trim(),
        category: input.category,
        description: input.description.trim(),
        keyBenefits: input.keyBenefits.filter(Boolean),
        ingredients: input.ingredients.trim(),
        howToUse: input.howToUse.trim(),
        images: input.images,
        quiz: input.quiz,
        allowAutoSubstitute: input.allowAutoSubstitute,
        status: input.status,
        variants,
        updatedAt: now,
      });
    });
  }

  setStatus(id: string, status: ProductStatus): void {
    this.store.mutate((db) => {
      const product = db.products.find((p) => p.id === id);
      if (!product) throw new DomainError('Product not found.');
      product.status = status;
      product.updatedAt = nowIso();
    });
  }

  /** BR-PRD-05: products that ever appeared in an order can only be deactivated (soft delete). */
  delete(id: string): void {
    if (this.productsWithOrders().has(id)) {
      throw new DomainError('This product has order history and cannot be deleted. Set it to Inactive instead.');
    }
    this.store.mutate((db) => {
      db.products = db.products.filter((p) => p.id !== id);
    });
  }

  suggestSku(category: ProductCategory, sizeLabel: string): string {
    const code = CATEGORY_CODE[category];
    const used = this.products().filter((p) => p.category === category).length + 1;
    return `MO-${code}-${String(used).padStart(2, '0')}-${sizeLabel[0]}`;
  }

  private validate(input: ProductInput, creating: boolean): void {
    if (!input.name.trim()) throw new DomainError('Product name is required.');
    if (!PRODUCT_CATEGORIES.includes(input.category)) throw new DomainError('Please choose a category.');
    if (!input.images.length) throw new DomainError('Please add at least one product image (the first is the main image).');
    if (input.images.length > 6) throw new DomainError('A product can have up to 6 images.');
    if (!input.quiz.scalp.length) throw new DomainError('Hair Quiz tags: choose at least one scalp type.');
    if (!input.quiz.needs.length) throw new DomainError('Hair Quiz tags: choose at least one hair need.');
    if (!input.quiz.step) throw new DomainError('Hair Quiz tags: choose the routine step.');
    if (!input.variants.length) throw new DomainError('Add at least one size variant.');
    for (const variant of input.variants) {
      if (!SIZE_LABELS.includes(variant.sizeLabel)) throw new DomainError('Unknown size.');
      if (!variant.sku.trim()) throw new DomainError(`${variant.sizeLabel}: SKU is required.`);
      if (!(variant.price > 0)) throw new DomainError(`${variant.sizeLabel}: price must be greater than 0.`);
      if (creating && (!Number.isInteger(variant.onHand) || variant.onHand < 0)) {
        throw new DomainError(`${variant.sizeLabel}: stock must be a whole number ≥ 0.`);
      }
    }
  }

  private assertUniqueSkus(products: Product[], skus: string[], ownId: string): void {
    if (new Set(skus).size !== skus.length) throw new DomainError('Each size needs its own SKU.');
    const taken = new Set(products.filter((p) => p.id !== ownId).flatMap((p) => p.variants.map((v) => v.sku)));
    const clash = skus.find((sku) => taken.has(sku));
    if (clash) throw new DomainError(`SKU ${clash} is already used by another product.`);
  }

  private uniqueKey(products: Product[], name: string): string {
    const base = normalize(name).trim().replace(/\s+/g, '-') || 'product';
    let key = base;
    let n = 2;
    while (products.some((p) => p.key === key)) key = `${base}-${n++}`;
    return key;
  }
}

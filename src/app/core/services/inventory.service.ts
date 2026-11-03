import { Injectable, computed, inject } from '@angular/core';
import { DomainError, MockDbService, newId, nowIso } from '../data/mock-db.service';
import { availableOf, type InventoryAdjustmentType, type MockDatabase, type Product, type ProductVariant } from '../models';
import { SettingsService } from './settings.service';

export type StockStatus = 'In stock' | 'Low stock' | 'Out of stock';

export interface InventoryRow {
  product: Product;
  variant: ProductVariant;
  available: number;
  status: StockStatus;
}

interface StockLine {
  variantId: string;
  quantity: number;
}

function findVariant(db: MockDatabase, variantId: string): { product: Product; variant: ProductVariant } {
  for (const product of db.products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  throw new DomainError('This product size no longer exists.');
}

/**
 * Atomic check-and-reserve (BR-INV): every line is validated before any Reserved count changes,
 * so two shoppers can never oversell the same unit.
 */
export function reserveStock(db: MockDatabase, lines: StockLine[]): void {
  const shortages: string[] = [];
  for (const line of lines) {
    const { product, variant } = findVariant(db, line.variantId);
    if (product.status !== 'Active' || !variant.forSale) shortages.push(`${product.name} (${variant.sizeLabel}) is no longer available`);
    else if (availableOf(variant) < line.quantity) shortages.push(`${product.name} (${variant.sizeLabel}) has only ${availableOf(variant)} left`);
  }
  if (shortages.length) throw new DomainError(`Some items cannot be reserved: ${shortages.join('; ')}.`);
  for (const line of lines) findVariant(db, line.variantId).variant.reserved += line.quantity;
}

export function releaseStock(db: MockDatabase, lines: StockLine[]): void {
  for (const line of lines) {
    const { variant } = findVariant(db, line.variantId);
    variant.reserved = Math.max(0, variant.reserved - line.quantity);
  }
}

/** Processing → Shipping: goods leave the warehouse, so On Hand and Reserved drop together. */
export function shipStock(db: MockDatabase, lines: StockLine[]): void {
  for (const line of lines) {
    const { variant } = findVariant(db, line.variantId);
    variant.onHand = Math.max(0, variant.onHand - line.quantity);
    variant.reserved = Math.max(0, variant.reserved - line.quantity);
  }
}

/** Approved return: sealed goods are put back on the shelf. */
export function restockReturned(db: MockDatabase, lines: StockLine[]): void {
  for (const line of lines) {
    try {
      findVariant(db, line.variantId).variant.onHand += line.quantity;
    } catch {
      // the size was removed from the catalog after the sale; nothing to restock
    }
  }
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly store = inject(MockDbService);
  private readonly settings = inject(SettingsService);

  readonly rows = computed<InventoryRow[]>(() => {
    const threshold = this.settings.settings().lowStockThreshold;
    return this.store.db().products.flatMap((product) =>
      product.variants.map((variant) => {
        const available = availableOf(variant);
        const status: StockStatus = available === 0 ? 'Out of stock' : available <= threshold ? 'Low stock' : 'In stock';
        return { product, variant, available, status };
      }),
    );
  });

  readonly lowStock = computed(() =>
    this.rows()
      .filter((row) => row.product.status === 'Active' && row.status !== 'In stock')
      .sort((a, b) => a.available - b.available),
  );
  readonly adjustments = computed(() => [...this.store.db().inventoryAdjustments].reverse());

  /** Manual stock count correction with a mandatory audit reason (BR-PRD-03: On Hand ≥ Reserved). */
  adjust(variantId: string, newOnHand: number, reason: string): void {
    if (!Number.isInteger(newOnHand) || newOnHand < 0) throw new DomainError('On Hand must be a whole number ≥ 0.');
    if (!reason.trim()) throw new DomainError('Please choose a reason for this adjustment.');
    this.store.mutate((db) => {
      const { product, variant } = findVariant(db, variantId);
      if (newOnHand < variant.reserved) throw new DomainError(`On Hand cannot be lower than Reserved (${variant.reserved}).`);
      this.log(db, product, variant, 'ADJUST', reason, () => (variant.onHand = newOnHand));
    });
  }

  /** A07 Receive Stock: the incoming delivery moves to On Hand. */
  receive(variantId: string): void {
    this.store.mutate((db) => {
      const { product, variant } = findVariant(db, variantId);
      if (variant.incoming <= 0) throw new DomainError('There is no incoming stock to receive for this SKU.');
      this.log(db, product, variant, 'RECEIVE', 'Supplier delivery received', () => {
        variant.onHand += variant.incoming;
        variant.incoming = 0;
      });
    });
  }

  /** A03 Order Stock: raises Incoming so the reorder formula stops suggesting the same quantity. */
  orderStock(variantId: string, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new DomainError('Order quantity must be a whole number greater than 0.');
    this.store.mutate((db) => {
      const { product, variant } = findVariant(db, variantId);
      this.log(db, product, variant, 'ORDER_STOCK', `Purchase order for ${quantity} units`, () => (variant.incoming += quantity));
    });
  }

  private log(db: MockDatabase, product: Product, variant: ProductVariant, type: InventoryAdjustmentType, reason: string, apply: () => void): void {
    const before = { onHand: variant.onHand, incoming: variant.incoming };
    apply();
    db.inventoryAdjustments.push({
      id: newId('adj'),
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      type,
      before,
      after: { onHand: variant.onHand, incoming: variant.incoming },
      reason: reason.trim(),
      at: nowIso(),
    });
  }
}

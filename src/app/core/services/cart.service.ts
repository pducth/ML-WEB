import { Injectable, computed, inject, signal } from '@angular/core';
import { readJson, writeJson } from '../data/browser-storage';
import { DomainError, MockDbService } from '../data/mock-db.service';
import { availableOf, roundMoney, type CartLine, type Product, type ProductVariant } from '../models';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';
import { evaluateVoucher, type VoucherEvaluation } from './voucher.service';

const GUEST_CART_KEY = 'haircare-insight:guest-cart';
const VOUCHER_KEY = 'haircare-insight:voucher';

export type CartIssue = 'inactive' | 'out_of_stock' | 'exceeds_stock' | 'missing';

export interface CartLineView {
  line: CartLine;
  product: Product | null;
  variant: ProductVariant | null;
  available: number;
  lineTotal: number;
  issue: CartIssue | null;
}

export const CART_ISSUE_TEXT: Record<CartIssue, string> = {
  inactive: 'No longer sold. Remove it to check out',
  out_of_stock: 'Out of stock. Remove it to check out',
  exceeds_stock: 'Not enough stock. Lower the quantity to check out',
  missing: 'This item is no longer available',
};

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly store = inject(MockDbService);
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly guestLines = signal<CartLine[]>(readJson<CartLine[]>('local', GUEST_CART_KEY, []));

  readonly drawerOpen = signal(false);
  readonly voucherCode = signal<string | null>(readJson<string | null>('session', VOUCHER_KEY, null));

  readonly lines = computed<CartLine[]>(() => {
    const user = this.auth.currentUser();
    if (!user) return this.guestLines();
    return this.store.db().carts.find((cart) => cart.userId === user.id)?.items ?? [];
  });

  readonly view = computed<CartLineView[]>(() => {
    const products = this.store.db().products;
    return this.lines().map((line) => {
      const product = products.find((p) => p.id === line.productId) ?? null;
      const variant = product?.variants.find((v) => v.id === line.variantId) ?? null;
      const available = variant ? availableOf(variant) : 0;
      let issue: CartIssue | null = null;
      if (!product || !variant) issue = 'missing';
      else if (product.status !== 'Active' || !variant.forSale) issue = 'inactive';
      else if (available === 0) issue = 'out_of_stock';
      else if (line.quantity > available) issue = 'exceeds_stock';
      return { line, product, variant, available, issue, lineTotal: variant ? roundMoney(variant.price * line.quantity) : 0 };
    });
  });

  readonly itemCount = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));
  readonly subtotal = computed(() => roundMoney(this.view().reduce((sum, line) => sum + (line.issue === 'missing' ? 0 : line.lineTotal), 0)));
  /** Blocked items stay in the bag with a red warning and lock checkout (never silently removed). */
  readonly hasBlockingIssues = computed(() => this.view().some((line) => line.issue !== null));
  readonly voucher = computed<VoucherEvaluation | null>(() => {
    const code = this.voucherCode();
    return code ? evaluateVoucher(this.store.db(), code, this.subtotal(), this.auth.currentUser()?.id ?? null) : null;
  });
  readonly discount = computed(() => (this.voucher()?.error ? 0 : (this.voucher()?.discount ?? 0)));
  readonly shippingFee = computed(() => (this.lines().length ? this.settings.settings().shippingFee : 0));
  readonly total = computed(() => roundMoney(Math.max(0, this.subtotal() - this.discount() + this.shippingFee())));

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  add(productId: string, variantId: string, quantity = 1): void {
    if (!Number.isInteger(quantity) || quantity < 1) throw new DomainError('Quantity must be at least 1.');
    const product = this.store.db().products.find((p) => p.id === productId);
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant || product.status !== 'Active' || !variant.forSale) throw new DomainError('This product is not available.');
    const available = availableOf(variant);
    if (available === 0) throw new DomainError(`${product.name} (${variant.sizeLabel}) is out of stock.`);
    const existing = this.lines().find((line) => line.variantId === variantId)?.quantity ?? 0;
    if (existing + quantity > available) {
      throw new DomainError(`Only ${available} unit${available > 1 ? 's' : ''} of ${variant.sizeLabel} available${existing ? ` (${existing} already in your bag)` : ''}.`);
    }
    this.write((lines) => {
      const line = lines.find((l) => l.variantId === variantId);
      if (line) line.quantity += quantity;
      else lines.push({ productId, variantId, quantity });
    });
  }

  setQuantity(variantId: string, quantity: number): void {
    if (quantity < 1) {
      this.remove(variantId);
      return;
    }
    const view = this.view().find((line) => line.line.variantId === variantId);
    // Lowering an over-stock line is always allowed; raising it past Available is not.
    if (view && quantity > view.available && quantity > view.line.quantity) {
      throw new DomainError(`Only ${view.available} unit${view.available > 1 ? 's' : ''} available for this size.`);
    }
    this.write((lines) => {
      const line = lines.find((l) => l.variantId === variantId);
      if (line) line.quantity = quantity;
    });
  }

  /** Swaps a line to another size of the same product, keeping its quantity (merged if that size is already in the bag). */
  changeVariant(fromVariantId: string, toVariantId: string): void {
    if (fromVariantId === toVariantId) return;
    const current = this.lines().find((line) => line.variantId === fromVariantId);
    if (!current) return;
    const product = this.store.db().products.find((p) => p.id === current.productId);
    const target = product?.variants.find((v) => v.id === toVariantId);
    if (!product || !target || product.status !== 'Active' || !target.forSale) throw new DomainError('This size is not available.');
    const available = availableOf(target);
    if (available === 0) throw new DomainError(`${product.name} (${target.sizeLabel}) is out of stock.`);
    const merged = (this.lines().find((line) => line.variantId === toVariantId)?.quantity ?? 0) + current.quantity;
    if (merged > available) {
      throw new DomainError(`Only ${available} unit${available > 1 ? 's' : ''} of ${target.sizeLabel} available. Lower the quantity first.`);
    }
    this.write((lines) => {
      const existing = lines.find((l) => l.variantId === toVariantId);
      const line = lines.find((l) => l.variantId === fromVariantId)!;
      if (existing) {
        existing.quantity = merged;
        lines.splice(lines.indexOf(line), 1);
      } else {
        line.variantId = toVariantId;
      }
    });
  }

  remove(variantId: string): void {
    this.write((lines) => lines.splice(0, lines.length, ...lines.filter((l) => l.variantId !== variantId)));
  }

  clear(): void {
    this.write((lines) => lines.splice(0, lines.length));
    this.removeVoucher();
  }

  applyVoucher(code: string): VoucherEvaluation {
    if (!code.trim()) throw new DomainError('Please enter a discount code.');
    const result = evaluateVoucher(this.store.db(), code, this.subtotal(), this.auth.currentUser()?.id ?? null);
    if (result.error) throw new DomainError(result.error);
    this.voucherCode.set(result.voucher!.code);
    writeJson('session', VOUCHER_KEY, result.voucher!.code);
    return result;
  }

  removeVoucher(): void {
    this.voucherCode.set(null);
    writeJson('session', VOUCHER_KEY, null);
  }

  /**
   * BR-ACC-04: the guest (session) bag merges into the account bag after sign-in / sign-up.
   * Quantity = min(guest + account, Available); returns messages for any line that was capped.
   */
  mergeGuestCart(userId: string): string[] {
    const guest = this.guestLines();
    if (!guest.length) return [];
    const notes: string[] = [];
    this.store.mutate((db) => {
      let cart = db.carts.find((c) => c.userId === userId);
      if (!cart) {
        cart = { id: `cart-${userId}`, userId, items: [] };
        db.carts.push(cart);
      }
      for (const line of guest) {
        const product = db.products.find((p) => p.id === line.productId);
        const variant = product?.variants.find((v) => v.id === line.variantId);
        const existing = cart.items.find((item) => item.variantId === line.variantId);
        const wanted = line.quantity + (existing?.quantity ?? 0);
        const available = variant ? availableOf(variant) : 0;
        // Unavailable lines are kept as-is (flagged in the bag) rather than dropped.
        const quantity = available > 0 ? Math.min(wanted, available) : wanted;
        if (available > 0 && quantity < wanted && product && variant) {
          notes.push(`${product.name} (${variant.sizeLabel}) was reduced to ${quantity}. Only ${available} in stock.`);
        }
        if (existing) existing.quantity = quantity;
        else cart.items.push({ ...line, quantity });
      }
    });
    this.guestLines.set([]);
    writeJson('local', GUEST_CART_KEY, null);
    return notes;
  }

  private write(change: (lines: CartLine[]) => void): void {
    const user = this.auth.currentUser();
    if (!user) {
      const lines = structuredClone(this.guestLines());
      change(lines);
      this.guestLines.set(lines);
      writeJson('local', GUEST_CART_KEY, lines);
      return;
    }
    this.store.mutate((db) => {
      let cart = db.carts.find((c) => c.userId === user.id);
      if (!cart) {
        cart = { id: `cart-${user.id}`, userId: user.id, items: [] };
        db.carts.push(cart);
      }
      change(cart.items);
    });
  }
}

import { Injectable, computed, inject } from '@angular/core';
import { readJson, writeJson } from '../data/browser-storage';
import { DomainError, MockDbService, newId, nowIso } from '../data/mock-db.service';
import {
  OrderStatus,
  availableOf,
  roundMoney,
  type MockDatabase,
  type Order,
  type OrderItem,
  type PaymentMethod,
  type ShippingSnapshot,
} from '../models';
import { AuthService } from './auth.service';
import { releaseStock, reserveStock, restockReturned, shipStock } from './inventory.service';
import { SettingsService } from './settings.service';
import { evaluateVoucher } from './voucher.service';

export const CANCEL_REASONS = ['Changed my mind', 'Ordered by mistake', 'Found a better price elsewhere', 'Delivery takes too long', 'Need to change the shipping address', 'Other'];
export const ADMIN_CANCEL_REASONS = ['Customer request', 'Out of stock', 'Suspected fraud', 'Unreachable customer', 'Other'];
export const RETURN_REASONS: Array<{ label: string; storeFault: boolean }> = [
  { label: 'Product does not suit my hair', storeFault: false },
  { label: 'Changed my mind', storeFault: false },
  { label: 'Defective or damaged product', storeFault: true },
  { label: 'Received the wrong item', storeFault: true },
];
export const RETURN_REJECT_REASONS = ['Seals opened', 'Requested after the 7-day window', 'Product shows signs of use', 'Other'];

const IDEMPOTENCY_KEY = 'haircare-insight:placed-orders';

export interface PlaceOrderInput {
  shipping: ShippingSnapshot;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
}

function pushTimeline(order: Order, status: OrderStatus, note = ''): void {
  const at = nowIso();
  order.status = status;
  order.updatedAt = at;
  order.timeline.push({ status, at, note });
}

/** Cancel reasons of a bank transfer the shopper never completed. Those orders were never really placed, so the customer never sees them. */
const ABANDONED_PAYMENT_REASONS = ['Payment not completed', 'Payment window expired'];

/** A bank transfer still waiting for payment, or one that was abandoned or expired: kept for the admin audit trail, hidden from the customer. */
export function isUnplacedOrder(order: Order): boolean {
  return order.status === OrderStatus.PaymentPending || (order.status === OrderStatus.Cancelled && ABANDONED_PAYMENT_REASONS.includes(order.cancelReason ?? ''));
}

function stockLines(order: Order) {
  return order.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity }));
}

/** Gives the voucher redemption back when an order is cancelled (BR-VOU / BR-PAY-03). */
function restoreVoucher(db: MockDatabase, order: Order): void {
  if (!order.voucherCode) return;
  const voucher = db.vouchers.find((v) => v.code === order.voucherCode);
  if (voucher) voucher.usedCount = Math.max(0, voucher.usedCount - 1);
  db.voucherUsages = db.voucherUsages.filter((usage) => usage.orderId !== order.id);
}

function cancelOnDraft(db: MockDatabase, order: Order, reason: string): void {
  releaseStock(db, stockLines(order));
  restoreVoucher(db, order);
  order.cancelReason = reason;
  if (order.paymentStatus === 'Paid') {
    order.paymentStatus = 'Refunded';
    order.refundAmount = order.total;
  }
  pushTimeline(order, OrderStatus.Cancelled, reason);
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly store = inject(MockDbService);
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);

  readonly orders = computed(() => [...this.store.db().orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
  readonly myOrders = computed(() => {
    const user = this.auth.currentUser();
    return user ? this.orders().filter((order) => order.userId === user.id && !isUnplacedOrder(order)) : [];
  });

  getById(id: string): Order | undefined {
    return this.store.db().orders.find((order) => order.id === id);
  }

  /** C15 is only readable by the order owner. */
  getMine(id: string): Order | undefined {
    const order = this.getById(id);
    return order && order.userId === this.auth.currentUser()?.id ? order : undefined;
  }

  /** An order the customer may open from their account: placed orders only, never a pending or abandoned transfer. */
  getPlacedMine(id: string): Order | undefined {
    const order = this.getMine(id);
    return order && !isUnplacedOrder(order) ? order : undefined;
  }

  /**
   * C07 → C08/C09. Runs as one atomic mutation: re-validates the bag and voucher, reserves stock,
   * snapshots prices/sizes/voucher, creates the order and empties the bag. The idempotency key makes
   * a repeated "Place Order" return the order that was already created.
   */
  placeOrder(input: PlaceOrderInput, voucherCode: string | null): Order {
    const user = this.auth.currentUser();
    if (!user) throw new DomainError('Please sign in to place your order.');
    const placed = readJson<Record<string, string>>('session', IDEMPOTENCY_KEY, {});
    const previous = placed[input.idempotencyKey] ? this.getById(placed[input.idempotencyKey]) : undefined;
    if (previous) return previous;
    const shipping = input.shipping;
    if (!shipping.recipientName.trim() || !shipping.phone.trim() || !shipping.addressLine.trim()) {
      throw new DomainError('Please complete the recipient name, phone number and delivery address.');
    }
    const settings = this.settings.settings();

    const order = this.store.mutate((db) => {
      const cart = db.carts.find((c) => c.userId === user.id);
      if (!cart || !cart.items.length) throw new DomainError('Your bag is empty.');
      const items: OrderItem[] = cart.items.map((line) => {
        const product = db.products.find((p) => p.id === line.productId);
        const variant = product?.variants.find((v) => v.id === line.variantId);
        if (!product || !variant || product.status !== 'Active' || !variant.forSale) {
          throw new DomainError('Some items in your bag are no longer sold. Please review your bag.');
        }
        if (availableOf(variant) < line.quantity) {
          throw new DomainError(`${product.name} (${variant.sizeLabel}) has only ${availableOf(variant)} left. Please update your bag.`);
        }
        return {
          productId: product.id,
          variantId: variant.id,
          sku: variant.sku,
          productName: product.name,
          category: product.category,
          sizeLabel: variant.sizeLabel,
          volume: variant.volume,
          imageUrl: variant.image ?? product.images[0] ?? '',
          unitPrice: variant.price,
          quantity: line.quantity,
          lineTotal: roundMoney(variant.price * line.quantity),
        };
      });
      const subtotal = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
      let discount = 0;
      let appliedCode: string | null = null;
      if (voucherCode) {
        const evaluation = evaluateVoucher(db, voucherCode, subtotal, user.id);
        if (evaluation.error) throw new DomainError(`${voucherCode}: ${evaluation.error}`);
        discount = evaluation.discount;
        appliedCode = evaluation.voucher!.code;
      }
      reserveStock(db, items);
      for (const item of items) {
        const product = db.products.find((p) => p.id === item.productId);
        if (product) product.soldTotal += item.quantity;
      }

      const now = new Date();
      const day = now.toISOString().slice(0, 10).replace(/-/g, '');
      const sequence = db.orders.filter((o) => o.code.startsWith(`HCI-${day}-`)).length + 1;
      const isBank = input.paymentMethod === 'BANK_TRANSFER';
      let paymentRef: string | null = null;
      if (isBank) {
        do paymentRef = `PAY-HCI-${Math.floor(10000 + Math.random() * 90000)}`;
        while (db.orders.some((o) => o.paymentRef === paymentRef));
      }
      const status = isBank ? OrderStatus.PaymentPending : OrderStatus.Processing;
      const created: Order = {
        id: newId('ord'),
        code: `HCI-${day}-${String(sequence).padStart(4, '0')}`,
        userId: user.id,
        customerName: user.fullName,
        customerPhone: user.phone,
        status,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'Unpaid',
        paymentRef,
        paymentDeadline: isBank ? new Date(now.getTime() + settings.paymentTimeoutMinutes * 60000).toISOString() : null,
        shipping: { ...shipping, recipientName: shipping.recipientName.trim(), phone: shipping.phone.trim(), addressLine: shipping.addressLine.trim(), note: shipping.note.trim() },
        items,
        subtotal,
        discount,
        voucherCode: appliedCode,
        shippingFee: settings.shippingFee,
        total: roundMoney(subtotal - discount + settings.shippingFee),
        timeline: [{ status, at: now.toISOString(), note: 'Order placed' }],
        cancelReason: null,
        returnRequest: null,
        refundAmount: 0,
        completedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      db.orders.push(created);
      if (appliedCode) {
        const voucher = db.vouchers.find((v) => v.code === appliedCode)!;
        voucher.usedCount += 1;
        db.voucherUsages.push({ id: newId('vu'), voucherId: voucher.id, userId: user.id, orderId: created.id, at: created.createdAt });
      }
      // A bank transfer keeps the bag until the money arrives, so leaving the payment page loses nothing.
      if (!isBank) cart.items = [];
      return created;
    });

    writeJson('session', IDEMPOTENCY_KEY, { ...placed, [input.idempotencyKey]: order.id });
    return order;
  }

  /**
   * Payment webhook / sandbox simulation (BR-PAY-04). Idempotent: a second confirmation of an already
   * paid order is a no-op. Reference, amount and deadline must all match.
   */
  confirmPayment(paymentRef: string, amount: number): Order {
    return this.store.mutate((db) => {
      const order = db.orders.find((o) => o.paymentRef === paymentRef);
      if (!order) throw new DomainError('Unknown payment reference.');
      if (order.paymentStatus === 'Paid') return order;
      if (order.status !== OrderStatus.PaymentPending) throw new DomainError('This order is no longer awaiting payment.');
      if (Math.abs(order.total - amount) > 0.001) throw new DomainError('The transferred amount does not match the order total.');
      if (order.paymentDeadline && Date.parse(order.paymentDeadline) < Date.now()) throw new DomainError('The payment window has expired.');
      order.paymentStatus = 'Paid';
      pushTimeline(order, OrderStatus.Processing, `Payment ${paymentRef} received`);
      // The order is placed now: take its items out of the owner's bag.
      const bag = db.carts.find((c) => c.userId === order.userId);
      if (bag) {
        for (const item of order.items) {
          const line = bag.items.find((l) => l.variantId === item.variantId);
          if (line) line.quantity -= item.quantity;
        }
        bag.items = bag.items.filter((l) => l.quantity > 0);
      }
      return order;
    });
  }

  /** Scheduled job (BR-PAY-03): unpaid bank transfers past their deadline are cancelled and stock is released. */
  expireOverduePayments(): number {
    const now = Date.now();
    const overdue = this.store.db().orders.filter((o) => o.status === OrderStatus.PaymentPending && o.paymentDeadline && Date.parse(o.paymentDeadline) < now);
    if (!overdue.length) return 0;
    this.store.mutate((db) => {
      for (const stale of overdue) {
        const order = db.orders.find((o) => o.id === stale.id)!;
        if (order.status === OrderStatus.PaymentPending) cancelOnDraft(db, order, 'Payment window expired');
      }
    });
    return overdue.length;
  }

  /** The shopper left the payment page: the transfer is dropped, stock and the discount code are released, the bag stays as it was. */
  abandonPayment(orderId: string): void {
    const order = this.getById(orderId);
    if (!order || order.status !== OrderStatus.PaymentPending) return;
    this.store.mutate((db) => {
      const target = db.orders.find((o) => o.id === orderId);
      if (target && target.status === OrderStatus.PaymentPending) cancelOnDraft(db, target, 'Payment not completed');
    });
  }

  canCancel(order: Order): boolean {
    return order.status === OrderStatus.PaymentPending || order.status === OrderStatus.Processing;
  }

  cancel(orderId: string, reason: string): void {
    if (!reason.trim()) throw new DomainError('Please choose a reason for cancelling.');
    this.store.mutate((db) => {
      const order = db.orders.find((o) => o.id === orderId);
      if (!order) throw new DomainError('Order not found.');
      if (!this.canCancel(order)) throw new DomainError('Orders that are shipping or completed can no longer be cancelled.');
      cancelOnDraft(db, order, reason.trim());
    });
  }

  returnDeadline(order: Order): number | null {
    return order.completedAt ? Date.parse(order.completedAt) + this.settings.settings().returnWindowDays * 86400_000 : null;
  }

  canRequestReturn(order: Order): boolean {
    const deadline = this.returnDeadline(order);
    return order.status === OrderStatus.Completed && !order.returnRequest?.requestedAt && deadline !== null && Date.now() <= deadline;
  }

  /** C15 full-order return within the window; sealed goods required unless the store was at fault. */
  requestReturn(orderId: string, reason: string, sealIntact: boolean): void {
    const option = RETURN_REASONS.find((r) => r.label === reason);
    if (!option) throw new DomainError('Please choose a reason for the return.');
    if (!option.storeFault && !sealIntact) throw new DomainError('Please confirm the products are unopened with their original seal.');
    this.store.mutate((db) => {
      const order = db.orders.find((o) => o.id === orderId);
      if (!order) throw new DomainError('Order not found.');
      if (!this.canRequestReturn(order)) throw new DomainError('This order is not eligible for a return.');
      order.returnRequest = { reason, sealIntact, storeFault: option.storeFault, requestedAt: nowIso(), rejectReason: null };
      pushTimeline(order, OrderStatus.ReturnPending, reason);
    });
  }

  // ------------------------------------------------------------- admin fulfilment (A09)

  markShipping(orderId: string): void {
    this.store.mutate((db) => {
      const order = db.orders.find((o) => o.id === orderId);
      if (!order || order.status !== OrderStatus.Processing) throw new DomainError('Only Processing orders can be shipped.');
      shipStock(db, stockLines(order));
      pushTimeline(order, OrderStatus.Shipping, 'Handed to carrier');
    });
  }

  markCompleted(orderId: string): void {
    this.store.mutate((db) => {
      const order = db.orders.find((o) => o.id === orderId);
      if (!order || order.status !== OrderStatus.Shipping) throw new DomainError('Only Shipping orders can be completed.');
      if (order.paymentMethod === 'COD') order.paymentStatus = 'Paid';
      order.completedAt = nowIso();
      pushTimeline(order, OrderStatus.Completed, 'Delivered');
    });
  }

  /** Refund = total − shipping, or the full total when the store was at fault (BR-RET-02). */
  refundFor(order: Order, storeFault: boolean): number {
    return roundMoney(storeFault ? order.total : order.total - order.shippingFee);
  }

  approveReturn(orderId: string, storeFault: boolean): void {
    this.store.mutate((db) => {
      const order = db.orders.find((o) => o.id === orderId);
      if (!order || order.status !== OrderStatus.ReturnPending || !order.returnRequest) throw new DomainError('There is no pending return for this order.');
      order.returnRequest.storeFault = storeFault;
      order.paymentStatus = 'Refunded';
      order.refundAmount = this.refundFor(order, storeFault);
      restockReturned(db, stockLines(order));
      pushTimeline(order, OrderStatus.Returned, `Refunded $${order.refundAmount.toFixed(2)}`);
    });
  }

  rejectReturn(orderId: string, reason: string): void {
    if (!reason.trim()) throw new DomainError('Please give a reason for rejecting the return.');
    this.store.mutate((db) => {
      const order = db.orders.find((o) => o.id === orderId);
      if (!order || order.status !== OrderStatus.ReturnPending || !order.returnRequest) throw new DomainError('There is no pending return for this order.');
      order.returnRequest.rejectReason = reason.trim();
      pushTimeline(order, OrderStatus.Completed, `Return rejected: ${reason.trim()}`);
    });
  }
}

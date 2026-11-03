import { Injectable, computed, inject } from '@angular/core';
import { DomainError, MockDbService, newId } from '../data/mock-db.service';
import { roundMoney, type MockDatabase, type Voucher } from '../models';

export type VoucherState = 'Active' | 'Scheduled' | 'Expired' | 'Out of Quota' | 'Inactive';

export interface VoucherEvaluation {
  voucher: Voucher | null;
  discount: number;
  error: string | null;
}

export type VoucherInput = Omit<Voucher, 'id' | 'usedCount'>;

export function voucherState(voucher: Voucher, now = Date.now()): VoucherState {
  if (!voucher.active) return 'Inactive';
  if (Date.parse(voucher.endsAt) < now) return 'Expired';
  if (Date.parse(voucher.startsAt) > now) return 'Scheduled';
  if (voucher.usedCount >= voucher.totalQuota) return 'Out of Quota';
  return 'Active';
}

/** BR-VOU: one code per order, discount capped by maxDiscount and never above the subtotal. */
export function evaluateVoucher(db: MockDatabase, code: string, subtotal: number, userId: string | null): VoucherEvaluation {
  const voucher = db.vouchers.find((v) => v.code.toUpperCase() === code.trim().toUpperCase()) ?? null;
  if (!voucher) return { voucher: null, discount: 0, error: 'This discount code does not exist.' };
  const state = voucherState(voucher);
  if (state === 'Inactive') return { voucher, discount: 0, error: 'This discount code is not available.' };
  if (state === 'Expired') return { voucher, discount: 0, error: 'This discount code has expired.' };
  if (state === 'Scheduled') return { voucher, discount: 0, error: 'This discount code is not active yet.' };
  if (state === 'Out of Quota') return { voucher, discount: 0, error: 'This discount code has been fully redeemed.' };
  if (userId) {
    const used = db.voucherUsages.filter((u) => u.voucherId === voucher.id && u.userId === userId).length;
    if (used >= voucher.perUserLimit) return { voucher, discount: 0, error: 'You have already used this discount code.' };
  }
  if (subtotal < voucher.minOrder) {
    return { voucher, discount: 0, error: `Add $${(voucher.minOrder - subtotal).toFixed(2)} more to use ${voucher.code} (minimum $${voucher.minOrder.toFixed(2)}).` };
  }
  let discount = voucher.type === 'percent' ? (subtotal * voucher.value) / 100 : voucher.value;
  if (voucher.maxDiscount !== null) discount = Math.min(discount, voucher.maxDiscount);
  return { voucher, discount: roundMoney(Math.min(discount, subtotal)), error: null };
}

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private readonly store = inject(MockDbService);

  readonly vouchers = computed(() => this.store.db().vouchers);

  evaluate(code: string, subtotal: number, userId: string | null): VoucherEvaluation {
    return evaluateVoucher(this.store.db(), code, subtotal, userId);
  }

  getById(id: string): Voucher | undefined {
    return this.vouchers().find((v) => v.id === id);
  }

  save(input: VoucherInput, id?: string): void {
    const code = input.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) throw new DomainError('Code must be 3–20 letters, numbers, - or _.');
    if (!(input.value > 0)) throw new DomainError('Discount value must be greater than 0.');
    if (input.type === 'percent' && input.value > 100) throw new DomainError('A percentage discount cannot exceed 100%.');
    if (input.minOrder < 0) throw new DomainError('Minimum order cannot be negative.');
    if (input.maxDiscount !== null && input.maxDiscount <= 0) throw new DomainError('Maximum discount must be greater than 0.');
    if (!Number.isInteger(input.totalQuota) || input.totalQuota < 1) throw new DomainError('Total usage limit must be at least 1.');
    if (!Number.isInteger(input.perUserLimit) || input.perUserLimit < 1) throw new DomainError('Per-account limit must be at least 1.');
    if (!input.startsAt || !input.endsAt || Date.parse(input.endsAt) <= Date.parse(input.startsAt)) {
      throw new DomainError('End date must be after the start date.');
    }
    this.store.mutate((db) => {
      if (db.vouchers.some((v) => v.code === code && v.id !== id)) throw new DomainError(`Code ${code} already exists.`);
      if (id) {
        const voucher = db.vouchers.find((v) => v.id === id);
        if (!voucher) throw new DomainError('Voucher not found.');
        if (input.totalQuota < voucher.usedCount) throw new DomainError(`Usage limit cannot be lower than the ${voucher.usedCount} codes already used.`);
        Object.assign(voucher, { ...input, code });
      } else {
        db.vouchers.push({ ...input, code, id: newId('vch'), usedCount: 0 });
      }
    });
  }

  toggle(id: string): void {
    this.store.mutate((db) => {
      const voucher = db.vouchers.find((v) => v.id === id);
      if (voucher) voucher.active = !voucher.active;
    });
  }
}

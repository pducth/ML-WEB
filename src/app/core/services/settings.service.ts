import { Injectable, computed, inject } from '@angular/core';
import { DomainError, MockDbService } from '../data/mock-db.service';
import type { StoreSettings } from '../models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly store = inject(MockDbService);

  readonly settings = computed(() => this.store.db().settings);

  update(changes: StoreSettings): void {
    const numeric: Array<keyof StoreSettings> = [
      'shippingFee',
      'paymentTimeoutMinutes',
      'lowStockThreshold',
      'safetyStock',
      'leadTimeDays',
      'reviewPeriodDays',
      'wapeThreshold',
      'returnWindowDays',
    ];
    for (const key of numeric) {
      const value = changes[key] as number;
      if (!Number.isFinite(value) || value < 0) throw new DomainError(`${key} must be a number ≥ 0.`);
    }
    if (changes.paymentTimeoutMinutes < 1) throw new DomainError('Payment deadline must be at least 1 minute.');
    if (!changes.storeName.trim()) throw new DomainError('Store name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.supportEmail)) throw new DomainError('Support email is invalid.');
    this.store.mutate((db) => {
      db.settings = { ...changes, shippingFee: Math.round(changes.shippingFee * 100) / 100 };
    });
  }
}

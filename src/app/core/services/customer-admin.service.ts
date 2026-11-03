import { Injectable, computed, inject } from '@angular/core';
import { DomainError, MockDbService, nowIso } from '../data/mock-db.service';
import { OrderStatus, roundMoney, type User } from '../models';

export const LOCK_REASONS = ['Policy violation', 'Suspected fraud', 'Customer request', 'Other'];
export const UNLOCK_REASONS = ['Issue resolved', 'Customer request', 'Locked by mistake', 'Other'];

export interface CustomerRow {
  user: User;
  completedOrders: number;
  orderCount: number;
  netSpend: number;
}

@Injectable({ providedIn: 'root' })
export class CustomerAdminService {
  private readonly store = inject(MockDbService);

  readonly rows = computed<CustomerRow[]>(() => {
    const orders = this.store.db().orders;
    return this.store
      .db()
      .users.map((user) => {
        const own = orders.filter((o) => o.userId === user.id);
        const completed = own.filter((o) => o.status === OrderStatus.Completed || o.status === OrderStatus.ReturnPending);
        return {
          user,
          orderCount: own.length,
          completedOrders: completed.length,
          // Net spend excludes shipping, returns and cancellations (same basis as Net Revenue).
          netSpend: roundMoney(completed.reduce((sum, o) => sum + o.subtotal - o.discount, 0)),
        };
      })
      .sort((a, b) => Date.parse(b.user.createdAt) - Date.parse(a.user.createdAt));
  });

  detail(userId: string) {
    const db = this.store.db();
    const row = this.rows().find((r) => r.user.id === userId);
    if (!row) return null;
    return {
      ...row,
      orders: db.orders.filter((o) => o.userId === userId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      addresses: db.addresses.filter((a) => a.userId === userId),
      hairProfile: db.hairProfiles.find((p) => p.userId === userId) ?? null,
    };
  }

  /** Locking revokes every active session immediately because AuthService ignores Locked users. */
  setLocked(userId: string, locked: boolean, reason: string): void {
    if (!reason.trim()) throw new DomainError('Please choose a reason.');
    this.store.mutate((db) => {
      const user = db.users.find((u) => u.id === userId);
      if (!user) throw new DomainError('Customer not found.');
      user.status = locked ? 'Locked' : 'Active';
      user.lockReason = locked ? reason : null;
      user.updatedAt = nowIso();
    });
  }
}

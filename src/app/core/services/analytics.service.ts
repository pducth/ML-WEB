import { Injectable, inject } from '@angular/core';
import { MockDbService } from '../data/mock-db.service';
import { HAIR_LABELS, OrderStatus, PRODUCT_CATEGORIES, roundMoney, type Order, type ProductCategory } from '../models';

export type DashboardPeriod = 'today' | '7d' | '30d' | 'quarter' | 'year';

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  quarter: 'This quarter',
  year: 'This year',
};

export interface Kpi {
  value: number;
  previous: number;
  change: number | null;
}

export interface DashboardStats {
  netRevenue: Kpi;
  completedOrders: Kpi;
  aov: Kpi;
  newCustomers: Kpi;
  revenueSeries: Array<{ label: string; value: number }>;
  categoryShare: Array<{ category: ProductCategory; value: number; share: number }>;
  processingCount: number;
  returnPendingCount: number;
  quiz: { total: number; addedToCart: number; conversion: number; distribution: Array<{ label: string; count: number; share: number }> };
}

const DAY = 86400_000;

function periodStart(period: DashboardPeriod, now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  switch (period) {
    case 'today':
      return start;
    case '7d':
      return new Date(start.getTime() - 6 * DAY);
    case '30d':
      return new Date(start.getTime() - 29 * DAY);
    case 'quarter':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
  }
}

/** Revenue recognised when an order is delivered; Returned orders and shipping fees are excluded (A02). */
function recognised(order: Order): boolean {
  return (order.status === OrderStatus.Completed || order.status === OrderStatus.ReturnPending) && order.completedAt !== null;
}

function netOf(order: Order): number {
  return order.subtotal - order.discount;
}

function change(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly store = inject(MockDbService);

  dashboard(period: DashboardPeriod): DashboardStats {
    const db = this.store.db();
    const now = new Date();
    const start = periodStart(period, now);
    const length = now.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - Math.max(length, DAY));
    const inRange = (iso: string | null, from: Date, to: Date) => iso !== null && Date.parse(iso) >= from.getTime() && Date.parse(iso) < to.getTime();

    const current = db.orders.filter((o) => recognised(o) && inRange(o.completedAt, start, now));
    const previous = db.orders.filter((o) => recognised(o) && inRange(o.completedAt, prevStart, start));
    const revenue = roundMoney(current.reduce((s, o) => s + netOf(o), 0));
    const prevRevenue = roundMoney(previous.reduce((s, o) => s + netOf(o), 0));
    const aov = current.length ? revenue / current.length : 0;
    const prevAov = previous.length ? prevRevenue / previous.length : 0;
    const newCustomers = db.users.filter((u) => inRange(u.createdAt, start, now)).length;
    const prevCustomers = db.users.filter((u) => inRange(u.createdAt, prevStart, start)).length;

    const buckets = this.buckets(period, start, now);
    const revenueSeries = buckets.map((bucket) => ({
      label: bucket.label,
      value: roundMoney(current.filter((o) => inRange(o.completedAt, bucket.from, bucket.to)).reduce((s, o) => s + netOf(o), 0)),
    }));

    // Gross sales mix by category for orders placed in the period (cancelled orders excluded).
    const gross = new Map<ProductCategory, number>(PRODUCT_CATEGORIES.map((c) => [c, 0]));
    for (const order of db.orders) {
      if (order.status === OrderStatus.Cancelled || !inRange(order.createdAt, start, now)) continue;
      for (const item of order.items) gross.set(item.category, (gross.get(item.category) ?? 0) + item.lineTotal);
    }
    const grossTotal = [...gross.values()].reduce((s, v) => s + v, 0);

    const events = db.quizEvents.filter((e) => inRange(e.at, start, now));
    const added = events.filter((e) => e.addedRoutineToCart).length;

    return {
      netRevenue: { value: revenue, previous: prevRevenue, change: change(revenue, prevRevenue) },
      completedOrders: { value: current.length, previous: previous.length, change: change(current.length, previous.length) },
      aov: { value: roundMoney(aov), previous: roundMoney(prevAov), change: change(aov, prevAov) },
      newCustomers: { value: newCustomers, previous: prevCustomers, change: change(newCustomers, prevCustomers) },
      revenueSeries,
      categoryShare: [...gross.entries()].map(([category, value]) => ({ category, value: roundMoney(value), share: grossTotal ? (value / grossTotal) * 100 : 0 })),
      processingCount: db.orders.filter((o) => o.status === OrderStatus.Processing).length,
      returnPendingCount: db.orders.filter((o) => o.status === OrderStatus.ReturnPending).length,
      quiz: {
        total: events.length,
        addedToCart: added,
        conversion: events.length ? (added / events.length) * 100 : 0,
        distribution: HAIR_LABELS.map((label) => {
          const count = events.filter((e) => e.primaryLabel === label).length;
          return { label, count, share: events.length ? (count / events.length) * 100 : 0 };
        }).sort((a, b) => b.count - a.count),
      },
    };
  }

  private buckets(period: DashboardPeriod, start: Date, now: Date): Array<{ label: string; from: Date; to: Date }> {
    const result: Array<{ label: string; from: Date; to: Date }> = [];
    if (period === 'today') {
      for (let h = 0; h < 24; h += 4) {
        const from = new Date(start.getTime() + h * 3600_000);
        result.push({ label: `${String(h).padStart(2, '0')}:00`, from, to: new Date(from.getTime() + 4 * 3600_000) });
      }
    } else if (period === 'year') {
      for (let m = 0; m <= now.getMonth(); m++) {
        const from = new Date(now.getFullYear(), m, 1);
        result.push({ label: from.toLocaleString('en-US', { month: 'short' }), from, to: new Date(now.getFullYear(), m + 1, 1) });
      }
    } else {
      const step = period === 'quarter' ? 7 * DAY : DAY;
      for (let t = start.getTime(); t < now.getTime(); t += step) {
        const from = new Date(t);
        result.push({ label: from.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }), from, to: new Date(t + step) });
      }
    }
    return result;
  }
}

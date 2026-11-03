import { OrderStatus } from '../../../core/models';
import type { StockStatus } from '../../../core/services/inventory.service';
import type { VoucherState } from '../../../core/services/voucher.service';

/** Badge colour classes (.b + w/g/r/x) — the `ST` map from ui-reference/admin/Admin.html. */
export const ORDER_BADGE: Record<OrderStatus, string> = {
  [OrderStatus.PaymentPending]: 'b w',
  [OrderStatus.Processing]: 'b',
  [OrderStatus.Shipping]: 'b',
  [OrderStatus.Completed]: 'b g',
  [OrderStatus.Cancelled]: 'b x',
  [OrderStatus.ReturnPending]: 'b w',
  [OrderStatus.Returned]: 'b r',
};

export const STOCK_BADGE: Record<StockStatus, string> = {
  'In stock': 'b g',
  'Low stock': 'b w',
  'Out of stock': 'b r',
};

export const VOUCHER_BADGE: Record<VoucherState, string> = {
  Active: 'b g',
  Scheduled: 'b',
  Expired: 'b x',
  'Out of Quota': 'b w',
  Inactive: 'b x',
};

export const PAYMENT_BADGE: Record<string, string> = { Unpaid: 'b w', Paid: 'b g', Refunded: 'b r' };

export type VoucherDiscountType = 'percentage' | 'fixed';

export interface Voucher {
  id: string;
  code: string;
  description: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscount?: number;
  usageLimit: number;
  usedCount: number;
  startsAt: string;
  expiresAt: string;
  active: boolean;
}

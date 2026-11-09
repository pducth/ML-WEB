/**
 * Domain models for HairCare Insight, aligned with docs/HairCare_proposal.md
 * (30 core screens C01–C16 / A01–A14 and the BR-* business rules).
 */

export const PRODUCT_CATEGORIES = [
  'Shampoo',
  'Conditioner',
  'Hair Masks',
  'Treatment / Oil',
  'Dry Shampoo',
  'Styling & Finishing',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** The four houses carried by the store; the code is the SKU prefix (BR-PRD-02). */
export const PRODUCT_BRANDS = ['Moroccanoil', 'Davines', 'Rahua', 'AROMATICA'] as const;
export type ProductBrand = (typeof PRODUCT_BRANDS)[number];
export const BRAND_SKU_CODE: Record<ProductBrand, string> = { Moroccanoil: 'MO', Davines: 'DV', Rahua: 'RA', AROMATICA: 'AR' };

export const SIZE_LABELS = ['Travel', 'Full', 'Half-Liter', 'Liter'] as const;
export type SizeLabel = (typeof SIZE_LABELS)[number];

export type ProductStatus = 'Active' | 'Inactive';
export type RoutineStep = 'cleanse' | 'condition' | 'treat' | 'style_protect';
export const HAIR_LABELS = ['Repair', 'Scalp', 'Color', 'Curl', 'Hydration', 'Volume', 'Styling'] as const;
export type HairLabel = (typeof HAIR_LABELS)[number];
export const SCALP_TYPES = ['normal', 'oily', 'dry_sensitive', 'flaky'] as const;

export interface ProductVariant {
  id: string;
  sku: string;
  sizeLabel: SizeLabel;
  volume: string;
  price: number;
  onHand: number;
  reserved: number;
  incoming: number;
  forSale: boolean;
  createdAt: string;
  /** Packshot of this size, when the brand shows a different bottle per size. */
  image?: string;
}

export interface ProductQuizTags {
  scalp: string[];
  needs: string[];
  step: RoutineStep;
  /** Formula styles the product answers (botanical / salon / eco); only reorders quiz results. */
  formula?: string[];
}

/** Card hover preview: a muted texture clip of the formula, or a texture / before-after still when there is no clip. */
export interface ProductHoverMedia {
  type: 'video' | 'image';
  src: string;
  label: string;
}

export interface Product {
  id: string;
  key: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  keyBenefits: string[];
  ingredients: string;
  howToUse: string;
  images: string[];
  hover?: ProductHoverMedia | null;
  sourceRating: number;
  sourceReviewCount: number;
  /** Lifetime units sold, shown as "1.2K sold". */
  soldTotal: number;
  /** Star ratings left without a written review: counts of 5, 4, 3, 2 and 1 stars. Written reviews add to these. */
  ratingBase: number[];
  status: ProductStatus;
  quiz: ProductQuizTags;
  allowAutoSubstitute: boolean;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export type AccountStatus = 'Active' | 'Locked';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'Customer';
  status: AccountStatus;
  lockReason: string | null;
  failedAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Omit<User, 'password' | 'failedAttempts' | 'lockedUntil'>;

export interface AdminAccount {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: 'Admin';
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

export interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartLine[];
}

export enum OrderStatus {
  PaymentPending = 'Payment Pending',
  Processing = 'Processing',
  Shipping = 'Shipping',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  ReturnPending = 'Return Pending',
  Returned = 'Returned',
}
export const ORDER_STATUSES: OrderStatus[] = Object.values(OrderStatus);

export type PaymentMethod = 'COD' | 'BANK_TRANSFER';
export type PaymentStatus = 'Unpaid' | 'Paid' | 'Refunded';

export interface OrderItem {
  productId: string;
  variantId: string;
  sku: string;
  productName: string;
  category: ProductCategory;
  sizeLabel: SizeLabel;
  volume: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ShippingSnapshot {
  recipientName: string;
  phone: string;
  addressLine: string;
  note: string;
}

export interface TimelineEntry {
  status: OrderStatus;
  at: string;
  note: string;
}

export interface ReturnRequest {
  reason: string;
  sealIntact: boolean;
  storeFault: boolean;
  requestedAt: string;
  rejectReason: string | null;
}

export interface Order {
  id: string;
  code: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentRef: string | null;
  paymentDeadline: string | null;
  shipping: ShippingSnapshot;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  voucherCode: string | null;
  shippingFee: number;
  total: number;
  timeline: TimelineEntry[];
  cancelReason: string | null;
  returnRequest: ReturnRequest | null;
  refundAmount: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ReviewStatus = 'Visible' | 'Hidden';

/** A photo or clip a shopper attached to a review. Clips carry a poster image. */
export interface ReviewMedia {
  type: 'image' | 'video';
  src: string;
  poster?: string;
}

export interface Review {
  id: string;
  productId: string;
  orderId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  media: ReviewMedia[];
  status: ReviewStatus;
  hiddenReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VoucherType = 'percent' | 'fixed';

export interface Voucher {
  id: string;
  code: string;
  description: string;
  type: VoucherType;
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  startsAt: string;
  endsAt: string;
  totalQuota: number;
  usedCount: number;
  perUserLimit: number;
  active: boolean;
}

export interface VoucherUsage {
  id: string;
  voucherId: string;
  userId: string;
  orderId: string;
  at: string;
}

export interface QuizEvent {
  id: string;
  at: string;
  primaryLabel: string;
  secondaryLabel: string | null;
  rulesetVersion: string;
  addedRoutineToCart: boolean;
}

export type QuizAnswers = Record<string, string | string[] | null>;

export interface HairProfileRoutineItem {
  step: RoutineStep;
  productId: string | null;
  productName: string | null;
}

export interface HairProfile {
  id: string;
  userId: string;
  answers: QuizAnswers;
  primaryLabel: string;
  secondaryLabel: string | null;
  routine: HairProfileRoutineItem[];
  addonProductId: string | null;
  rulesetVersion: string;
  savedAt: string;
}

export type InventoryAdjustmentType = 'ADJUST' | 'RECEIVE' | 'ORDER_STOCK';

export interface InventoryAdjustment {
  id: string;
  productId: string;
  variantId: string;
  sku: string;
  type: InventoryAdjustmentType;
  before: { onHand: number; incoming: number };
  after: { onHand: number; incoming: number };
  reason: string;
  at: string;
}

export interface OtpRequest {
  id: string;
  email: string;
  code: string;
  expiresAt: string;
  sentAt: string;
  attempts: number;
  used: boolean;
}

export interface StoreSettings {
  storeName: string;
  supportEmail: string;
  warehouseAddress: string;
  currency: 'USD';
  shippingFee: number;
  paymentTimeoutMinutes: number;
  bank: { bankName: string; accountNumber: string; accountName: string };
  paymentSimulation: boolean;
  lowStockThreshold: number;
  safetyStock: number;
  leadTimeDays: number;
  reviewPeriodDays: number;
  wapeThreshold: number;
  returnWindowDays: number;
}

export interface ForecastCategory {
  category: ProductCategory;
  selectedModel: string;
  candidates: Array<{ model: string; wape: number }>;
  weeklyWape: number[];
  history: Array<{ week: string; actual: number; predicted: number }>;
  forecast14d: number;
}

export interface ForecastData {
  generatedAt: string;
  lastTrainedAt: string;
  horizonDays: number;
  source: string;
  metric: string;
  categories: ForecastCategory[];
}

export interface MockDatabase {
  version: number;
  generatedAt: string;
  settings: StoreSettings;
  products: Product[];
  users: User[];
  admins: AdminAccount[];
  addresses: Address[];
  carts: Cart[];
  orders: Order[];
  reviews: Review[];
  vouchers: Voucher[];
  voucherUsages: VoucherUsage[];
  quizEvents: QuizEvent[];
  hairProfiles: HairProfile[];
  inventoryAdjustments: InventoryAdjustment[];
  otpRequests: OtpRequest[];
  forecast: ForecastData;
}

/** BR-PRD: Available = On Hand − Reserved. */
export function availableOf(variant: Pick<ProductVariant, 'onHand' | 'reserved'>): number {
  return Math.max(0, variant.onHand - variant.reserved);
}

export function productAvailable(product: Product): number {
  return product.variants.filter((v) => v.forSale).reduce((sum, v) => sum + availableOf(v), 0);
}

export function defaultVariant(product: Product): ProductVariant | undefined {
  const forSale = product.variants.filter((v) => v.forSale);
  return (
    forSale.find((v) => v.sizeLabel === 'Full' && availableOf(v) > 0) ??
    forSale.find((v) => availableOf(v) > 0) ??
    forSale.find((v) => v.sizeLabel === 'Full') ??
    forSale[0]
  );
}

export function startingPrice(product: Product): number {
  const prices = product.variants.filter((v) => v.forSale).map((v) => v.price);
  return prices.length ? Math.min(...prices) : 0;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

import { OrderStatus } from './order-status.model';

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  volumeLabel: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  paymentId: string;
  shippingAddressId: string;
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  voucherCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceVariant {
  label: string;
  price: number;
  selected?: boolean;
}

export interface ReferenceProduct {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  hairType: string[];
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  isBestSeller: boolean;
  isNew: boolean;
  badge: string;
  image: string;
  images: string[];
  shortDesc: string;
  sizes: ReferenceVariant[];
  stock: number;
  ingredients: string;
  usage: string;
}

export interface ReferenceCoupon {
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  minOrder: number;
  desc: string;
}

export interface ReferenceOrder {
  id: string;
  date: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  statusLabel: string;
  items: Array<{ name: string; price: number; qty: number }>;
  discount: number;
  shippingFee: number;
  total: number;
  trackingSteps: Array<{ title: string; time: string; done: boolean }>;
}

export interface ReferenceAdminKPI {
  revenue: string;
  revenueGrowth: string;
  ordersTotal: number;
  ordersPending: number;
  customersTotal: number;
  conversionRate: string;
}

export interface ReferenceStore {
  currentUser: {
    role: 'guest' | 'customer' | 'admin';
    name: string;
    email: string;
    phone: string;
    tier: string;
    points: number;
    avatar: string;
  };
  products: ReferenceProduct[];
  cart: Array<{
    productId: string;
    name: string;
    size: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  coupons: ReferenceCoupon[];
  appliedCoupon: ReferenceCoupon | null;
  orders: ReferenceOrder[];
  adminKPI: ReferenceAdminKPI;
}

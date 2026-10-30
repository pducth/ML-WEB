export interface CartItem {
  id: string;
  userId: string | null;
  productId: string;
  variantId: string;
  quantity: number;
  addedAt: string;
}

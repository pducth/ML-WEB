export interface Review {
  id: string;
  productId: string;
  userId: string;
  orderId?: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

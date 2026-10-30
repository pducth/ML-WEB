export const PRODUCT_CATEGORIES = [
  'Styling & Finishing',
  'Hair Masks',
  'Shampoo',
  'Conditioner',
  'Treatment/Oil',
  'Dry Shampoo',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type VolumeUnit = 'ml' | 'g';

export interface ProductVariant {
  id: string;
  sku: string;
  volume: number;
  unit: VolumeUnit;
  price: number;
  onHand: number;
  reserved: number;
  incoming: number;
  available: number;
}

export interface ProductQuizTags {
  needs: string[];
  scalp: string[];
  step: 'cleanse' | 'condition' | 'treat' | 'style_protect';
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  description: string;
  imageUrl: string;
  galleryImages?: string[];
  benefits?: string[];
  ingredients?: string[];
  howToUse?: string;
  rating: number;
  reviewCount: number;
  variants: ProductVariant[];
  tags: string[];
  quiz?: ProductQuizTags;
  createdAt: string;
  updatedAt: string;
}

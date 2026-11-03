import { Injectable, computed, inject } from '@angular/core';
import { DomainError, MockDbService, newId, nowIso } from '../data/mock-db.service';
import { OrderStatus, type Order, type Review, type ReviewMedia } from '../models';
import { AuthService } from './auth.service';

export const REVIEW_MAX_LENGTH = 1000;
export const REVIEW_MAX_PHOTOS = 4;
export const REVIEW_MAX_VIDEO_BYTES = 1_500_000;
const PHOTO_MAX_SIDE = 900;
export const HIDE_REASONS = ['Offensive language', 'Spam or advertising', 'Irrelevant content', 'Personal information'];

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly store = inject(MockDbService);
  private readonly auth = inject(AuthService);

  readonly reviews = computed(() => [...this.store.db().reviews].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));

  /** Hidden reviews are excluded from the PDP list, the average and the count (BR-REV). */
  visibleFor(productId: string): Review[] {
    return this.reviews().filter((review) => review.productId === productId && review.status === 'Visible');
  }

  /**
   * Star ratings of a product: counts of 5, 4, 3, 2 and 1 stars. They are the ratings left without a written review
   * (`ratingBase`) plus the visible written reviews, so a product can have hundreds of ratings and a handful of reviews.
   */
  distributionFor(productId: string): number[] {
    const product = this.store.db().products.find((p) => p.id === productId);
    const counts = [...(product?.ratingBase ?? [0, 0, 0, 0, 0])];
    for (const review of this.visibleFor(productId)) counts[5 - review.rating] += 1;
    return counts;
  }

  statsFor(productId: string): { average: number; count: number } {
    const counts = this.distributionFor(productId);
    const count = counts.reduce((sum, c) => sum + c, 0);
    const average = count ? counts.reduce((sum, c, i) => sum + c * (5 - i), 0) / count : 0;
    return { average: Math.round(average * 10) / 10, count };
  }

  /** Reads a photo or clip picked by the shopper. Photos are shrunk; clips must stay small (they live in the browser). */
  async readMedia(file: File): Promise<ReviewMedia> {
    if (file.type.startsWith('video/')) {
      if (file.size > REVIEW_MAX_VIDEO_BYTES) throw new DomainError('Videos must be under 1.5 MB (about 10 seconds).');
      return { type: 'video', src: await readAsDataUrl(file) };
    }
    if (!file.type.startsWith('image/')) throw new DomainError('Please choose a photo or a short video.');
    const image = await loadImage(await readAsDataUrl(file));
    const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { type: 'image', src: canvas.toDataURL('image/jpeg', 0.78) };
  }

  mineFor(orderId: string, productId: string): Review | undefined {
    const user = this.auth.currentUser();
    return this.reviews().find((r) => r.orderId === orderId && r.productId === productId && r.userId === user?.id);
  }

  /** Verified purchase: only Completed orders of the signed-in owner can be reviewed. */
  canReview(order: Order): boolean {
    return order.status === OrderStatus.Completed && order.userId === this.auth.currentUser()?.id;
  }

  /** The most recent Completed order in which the current customer bought this product (for the PDP CTA). */
  reviewableOrderFor(productId: string, orders: Order[]): Order | undefined {
    return orders.find((order) => this.canReview(order) && order.items.some((item) => item.productId === productId));
  }

  submit(order: Order, productId: string, rating: number, comment: string, media: ReviewMedia[] = []): void {
    const user = this.auth.currentUser();
    if (!user || !this.canReview(order)) throw new DomainError('Only delivered (Completed) orders can be reviewed.');
    if (!order.items.some((item) => item.productId === productId)) throw new DomainError('This product is not part of the order.');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new DomainError('Please choose a rating from 1 to 5 stars.');
    const text = comment.trim();
    if (text.length > REVIEW_MAX_LENGTH) throw new DomainError(`Reviews are limited to ${REVIEW_MAX_LENGTH} characters.`);
    if (media.filter((m) => m.type === 'image').length > REVIEW_MAX_PHOTOS || media.filter((m) => m.type === 'video').length > 1) {
      throw new DomainError(`You can attach up to ${REVIEW_MAX_PHOTOS} photos and one video.`);
    }
    this.store.mutate((db) => {
      const existing = db.reviews.find((r) => r.orderId === order.id && r.productId === productId && r.userId === user.id);
      const now = nowIso();
      if (existing) {
        Object.assign(existing, { rating, comment: text, media, updatedAt: now });
      } else {
        db.reviews.push({ id: newId('rev'), productId, orderId: order.id, userId: user.id, authorName: shortName(user.fullName), rating, comment: text, media, status: 'Visible', hiddenReason: null, createdAt: now, updatedAt: now });
      }
    });
  }

  hide(reviewId: string, reason: string): void {
    if (!reason.trim()) throw new DomainError('Please choose a reason for hiding this review.');
    this.store.mutate((db) => {
      const review = db.reviews.find((r) => r.id === reviewId);
      if (review) Object.assign(review, { status: 'Hidden', hiddenReason: reason, updatedAt: nowIso() });
    });
  }

  unhide(reviewId: string): void {
    this.store.mutate((db) => {
      const review = db.reviews.find((r) => r.id === reviewId);
      if (review) Object.assign(review, { status: 'Visible', hiddenReason: null, updatedAt: nowIso() });
    });
  }
}

const VN_SURNAMES = new Set(['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Võ', 'Đặng', 'Bùi', 'Hoàng', 'Đỗ', 'Ngô', 'Trương', 'Huỳnh', 'Phan', 'Vũ', 'Dương', 'Lý', 'Đinh', 'Tô', 'Mai', 'Lâm']);

/** Name shown under a review: given name and the initial of the surname, e.g. "Thảo N." */
function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? 'Customer';
  const [first, last] = [parts[0], parts[parts.length - 1]];
  return VN_SURNAMES.has(first) ? `${last} ${first[0]}.` : `${first} ${last[0]}.`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new DomainError('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new DomainError('Could not open that photo.'));
    image.src = src;
  });
}

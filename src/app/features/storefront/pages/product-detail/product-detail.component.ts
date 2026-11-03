import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { availableOf, defaultVariant, type ProductVariant, type Review, type ReviewMedia } from '../../../../core/models';
import { CartService } from '../../../../core/services/cart.service';
import { OrderService } from '../../../../core/services/order.service';
import { ProductService } from '../../../../core/services/product.service';
import { ReviewService } from '../../../../core/services/review.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StarsComponent } from '../../../../shared/ui/stars.component';
import { CompactPipe } from '../../../../shared/ui/compact.pipe';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

type SectionId = 'details' | 'ingredients' | 'usage';
interface DetailBlock { kind: 'text' | 'bullet' | 'note' | 'heading'; text: string }
type ReviewKind = 'all' | 'comment' | 'photo' | 'video';

const REVIEWS_PER_PAGE = 6;

/** C03 — Product detail page. */
@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [NgClass, DatePipe, RouterLink, UsdPipe, CompactPipe, StarsComponent],
  templateUrl: './product-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'lightbox.set(null); zoomOpen.set(false)' },
})
export class ProductDetailComponent {
  private readonly catalog = inject(ProductService);
  private readonly reviewsService = inject(ReviewService);
  private readonly orders = inject(OrderService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly settings = inject(SettingsService).settings;

  readonly productId = input.required<string>();
  readonly product = computed(() => {
    const product = this.catalog.getById(this.productId());
    return product && product.status === 'Active' ? product : undefined;
  });

  readonly selectedVariantId = signal<string | null>(null);
  readonly selectedImage = signal<string | null>(null);
  readonly quantity = signal(1);
  /** Accordion under the buy buttons; Details starts open. */
  readonly sections: { id: SectionId; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'ingredients', label: 'Ingredients' },
    { id: 'usage', label: 'How to use' },
  ];
  readonly openSections = signal<Set<SectionId>>(new Set(['details']));

  /** Description and key benefits as one text: paragraphs, bullets and footnotes, with benefits the description does not already list. */
  readonly detailBlocks = computed<DetailBlock[]>(() => {
    const product = this.product();
    if (!product) return [];
    const blocks: DetailBlock[] = product.description
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line): DetailBlock =>
        line.startsWith('•') ? { kind: 'bullet', text: line.replace(/^•\s*/, '') } : line.startsWith('*') ? { kind: 'note', text: line } : { kind: 'text', text: line },
      );
    const flat = product.description.toLowerCase().replace(/\W+/g, '');
    const extra = product.keyBenefits.filter((b) => b.trim() && !flat.includes(b.toLowerCase().replace(/\W+/g, '').slice(0, 40)));
    const notes = blocks.filter((b) => b.kind === 'note');
    const body = blocks.filter((b) => b.kind !== 'note');
    return [...body, ...(extra.length ? [{ kind: 'heading', text: 'Key benefits' } as DetailBlock, ...extra.map((text): DetailBlock => ({ kind: 'bullet', text }))] : []), ...notes];
  });
  readonly directions = computed(() => (this.product()?.howToUse ?? '').split('\n').map((l) => l.trim()).filter(Boolean));

  // Zoom view of the main image.
  readonly zoomOpen = signal(false);
  /** Every photo of the product for the zoom view (the photo of the chosen size comes first when it is not in the gallery). */
  readonly zoomImages = computed(() => {
    const images = this.product()?.images ?? [];
    const current = this.mainImage();
    return !current || images.includes(current) ? images : [current, ...images];
  });

  readonly variants = computed(() => this.product()?.variants.filter((v) => v.forSale) ?? []);
  readonly variant = computed<ProductVariant | undefined>(() => {
    const product = this.product();
    if (!product) return undefined;
    return this.variants().find((v) => v.id === this.selectedVariantId()) ?? defaultVariant(product);
  });
  readonly available = computed(() => (this.variant() ? availableOf(this.variant()!) : 0));
  // A thumbnail the shopper clicked wins; otherwise the packshot of the selected size, then the main packshot.
  readonly mainImage = computed(() => this.selectedImage() ?? this.variant()?.image ?? this.product()?.images[0] ?? '');
  readonly isBestSeller = computed(() => this.catalog.bestSellerIds().has(this.productId()));
  readonly isNew = computed(() => this.catalog.newArrivalIds().has(this.productId()));
  readonly stats = computed(() => this.reviewsService.statsFor(this.productId()));
  readonly reviews = computed(() => this.reviewsService.visibleFor(this.productId()));
  /** Every star rating of the product (with or without a written review), as bars. */
  readonly ratingBars = computed(() => {
    const counts = this.reviewsService.distributionFor(this.productId());
    const total = counts.reduce((sum, c) => sum + c, 0);
    return counts.map((count, i) => ({ stars: 5 - i, count, share: total ? (count / total) * 100 : 0 }));
  });

  // Filters of the written reviews: by stars and by what they contain.
  readonly starFilter = signal(0);
  readonly kindFilter = signal<ReviewKind>('all');
  readonly perPage = REVIEWS_PER_PAGE;
  readonly shown = signal(REVIEWS_PER_PAGE);
  readonly filtered = computed(() =>
    this.reviews().filter((r) => (!this.starFilter() || r.rating === this.starFilter()) && this.matches(r, this.kindFilter())),
  );
  readonly pageReviews = computed(() => this.filtered().slice(0, this.shown()));
  readonly starCounts = computed(() => [5, 4, 3, 2, 1].map((stars) => ({ stars, count: this.reviews().filter((r) => r.rating === stars && this.matches(r, this.kindFilter())).length })));
  readonly kindCounts = computed(() => {
    const list = this.reviews().filter((r) => !this.starFilter() || r.rating === this.starFilter());
    return (['all', 'comment', 'photo', 'video'] as ReviewKind[]).map((kind) => ({ kind, count: list.filter((r) => this.matches(r, kind)).length }));
  });
  readonly kindLabels: Record<ReviewKind, string> = { all: 'All reviews', comment: 'With comment', photo: 'With photos', video: 'With video' };

  /** Photo or clip of a review opened full screen. */
  readonly lightbox = signal<{ media: ReviewMedia[]; index: number } | null>(null);
  readonly reviewableOrder = computed(() => this.reviewsService.reviewableOrderFor(this.productId(), this.orders.myOrders()));

  readonly availableFor = availableOf;

  constructor() {
    effect((onCleanup) => {
      if (this.zoomOpen() || this.lightbox()) {
        document.body.style.overflow = 'hidden';
        onCleanup(() => (document.body.style.overflow = ''));
      }
    });
    // Reset the selection when navigating between products.
    effect(() => {
      this.productId();
      this.selectedVariantId.set(null);
      this.selectedImage.set(null);
      this.quantity.set(1);
      this.openSections.set(new Set(['details']));
      this.zoomOpen.set(false);
      this.clearFilters();
      this.lightbox.set(null);
    });
  }

  isOpen(id: SectionId): boolean {
    return this.openSections().has(id);
  }

  toggleSection(id: SectionId): void {
    this.openSections.update((open) => {
      const next = new Set(open);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /** Opens the zoom view over the whole screen and scrolls it to the photo that is showing. */
  openZoom(): void {
    const index = Math.max(0, this.zoomImages().indexOf(this.mainImage()));
    this.zoomOpen.set(true);
    setTimeout(() => document.getElementById(`zoom-image-${index}`)?.scrollIntoView({ block: 'start' }));
  }

  private matches(review: Review, kind: ReviewKind): boolean {
    switch (kind) {
      case 'comment':
        return review.comment.trim().length > 0;
      case 'photo':
        return review.media.some((m) => m.type === 'image');
      case 'video':
        return review.media.some((m) => m.type === 'video');
      default:
        return true;
    }
  }

  setStarFilter(stars: number): void {
    this.starFilter.set(this.starFilter() === stars ? 0 : stars);
    this.shown.set(REVIEWS_PER_PAGE);
  }

  setKindFilter(kind: ReviewKind): void {
    this.kindFilter.set(kind);
    this.shown.set(REVIEWS_PER_PAGE);
  }

  /** Back to the first page of reviews, scrolled to the top of the section. */
  collapseReviews(): void {
    this.shown.set(REVIEWS_PER_PAGE);
    setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ block: 'start' }));
  }

  clearFilters(): void {
    this.starFilter.set(0);
    this.kindFilter.set('all');
    this.shown.set(REVIEWS_PER_PAGE);
  }

  openMedia(review: Review, index: number): void {
    this.lightbox.set({ media: review.media, index });
  }

  stepMedia(delta: number): void {
    const box = this.lightbox();
    if (box) this.lightbox.set({ ...box, index: (box.index + delta + box.media.length) % box.media.length });
  }

  selectVariant(variant: ProductVariant): void {
    this.selectedVariantId.set(variant.id);
    this.selectedImage.set(null);
    this.quantity.set(Math.min(Math.max(1, this.quantity()), Math.max(1, availableOf(variant))));
  }

  changeQuantity(delta: number): void {
    this.setQuantity(this.quantity() + delta);
  }

  setQuantity(value: number): void {
    const max = Math.max(1, this.available());
    this.quantity.set(Math.min(max, Math.max(1, Math.floor(Number(value) || 1))));
  }

  addToBag(): boolean {
    const product = this.product();
    const variant = this.variant();
    if (!product || !variant) return false;
    try {
      this.cart.add(product.id, variant.id, this.quantity());
      this.toast.show(`${product.name} (${variant.sizeLabel}) × ${this.quantity()} added to your bag.`);
      return true;
    } catch (error) {
      this.toast.error(errorMessage(error));
      return false;
    }
  }

  /** "Buy Now": add to bag then go straight to C07 (guests are asked to sign in by the route guard). */
  buyNow(): void {
    if (this.addToBag()) void this.router.navigateByUrl('/checkout');
  }
}

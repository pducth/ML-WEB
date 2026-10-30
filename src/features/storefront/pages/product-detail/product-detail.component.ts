import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CurrencyPipe } from '../../../../shared/pipes/currency.pipe';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from '../../../../core/services/cart.service';
import { ProductService } from '../../../../core/services/product.service';
import { ReviewService } from '../../../../core/services/review.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ErrorNotificationService } from '../../../../core/services/error-notification.service';
import type { Product, ProductVariant } from '../../../../core/models/product.model';
import type { Review } from '../../../../core/models/review.model';
import { SkeletonLoaderComponent } from '../../../../shared/components/skeleton-loader/skeleton-loader.component';

type DetailTab = 'description' | 'benefits' | 'ingredients' | 'how-to-use';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, SkeletonLoaderComponent],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsApi = inject(ProductService);
  private readonly reviewsApi = inject(ReviewService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly notification = inject(ErrorNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly product = signal<Product | null>(null);
  readonly reviews = signal<Review[]>([]);
  readonly selectedVariant = signal<ProductVariant | null>(null);
  readonly selectedImage = signal('');
  readonly selectedTab = signal<DetailTab>('description');
  readonly quantity = signal(1);
  readonly isLoading = signal(true);
  readonly isReviewsLoading = signal(false);
  readonly isAddingToCart = signal(false);
  readonly errorMessage = signal('');
  readonly reviewError = signal('');
  readonly previewCatalog = this.productsApi.previewCatalog;
  readonly gallery = computed(() => {
    const product = this.product();
    return product ? (product.galleryImages?.length ? product.galleryImages : [product.imageUrl]) : [];
  });
  readonly isOutOfStock = computed(() => (this.selectedVariant()?.available ?? 0) <= 0);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const productId = params.get('productId');
      if (productId) {
        this.loadProduct(productId);
      }
    });
  }

  loadProduct(productId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.product.set(null);
    this.productsApi.getById(productId, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (product) => {
        this.product.set(product);
        const inStockVariant = product.variants.find((variant) => variant.available > 0);
        this.selectedVariant.set(inStockVariant ?? product.variants[0] ?? null);
        this.selectedImage.set(product.galleryImages?.[0] ?? product.imageUrl);
        this.quantity.set(1);
        this.isLoading.set(false);
        if (this.productsApi.previewCatalog()) {
          this.isReviewsLoading.set(false);
          this.reviews.set([]);
        } else {
          this.loadReviews(product.id);
        }
      },
      error: () => {
        this.errorMessage.set('We could not load this product. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  retryProduct(): void {
    const productId = this.route.snapshot.paramMap.get('productId');
    if (productId) {
      this.loadProduct(productId);
    }
  }

  loadReviews(productId: string): void {
    this.isReviewsLoading.set(true);
    this.reviewError.set('');
    this.reviewsApi.getForProduct(productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (reviews) => {
        this.reviews.set(reviews);
        this.isReviewsLoading.set(false);
      },
      error: () => {
        this.reviewError.set('Reviews could not be loaded right now.');
        this.isReviewsLoading.set(false);
      },
    });
  }

  selectVariant(variant: ProductVariant): void {
    this.selectedVariant.set(variant);
    this.quantity.set(1);
  }

  selectImage(image: string): void {
    this.selectedImage.set(image);
  }

  updateQuantity(event: Event): void {
    const requested = Number((event.target as HTMLInputElement).value);
    const available = this.selectedVariant()?.available ?? 0;
    this.quantity.set(Math.max(1, Math.min(available || 1, Math.floor(requested) || 1)));
  }

  addToCart(buyNow = false): void {
    if (this.previewCatalog()) {
      this.notification.show('Shopping is unavailable until the product API is connected.');
      return;
    }

    const product = this.product();
    const variant = this.selectedVariant();
    if (!product || !variant || variant.available <= 0 || this.isAddingToCart()) {
      return;
    }

    this.isAddingToCart.set(true);
    this.cartService.addOrUpdateItem({
      userId: this.authService.currentUser()?.id ?? null,
      productId: product.id,
      variantId: variant.id,
      quantity: Math.min(this.quantity(), variant.available),
    }, variant.available).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isAddingToCart.set(false);
        this.notification.show(`${product.name} was added to your cart.`, 'success');
        if (buyNow) {
          void this.router.navigate(['/checkout']);
        }
      },
      error: (error: unknown) => {
        this.isAddingToCart.set(false);
        this.notification.show(
          error instanceof RangeError
            ? error.message
            : 'We could not add this item to your cart. Please try again.',
        );
      },
    });
  }

  setTab(tab: DetailTab): void {
    this.selectedTab.set(tab);
  }

  get benefits(): string[] {
    return this.product()?.benefits ?? [
      'Nourishes hair with the restorative properties of argan oil.',
      'Helps leave hair feeling soft, smooth, and manageable.',
      'Designed for an easy addition to your everyday hair ritual.',
    ];
  }

  get ingredients(): string[] {
    return this.product()?.ingredients ?? ['Argan oil', 'Hair conditioning agents', 'Fragrance'];
  }
}

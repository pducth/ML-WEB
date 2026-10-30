import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../../core/services/cart.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ReferenceStoreService } from '../../../../core/services/reference-store.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Product } from '../../../../core/models/product.model';
import type { ReferenceProduct } from '../../../../core/models/reference-store.model';
import { SkeletonLoaderComponent } from '../../../../shared/components/skeleton-loader/skeleton-loader.component';
import { ParallaxDirective } from '../../../../shared/directives/parallax.directive';

const productRoutes: Record<string, string> = {
  'm-01': 'moro-009',
  'm-02': 'moro-005',
  'm-04': 'moro-003',
  'm-05': 'moro-001',
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [SkeletonLoaderComponent, ParallaxDirective],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly referenceStore = inject(ReferenceStoreService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<ReferenceProduct[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly bestSellers = computed(() => {
    const products = this.products();
    return ['m-01', 'm-02', 'm-04', 'm-05']
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is ReferenceProduct => product !== undefined);
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.referenceStore.getSnapshot().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (store) => {
        this.products.set(store.products);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('We could not load products. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  openProduct(product: ReferenceProduct): void {
    void this.router.navigate(['/products', productRoutes[product.id] ?? product.id]);
  }

  navigateToShop(): void {
    void this.router.navigate(['/shop']);
  }

  startQuiz(): void {
    void this.router.navigate(['/quiz']);
  }

  formatVnd(amount: number): string {
    return `${amount.toLocaleString('vi-VN')}₫`;
  }

  addToCart(referenceProduct: ReferenceProduct): void {
    const productId = productRoutes[referenceProduct.id];
    if (!productId) {
      this.toast.show('Sản phẩm này chưa được liên kết với catalog.', 'error');
      return;
    }

    this.productsApi.getById(productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (product: Product) => {
        const selectedSize = referenceProduct.sizes.find((size) => size.selected) ?? referenceProduct.sizes[0];
        const variant =
          product.variants.find((candidate) => `${candidate.volume}${candidate.unit}` === selectedSize?.label) ??
          product.variants[0];
        if (!variant || variant.available < 1) {
          this.toast.show('Biến thể đã hết hàng.', 'error');
          return;
        }

        this.cartService
          .addOrUpdateItem(
            {
              userId: this.authService.currentUser()?.id ?? null,
              productId: referenceProduct.id,
              variantId: `${referenceProduct.id}-${selectedSize?.label ?? 'standard'}`,
              quantity: 1,
            },
            referenceProduct.stock,
          )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.show(`Đã thêm "${referenceProduct.name}" vào giỏ hàng!`, 'success');
              this.cartService.openDrawer();
            },
            error: (error: unknown) => {
              this.toast.show(
                error instanceof RangeError ? error.message : 'Không thể thêm sản phẩm vào giỏ hàng.',
                'error',
              );
            },
          });
      },
      error: () => this.toast.show('Không thể tải thông tin sản phẩm.', 'error'),
    });
  }
}

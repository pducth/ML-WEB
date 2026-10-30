import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../../core/services/cart.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Product } from '../../../../core/models/product.model';
import { SkeletonLoaderComponent } from '../../../../shared/components/skeleton-loader/skeleton-loader.component';
import { ParallaxDirective } from '../../../../shared/directives/parallax.directive';

const productRoutes: Record<string, string> = {
  'm-01': 'moro-009',
  'm-02': 'moro-005',
  'm-04': 'moro-003',
  'm-05': 'moro-001',
};

interface HomeProduct {
  id: string;
  name: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  price: number;
  variantId: string;
  available: number;
  previewOnly: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CurrencyPipe, SkeletonLoaderComponent, ParallaxDirective],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<HomeProduct[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly catalogNotice = signal('');
  readonly bestSellers = computed(() => {
    const products = this.products();
    return Object.values(productRoutes)
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is HomeProduct => product !== undefined);
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.catalogNotice.set('');
    this.productsApi.getAll(undefined, true).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (products) => {
        const featured = products
          .filter((product) => Object.values(productRoutes).includes(product.id))
          .map((product) => this.toHomeProduct(product, this.productsApi.previewCatalog()));
        this.products.set(featured);
        if (this.productsApi.previewCatalog()) {
          this.catalogNotice.set('Showing sample catalog data. Shopping is disabled until the product API is connected.');
        }
        if (featured.length === 0) this.errorMessage.set('No featured products are available in the catalog yet.');
        this.isLoading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.errorMessage.set('We could not load the product catalog or its preview data.');
        this.isLoading.set(false);
      },
    });
  }

  openProduct(product: HomeProduct): void {
    void this.router.navigate(['/products', product.id]);
  }

  navigateToShop(): void {
    void this.router.navigate(['/shop']);
  }

  startQuiz(): void {
    void this.router.navigate(['/quiz']);
  }

  addToCart(product: HomeProduct): void {
    if (product.previewOnly) {
      this.toast.show('Shopping is unavailable until the product API is connected.', 'error');
      return;
    }

    this.cartService
      .addOrUpdateItem(
        {
          userId: this.authService.currentUser()?.id ?? null,
          productId: product.id,
          variantId: product.variantId,
          quantity: 1,
        },
        product.available,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.show(`${product.name} was added to your bag.`, 'success');
          this.cartService.openDrawer();
        },
        error: (error: unknown) => {
          this.toast.show(
            error instanceof RangeError ? error.message : 'We could not add this item to your bag.',
            'error',
          );
        },
      });
  }

  private toHomeProduct(product: Product, previewOnly = false): HomeProduct {
    const variant =
      product.variants.filter((candidate) => candidate.available > 0).sort((a, b) => a.price - b.price)[0] ??
      [...product.variants].sort((a, b) => a.price - b.price)[0];
    return {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      rating: product.rating,
      reviewCount: product.reviewCount,
      price: variant?.price ?? 0,
      variantId: variant?.id ?? '',
      available: variant?.available ?? 0,
      previewOnly,
    };
  }
}

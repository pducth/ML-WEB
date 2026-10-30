import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../../core/services/product.service';
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from '../../../../core/models/product.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';
import { SkeletonLoaderComponent } from '../../../../shared/components/skeleton-loader/skeleton-loader.component';

type StockFilter = 'all' | 'in-stock' | 'out-of-stock';
type SortOrder = 'featured' | 'price-asc' | 'price-desc' | 'rating';
type HairConcern = 'all' | 'dry' | 'damaged' | 'colored' | 'thin';
const PAGE_SIZE = 8;

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [EmptyStateComponent, PaginationComponent, ProductCardComponent, SkeletonLoaderComponent],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories = PRODUCT_CATEGORIES;
  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly searchQuery = signal('');
  readonly category = signal<ProductCategory | ''>('');
  readonly hairConcern = signal<HairConcern>('all');
  readonly minimumPrice = signal('');
  readonly maximumPrice = signal('');
  readonly stockFilter = signal<StockFilter>('all');
  readonly sortOrder = signal<SortOrder>('featured');
  readonly currentPage = signal(1);

  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const minimum = this.minimumPrice() === '' ? null : Number(this.minimumPrice());
    const maximum = this.maximumPrice() === '' ? null : Number(this.maximumPrice());

    return this.products()
      .filter((product) => {
        const price = this.startingPrice(product);
        const isInStock = product.variants.some((variant) => variant.available > 0);
        return (
          (!this.category() || product.category === this.category()) &&
          this.matchesHairConcern(product, this.hairConcern()) &&
          (!query || `${product.name} ${product.category} ${product.tags.join(' ')}`.toLowerCase().includes(query)) &&
          (minimum === null || price >= minimum) &&
          (maximum === null || price <= maximum) &&
          (this.stockFilter() === 'all' ||
            (this.stockFilter() === 'in-stock' && isInStock) ||
            (this.stockFilter() === 'out-of-stock' && !isInStock))
        );
      })
      .sort((left, right) => {
        switch (this.sortOrder()) {
          case 'price-asc': return this.startingPrice(left) - this.startingPrice(right);
          case 'price-desc': return this.startingPrice(right) - this.startingPrice(left);
          case 'rating': return right.rating - left.rating;
          default: return 0;
        }
      });
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredProducts().length / PAGE_SIZE)));
  readonly visibleProducts = computed(() => {
    const offset = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredProducts().slice(offset, offset + PAGE_SIZE);
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.searchQuery.set(params.get('q') ?? '');
      const requestedCategory = params.get('category');
      this.category.set(
        PRODUCT_CATEGORIES.find((category) => category === requestedCategory) ?? '',
      );
      this.currentPage.set(1);
    });
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.productsApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (products) => {
        this.products.set(products);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('We could not load the product collection. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  startingPrice(product: Product): number {
    return Math.min(...product.variants.map((variant) => variant.price));
  }

  setSearchQuery(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  setCategory(event: Event): void {
    this.category.set((event.target as HTMLSelectElement).value as ProductCategory | '');
    this.currentPage.set(1);
  }

  setHairConcern(event: Event): void {
    this.hairConcern.set((event.target as HTMLSelectElement).value as HairConcern);
    this.currentPage.set(1);
  }

  setPrice(event: Event, field: 'minimum' | 'maximum'): void {
    const value = (event.target as HTMLInputElement).value;
    (field === 'minimum' ? this.minimumPrice : this.maximumPrice).set(value);
    this.currentPage.set(1);
  }

  setStock(event: Event): void {
    this.stockFilter.set((event.target as HTMLSelectElement).value as StockFilter);
    this.currentPage.set(1);
  }

  setSort(event: Event): void {
    this.sortOrder.set((event.target as HTMLSelectElement).value as SortOrder);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openProduct(product: Product): void {
    void this.router.navigate(['/products', product.id]);
  }

  openQuiz(): void {
    void this.router.navigate(['/quiz']);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.category.set('');
    this.hairConcern.set('all');
    this.minimumPrice.set('');
    this.maximumPrice.set('');
    this.stockFilter.set('all');
    this.sortOrder.set('featured');
    this.currentPage.set(1);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  private matchesHairConcern(product: Product, concern: HairConcern): boolean {
    if (concern === 'all') return true;
    const tags = `${product.tags.join(' ')} ${product.name} ${product.description}`.toLowerCase();
    const terms: Record<Exclude<HairConcern, 'all'>, string[]> = {
      dry: ['dry', 'hydration', 'moisture'],
      damaged: ['damage', 'repair', 'breakage', 'chemically treated'],
      colored: ['color', 'colour', 'colored', 'colour-treated'],
      thin: ['thin', 'fine', 'limp', 'volume'],
    };
    return terms[concern].some((term) => tags.includes(term));
  }
}

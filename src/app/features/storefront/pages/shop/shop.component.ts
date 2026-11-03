import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PRODUCT_CATEGORIES, startingPrice, type ProductCategory } from '../../../../core/models';
import { ProductService, type ShopQuery, type ShopSort, type StockFilter } from '../../../../core/services/product.service';
import { ProductCardComponent } from '../../../../shared/ui/product-card.component';

const PAGE_SIZE = 12;

/** C02 — Shop catalog & smart search. Filters live in the URL so results are shareable. */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [NgClass, RouterLink, ProductCardComponent],
  templateUrl: './shop.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopComponent {
  private readonly catalog = inject(ProductService);
  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  readonly categories = PRODUCT_CATEGORIES;
  readonly categoryCounts = this.catalog.categoryCounts;
  readonly brandCounts = this.catalog.brandCounts;
  readonly brands = computed(() => [...this.brandCounts().keys()]);
  readonly totalActive = computed(() => this.catalog.activeProducts().length);

  /** Upper bound of the price slider: the priciest starting price, rounded up to the next $10. */
  readonly priceCeiling = computed(() => {
    const top = Math.max(0, ...this.catalog.activeProducts().map((p) => startingPrice(p)));
    return Math.max(10, Math.ceil(top / 10) * 10);
  });

  /** Slider value while dragging, before it is committed to the URL. */
  readonly priceDraft = signal<number | null>(null);

  readonly query = computed<ShopQuery>(() => {
    const p = this.params();
    const category = p.get('category') as ProductCategory | null;
    const num = (key: string) => {
      const value = p.get(key);
      return value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
    };
    return {
      q: p.get('q') ?? '',
      category: category && PRODUCT_CATEGORIES.includes(category) ? category : 'all',
      brand: this.brands().find((b) => b.toLowerCase() === (p.get('brand') ?? '').toLowerCase()) ?? 'all',
      minPrice: num('min'),
      maxPrice: num('max'),
      stock: (['in', 'out'].includes(p.get('stock') ?? '') ? p.get('stock') : 'all') as StockFilter,
      sort: (['price-asc', 'price-desc', 'newest', 'name-asc', 'name-desc'].includes(p.get('sort') ?? '') ? p.get('sort') : 'best-sellers') as ShopSort,
    };
  });

  readonly results = computed(() => this.catalog.query(this.query()));
  readonly page = computed(() => Math.min(Math.max(1, Number(this.params().get('page')) || 1), this.pageCount()));
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.results().length / PAGE_SIZE)));
  readonly pageItems = computed(() => this.results().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));
  readonly pages = computed(() => Array.from({ length: this.pageCount() }, (_, i) => i + 1));
  readonly hasFilters = computed(() => {
    const q = this.query();
    return !!q.q || q.category !== 'all' || q.brand !== 'all' || q.minPrice !== null || q.maxPrice !== null || q.stock !== 'all';
  });

  update(changes: Record<string, string | number | null>): void {
    const next = { ...changes, page: 'page' in changes ? changes['page'] : null };
    const cleaned = Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v === '' || v === 'all' ? null : v]));
    void this.router.navigate([], { queryParams: cleaned, queryParamsHandling: 'merge' });
  }

  clearFilters(): void {
    void this.router.navigate([], { queryParams: { sort: this.params().get('sort') } });
  }
}

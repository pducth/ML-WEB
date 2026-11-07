import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PRODUCT_CATEGORIES, startingPrice, type ProductCategory } from '../../../../core/models';
import { ProductService, type ShopQuery, type ShopSort, type StockFilter } from '../../../../core/services/product.service';
import { ProductCardComponent } from '../../../../shared/ui/product-card.component';

const PAGE_SIZE = 12;

/** C02: Shop catalog & smart search. Filters live in the URL so results are shareable. */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [NgClass, RouterLink, ProductCardComponent],
  templateUrl: './shop.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'onDocumentClick($event)', '(document:keydown.escape)': 'open.set(null)' },
})
export class ShopComponent {
  private readonly catalog = inject(ProductService);
  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  /** Where the filter bar docks: the bottom edge of the site header while it is on screen, the very top once it has scrolled away. */
  readonly stickyTop = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const header = document.querySelector('header');
      if (!header) return;
      let frame = 0;
      const measure = () => {
        frame = 0;
        this.stickyTop.set(Math.max(0, Math.round(header.getBoundingClientRect().bottom)));
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(measure);
      };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      measure();
      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        if (frame) cancelAnimationFrame(frame);
      });
    });
  }

  /** Which filter dropdown is open. */
  readonly open = signal<'brand' | 'category' | 'price' | 'sort' | null>(null);

  toggleMenu(menu: 'brand' | 'category' | 'price' | 'sort'): void {
    this.open.update((current) => (current === menu ? null : menu));
  }

  /** The sort choices; the first is called "Best match" while a search is active. */
  readonly sortOptions = computed(() => [
    { value: 'best-sellers', label: this.query().q ? 'Best match' : 'Best Sellers' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' },
  ]);
  readonly sortLabel = computed(() => this.sortOptions().find((o) => o.value === this.query().sort)?.label ?? 'Best Sellers');

  /** Applies a single-choice option and closes its dropdown. */
  pick(key: string, value: string): void {
    this.open.set(null);
    this.update({ [key]: value });
  }

  /** Ticks or unticks one brand; the dropdown stays open so several can be chosen. */
  toggleBrand(brand: string): void {
    const key = brand.toLowerCase();
    const current = this.query().brand;
    this.update({ brand: current.includes(key) ? current.filter((b) => b !== key) : [...current, key] });
  }

  toggleCategory(category: ProductCategory): void {
    const current = this.query().category;
    this.update({ category: current.includes(category) ? current.filter((c) => c !== category) : [...current, category] });
  }

  /** Short label for a filter button: the name when one is ticked, a count when several are. */
  summary(label: string, selected: string[]): string {
    return selected.length === 0 ? label : selected.length === 1 ? selected[0] : `${label} (${selected.length})`;
  }

  /** Selected brands as written in the catalog. */
  readonly brandLabels = computed(() => this.query().brand.map((key) => this.brands().find((b) => b.toLowerCase() === key) ?? key));

  onDocumentClick(event: MouseEvent): void {
    const bar = document.querySelector('[data-filter-bar]');
    if (this.open() && bar && !bar.contains(event.target as Node)) this.open.set(null);
  }

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
      category: PRODUCT_CATEGORIES.filter((c) => p.getAll('category').includes(c)),
      brand: this.brands().map((b) => b.toLowerCase()).filter((b) => p.getAll('brand').map((v) => v.toLowerCase()).includes(b)),
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
    return !!q.q || q.category.length > 0 || q.brand.length > 0 || q.minPrice !== null || q.maxPrice !== null || q.stock !== 'all';
  });

  update(changes: Record<string, string | number | string[] | null>): void {
    const next = { ...changes, page: 'page' in changes ? changes['page'] : null };
    const cleaned = Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v === '' || v === 'all' || (Array.isArray(v) && !v.length) ? null : v]));
    void this.router.navigate([], { queryParams: cleaned, queryParamsHandling: 'merge' });
  }

  clearFilters(): void {
    void this.router.navigate([], { queryParams: { sort: this.params().get('sort') } });
  }
}

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';

type NavKey = 'home' | 'best' | 'new' | 'quiz' | 'story' | 'shop' | `category:${string}` | null;

/** Storefront header (customers only): promo strip, brand bar with search & account, and the shop navigation. */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:scroll)': 'onScroll()', '(document:click)': 'onDocumentClick($event)', '(document:keydown.escape)': 'menuOpen.set(false)' },
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly products = inject(ProductService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly cart = inject(CartService);
  readonly settings = inject(SettingsService).settings;

  readonly user = this.auth.currentUser;
  readonly firstName = computed(() => this.user()?.fullName.split(' ').filter(Boolean).slice(-1)[0] ?? '');
  /** The promo strip folds away once the page scrolls so the sticky header stays compact. */
  readonly compact = signal(false);
  readonly menuOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Which navigation entry matches the current URL (shop links differ only by query params). */
  readonly active = computed<NavKey>(() => {
    const tree = this.router.parseUrl(this.url());
    const path = '/' + (tree.root.children['primary']?.segments.map((s) => s.path).join('/') ?? '');
    const params = tree.queryParamMap;
    if (path === '/') return 'home';
    if (path.startsWith('/quiz')) return 'quiz';
    if (path === '/about') return 'story';
    if (path === '/shop') {
      if (params.get('category')) return `category:${params.get('category')}`;
      if (params.get('sort') === 'newest') return 'new';
      if (params.get('sort') === 'best-sellers') return 'best';
      return 'shop';
    }
    return null;
  });

  /** On the home page the header floats over the full-bleed hero and only turns solid once the page scrolls. */
  readonly overlay = computed(() => this.active() === 'home');

  readonly categoryTiles = computed(() => {
    const counts = this.products.categoryCounts();
    return PRODUCT_CATEGORIES.map((category: ProductCategory) => ({ category, count: counts.get(category) ?? 0 }));
  });

  constructor() {
    // Close the mega menu after any navigation.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.menuOpen.set(false));
  }

  /** Mouse users get hover-to-open; touch/pen users open and close the menu by tapping. */
  hover(event: PointerEvent, open: boolean): void {
    if (event.pointerType !== 'mouse') return;
    this.hoverOpened = open;
    this.menuOpen.set(open);
  }

  toggleMenu(): void {
    // A click right after hover-open must not close the menu the mouse is already showing.
    if (this.hoverOpened) {
      this.hoverOpened = false;
      this.menuOpen.set(true);
      return;
    }
    this.menuOpen.update((open) => !open);
  }

  private hoverOpened = false;

  onScroll(): void {
    this.compact.set(window.scrollY > 48);
  }

  onDocumentClick(event: MouseEvent): void {
    const menu = (this.host.nativeElement as HTMLElement).querySelector('[data-category-menu]');
    if (this.menuOpen() && menu && !menu.contains(event.target as Node)) this.menuOpen.set(false);
  }

  search(value: string): void {
    const q = value.trim();
    void this.router.navigate(['/shop'], { queryParams: q ? { q } : {} });
  }

  signOut(): void {
    this.auth.logout();
    this.toast.show('You have been signed out.', 'info');
    void this.router.navigateByUrl('/');
  }
}

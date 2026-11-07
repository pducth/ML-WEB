import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { PortalDirective } from '../../ui/portal.directive';
import { filter, map } from 'rxjs';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ProductService } from '../../../core/services/product.service';
import { SettingsService } from '../../../core/services/settings.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';

type NavKey = 'home' | 'best' | 'new' | 'quiz' | 'story' | 'shop' | `category:${string}` | null;

/** Storefront header (customers only): promo strip, brand bar with search & account, and the shop navigation. */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgClass, RouterLink, PortalDirective],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:scroll)': 'onScroll()', '(document:click)': 'onDocumentClick($event)', '(document:keydown.escape)': 'menuOpen.set(false); aboutOpen.set(false)', '(window:resize)': 'aboutOpen.set(false)' },
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly products = inject(ProductService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly cart = inject(CartService);
  readonly wishlist = inject(WishlistService);
  readonly settings = inject(SettingsService).settings;

  readonly user = this.auth.currentUser;
  readonly firstName = computed(() => this.user()?.fullName.split(' ').filter(Boolean).slice(-1)[0] ?? '');
  /** The promo strip folds away once the page scrolls so the sticky header stays compact. */
  readonly compact = signal(false);
  readonly menuOpen = signal(false);

  /** The About menu: the story, the three policies and the FAQs. */
  readonly aboutLinks: Array<{ id: string; label: string; path: string; params: { tab: string } | null }> = [
    { id: 'about', label: 'About Us', path: '/about', params: { tab: 'about' } },
    { id: 'shipping', label: 'Sales & Shipping', path: '/about', params: { tab: 'shipping' } },
    { id: 'returns', label: 'Returns & Refunds', path: '/about', params: { tab: 'returns' } },
    { id: 'privacy', label: 'Privacy Policy', path: '/about', params: { tab: 'privacy' } },
    { id: 'faq', label: 'FAQs', path: '/faq', params: null },
  ];
  /** Which About page is showing, to mark it in the menu. */
  readonly aboutActive = computed(() => {
    const tree = this.router.parseUrl(this.url());
    const path = '/' + (tree.root.children['primary']?.segments.map((seg) => seg.path).join('/') ?? '');
    if (path === '/faq') return 'faq';
    return path === '/about' ? (tree.queryParamMap.get('tab') ?? 'about') : '';
  });
  readonly aboutOpen = signal(false);
  readonly aboutPos = signal({ top: 0, left: 0 });

  toggleAbout(trigger: HTMLElement): void {
    if (this.aboutOpen()) {
      this.aboutOpen.set(false);
      return;
    }
    const rect = trigger.getBoundingClientRect();
    this.aboutPos.set({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - 238)) });
    this.menuOpen.set(false);
    this.aboutOpen.set(true);
  }

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  /** The text the search box should show: the active query on the shop page, empty everywhere else. */
  private readonly searchText = computed(() => {
    const tree = this.router.parseUrl(this.url());
    const path = '/' + (tree.root.children['primary']?.segments.map((s) => s.path).join('/') ?? '');
    return path === '/shop' ? (tree.queryParamMap.get('q') ?? '') : '';
  });

  /** Which navigation entry matches the current URL (shop links differ only by query params). */
  readonly active = computed<NavKey>(() => {
    const tree = this.router.parseUrl(this.url());
    const path = '/' + (tree.root.children['primary']?.segments.map((s) => s.path).join('/') ?? '');
    const params = tree.queryParamMap;
    if (path === '/') return 'home';
    if (path.startsWith('/quiz')) return 'quiz';
    if (path === '/about' || path === '/faq') return 'story';
    if (path === '/shop') {
      if (params.get('category')) return `category:${params.get('category')}`;
      if (params.get('sort') === 'newest') return 'new';
      if (params.get('sort') === 'best-sellers') return 'best';
      return 'shop';
    }
    return null;
  });

  /** The About page opens on a full-bleed video: the header floats over it in white. */
  readonly overVideo = computed(() => {
    const tree = this.router.parseUrl(this.url());
    const path = '/' + (tree.root.children['primary']?.segments.map((s) => s.path).join('/') ?? '');
    const tab = tree.queryParamMap.get('tab');
    return path === '/about' && (!tab || tab === 'about');
  });

  /** On the home page and over the About video the header floats over the hero and turns solid once the page scrolls. */
  readonly overlay = computed(() => this.active() === 'home' || this.overVideo());

  readonly categoryTiles = computed(() => {
    const counts = this.products.categoryCounts();
    return PRODUCT_CATEGORIES.map((category: ProductCategory) => ({ category, count: counts.get(category) ?? 0 }));
  });

  constructor() {
    // Close the mega menu after any navigation.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen.set(false);
      this.aboutOpen.set(false);
    });
    // The box follows the URL (reset when leaving the shop) and is cleared whenever the shopper signs in or out.
    effect(() => {
      const box = this.searchBox()?.nativeElement;
      const text = this.searchText();
      this.url(); // every navigation resets the box
      this.user();
      if (box) box.value = text;
    });
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

  async signOut(): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Sign out?', message: 'You will need to sign in again to see your orders and Hair Profile.', confirmLabel: 'Yes, sign out', cancelLabel: 'No, stay', danger: true });
    if (!ok) return;
    this.auth.logout();
    this.toast.show('You have been signed out.', 'info');
    void this.router.navigateByUrl('/');
  }
}

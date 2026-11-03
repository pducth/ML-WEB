import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet, type ActivatedRouteSnapshot } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { MockDbService } from '../../data/mock-db.service';
import { OrderStatus } from '../../models';
import { AdminAuthService } from '../../services/admin-auth.service';
import { InventoryService } from '../../services/inventory.service';

type NavIcon = 'dashboard' | 'forecast' | 'products' | 'inventory' | 'orders' | 'vouchers' | 'customers' | 'reviews' | 'settings';

const THEME_KEY = 'haircare-theme';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly store = inject(MockDbService);
  private readonly inventory = inject(InventoryService);

  readonly currentAdmin = this.admin.currentAdmin;
  readonly menuOpen = signal(false);
  readonly theme = signal<'light' | 'dark' | null>(this.readTheme());

  /** Read from the router state snapshot: child ActivatedRoutes have no snapshot while the layout is being created. */
  readonly title = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let r: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
        let title = 'Overview';
        while (r) {
          title = (r.data?.['screenTitle'] as string | undefined) ?? title;
          r = r.firstChild;
        }
        return title;
      }),
    ),
    { initialValue: 'Overview' },
  );

  readonly orderBadge = computed(
    () => this.store.db().orders.filter((o) => o.status === OrderStatus.Processing || o.status === OrderStatus.ReturnPending).length,
  );
  readonly stockBadge = computed(() => this.inventory.lowStock().length);

  readonly nav: Array<{ icon: NavIcon; label: string; route: string }> = [
    { icon: 'dashboard', label: 'Overview', route: '/admin/dashboard' },
    { icon: 'forecast', label: 'Revenue forecast', route: '/admin/forecast' },
    { icon: 'products', label: 'Products', route: '/admin/products' },
    { icon: 'inventory', label: 'Inventory', route: '/admin/inventory' },
    { icon: 'orders', label: 'Orders', route: '/admin/orders' },
    { icon: 'vouchers', label: 'Discount codes', route: '/admin/vouchers' },
    { icon: 'customers', label: 'Customers', route: '/admin/customers' },
    { icon: 'reviews', label: 'Reviews', route: '/admin/reviews' },
    { icon: 'settings', label: 'Settings', route: '/admin/settings' },
  ];

  toggleTheme(): void {
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = this.theme() ?? (prefersDark ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // theme still switches for this visit
    }
  }

  logout(): void {
    this.admin.logout();
    void this.router.navigateByUrl('/admin/login');
  }

  private readTheme(): 'light' | 'dark' | null {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === 'dark' || saved === 'light' ? saved : null;
    } catch {
      return null;
    }
  }
}

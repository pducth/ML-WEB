import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface AdminNavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly sidebarOpen = signal(false);
  readonly darkTheme = signal(false);
  readonly navItems: readonly AdminNavItem[] = [
    { label: 'Overview', route: '/admin/dashboard', icon: '▦' },
    { label: 'Revenue forecast', route: '/admin/forecasts', icon: '⌁' },
    { label: 'Products', route: '/admin/products', icon: '◇' },
    { label: 'Inventory', route: '/admin/inventory', icon: '▤' },
    { label: 'Orders', route: '/admin/orders', icon: '≡' },
    { label: 'Discount codes', route: '/admin/vouchers', icon: '%' },
    { label: 'Customers', route: '/admin/customers', icon: '♙' },
    { label: 'Reviews', route: '/admin/reviews', icon: '☆' },
    { label: 'Settings', route: '/admin/settings', icon: '⚙' },
  ];

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleTheme(): void {
    this.darkTheme.update((dark) => !dark);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { environment } from '../../../core/environment/environment';

interface DemoScreen {
  id: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-dev-tools-bar',
  standalone: true,
  templateUrl: './dev-tools-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevToolsBarComponent {
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);

  readonly enabled = environment.devTools;
  readonly role = computed(() => this.auth.role().toUpperCase());
  readonly isGuest = computed(() => this.auth.role() === 'Guest');
  readonly isCustomer = computed(() => this.auth.role() === 'Customer');
  readonly isAdmin = computed(() => this.auth.role() === 'Admin');
  readonly isLoggedIn = this.auth.isLoggedIn;

  readonly screens: DemoScreen[] = [
    { id: 'c01-home', label: 'C01 - Trang chủ (Homepage)', route: '/' },
    { id: 'c02-shop', label: 'C02 - Cửa hàng (Shop + Filters)', route: '/shop' },
    { id: 'c03-pdp', label: 'C03 - Chi tiết sản phẩm (PDP)', route: '/products/moro-009' },
    { id: 'c04-quiz', label: 'C04 - Hair Quiz (3 bước)', route: '/quiz' },
    { id: 'c05-routine', label: 'C05 - Kết quả Routine', route: '/quiz/results' },
    { id: 'c07-checkout', label: 'C07 - Thanh toán (Checkout)', route: '/checkout' },
    { id: 'c08-c09-success', label: 'C08/C09 - Đặt hàng thành công', route: '/order/success' },
    { id: 'c12-profile', label: 'C12 - Hồ sơ cá nhân (Gold Member)', route: '/profile' },
    { id: 'c13-orders', label: 'C13 - Lịch sử đơn hàng', route: '/orders' },
    { id: 'admin-dashboard', label: 'A01-A14 - Quản trị Admin', route: '/admin/dashboard' },
  ];

  openAuth(): void {
    this.auth.openAuthModal();
  }

  logout(): void {
    this.auth.logout().subscribe();
  }

  setRole(role: 'Guest' | 'Customer' | 'Admin'): void {
    this.auth.switchRole(role);
    if (role === 'Admin') {
      void this.router.navigateByUrl('/admin/dashboard');
    } else if (role === 'Customer') {
      void this.router.navigateByUrl('/profile');
    } else {
      void this.router.navigateByUrl('/');
    }
  }

  openCart(): void {
    this.cart.openDrawer();
  }

  navigateToScreen(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const screen = this.screens.find((item) => item.id === select.value);
    if (screen) {
      void this.router.navigateByUrl(screen.route);
    }
  }
}

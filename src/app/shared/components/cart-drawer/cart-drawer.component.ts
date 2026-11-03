import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/data/mock-db.service';
import { CART_ISSUE_TEXT, CartService, type CartLineView } from '../../../core/services/cart.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { UsdPipe } from '../../ui/usd.pipe';

/** C06 quick view — slide-over bag from the reference (#drawer-c06-cart). The full bag lives at /cart. */
@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [NgClass, RouterLink, UsdPipe],
  templateUrl: './cart-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cart.closeDrawer()' },
})
export class CartDrawerComponent {
  readonly cart = inject(CartService);
  readonly settings = inject(SettingsService).settings;
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly issueText = CART_ISSUE_TEXT;
  readonly couponError = signal('');

  changeQty(line: CartLineView, delta: number): void {
    try {
      this.cart.setQuantity(line.line.variantId, line.line.quantity + delta);
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  applyCoupon(code: string): void {
    try {
      const result = this.cart.applyVoucher(code);
      this.couponError.set('');
      this.toast.show(`${result.voucher!.code} applied — you save $${result.discount.toFixed(2)}.`);
    } catch (error) {
      this.couponError.set(errorMessage(error));
    }
  }

  go(url: string): void {
    this.cart.closeDrawer();
    void this.router.navigateByUrl(url);
  }
}

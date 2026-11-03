import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CART_ISSUE_TEXT, CartService, type CartLineView } from '../../../../core/services/cart.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

/** C06 — Shopping cart (guest session bag or account bag). */
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [NgClass, RouterLink, UsdPipe],
  templateUrl: './cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly issueText = CART_ISSUE_TEXT;
  readonly couponError = signal('');

  changeQty(line: CartLineView, value: number): void {
    try {
      this.cart.setQuantity(line.line.variantId, Math.floor(value));
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
}

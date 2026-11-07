import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { type ProductVariant } from '../../../../core/models';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CART_ISSUE_TEXT, CartService, type CartLineView } from '../../../../core/services/cart.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SizePickerComponent } from '../../../../shared/ui/size-picker.component';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

/** C06: Shopping cart (guest session bag or account bag). */
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [NgClass, RouterLink, UsdPipe, SizePickerComponent],
  templateUrl: './cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly issueText = CART_ISSUE_TEXT;
  readonly couponError = signal('');

  sizesOf(line: CartLineView): ProductVariant[] {
    return (line.product?.variants ?? []).filter((v) => v.forSale || v.id === line.line.variantId);
  }

  changeSize(line: CartLineView, variantId: string): void {
    try {
      this.cart.changeVariant(line.line.variantId, variantId);
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  async remove(line: CartLineView): Promise<void> {
    const name = line.product?.name ?? 'this item';
    const ok = await this.confirm.ask({ title: 'Remove this item?', message: `${name} will be taken out of your bag.`, confirmLabel: 'Yes, remove', cancelLabel: 'No, keep it', danger: true });
    if (ok) this.cart.remove(line.line.variantId);
  }

  async changeQty(line: CartLineView, value: number): Promise<void> {
    if (Math.floor(value) < 1) {
      await this.remove(line);
      return;
    }
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
      this.toast.show(`${result.voucher!.code} applied. You save $${result.discount.toFixed(2)}.`);
    } catch (error) {
      this.couponError.set(errorMessage(error));
    }
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { type ProductVariant } from '../../../core/models';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/data/mock-db.service';
import { CART_ISSUE_TEXT, CartService, type CartLineView } from '../../../core/services/cart.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { SizePickerComponent } from '../../ui/size-picker.component';
import { UsdPipe } from '../../ui/usd.pipe';

/** C06 quick view, slide-over bag from the reference (#drawer-c06-cart). The full bag lives at /cart. */
@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [NgClass, RouterLink, UsdPipe, SizePickerComponent],
  templateUrl: './cart-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cart.closeDrawer()' },
})
export class CartDrawerComponent {
  readonly cart = inject(CartService);
  readonly settings = inject(SettingsService).settings;
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  readonly issueText = CART_ISSUE_TEXT;
  readonly couponError = signal('');

  async remove(line: CartLineView): Promise<void> {
    const name = line.product?.name ?? 'this item';
    const ok = await this.confirm.ask({ title: 'Remove this item?', message: `${name} will be taken out of your bag.`, confirmLabel: 'Yes, remove', cancelLabel: 'No, keep it', danger: true });
    if (ok) this.cart.remove(line.line.variantId);
  }

  async changeQty(line: CartLineView, delta: number): Promise<void> {
    if (line.line.quantity + delta < 1) {
      await this.remove(line);
      return;
    }
    try {
      this.cart.setQuantity(line.line.variantId, line.line.quantity + delta);
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

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

  applyCoupon(code: string): void {
    try {
      const result = this.cart.applyVoucher(code);
      this.couponError.set('');
      this.toast.show(`${result.voucher!.code} applied. You save $${result.discount.toFixed(2)}.`);
    } catch (error) {
      this.couponError.set(errorMessage(error));
    }
  }

  go(url: string): void {
    this.cart.closeDrawer();
    void this.router.navigateByUrl(url);
  }
}

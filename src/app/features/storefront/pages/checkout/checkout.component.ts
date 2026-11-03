import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage, newId } from '../../../../core/data/mock-db.service';
import type { PaymentMethod } from '../../../../core/models';
import { AddressService, formatAddress, type AddressInput } from '../../../../core/services/address.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { OrderService } from '../../../../core/services/order.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

/** C07 — Checkout. Requires sign-in (authGuard). */
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [NgClass, FormsModule, RouterLink, UsdPipe],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  readonly user = inject(AuthService).currentUser;
  readonly settings = inject(SettingsService).settings;
  private readonly addressService = inject(AddressService);
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly addresses = this.addressService.mine;
  readonly formatAddress = formatAddress;
  readonly selectedAddressId = signal<string | 'new'>(this.addresses()[0]?.id ?? 'new');
  readonly paymentMethod = signal<PaymentMethod>('COD');
  readonly saveAddress = signal(true);
  readonly note = signal('');
  readonly placing = signal(false);
  readonly error = signal('');
  readonly couponError = signal('');
  readonly submitted = signal(false);
  /** One key per checkout visit: a double click or a retry after a lag cannot create two orders. */
  private readonly idempotencyKey = newId('checkout');

  readonly draft = signal<AddressInput>({
    label: 'Home',
    recipientName: this.user()?.fullName ?? '',
    phone: this.user()?.phone ?? '',
    street: '',
    ward: '',
    district: '',
    city: '',
    isDefault: false,
  });

  readonly canPlace = computed(() => this.cart.lines().length > 0 && !this.cart.hasBlockingIssues() && !this.placing() && !this.cart.voucher()?.error);

  updateDraft(field: keyof AddressInput, value: string): void {
    this.draft.update((d) => ({ ...d, [field]: value }));
  }

  applyCoupon(code: string): void {
    try {
      this.cart.applyVoucher(code);
      this.couponError.set('');
    } catch (error) {
      this.couponError.set(errorMessage(error));
    }
  }

  placeOrder(): void {
    if (!this.canPlace()) return;
    this.submitted.set(true);
    this.error.set('');
    this.placing.set(true);
    try {
      let shipping;
      if (this.selectedAddressId() === 'new') {
        const d = this.draft();
        if (!d.recipientName.trim() || !d.phone.trim() || !d.street.trim() || !d.city.trim()) {
          throw new Error('Please complete the recipient name, phone number, street address and city.');
        }
        shipping = { recipientName: d.recipientName, phone: d.phone, addressLine: formatAddress(d), note: this.note() };
      } else {
        const address = this.addresses().find((a) => a.id === this.selectedAddressId());
        if (!address) throw new Error('Please choose a delivery address.');
        shipping = { recipientName: address.recipientName, phone: address.phone, addressLine: formatAddress(address), note: this.note() };
      }
      const order = this.orders.placeOrder({ shipping, paymentMethod: this.paymentMethod(), idempotencyKey: this.idempotencyKey }, this.cart.voucherCode());
      this.cart.removeVoucher();
      if (this.selectedAddressId() === 'new' && this.saveAddress()) {
        try {
          this.addressService.save(this.draft());
        } catch {
          // The order is placed; an address-book validation issue must not block the redirect.
        }
      }
      void this.router.navigate(order.paymentMethod === 'BANK_TRANSFER' ? ['/payment', order.id] : ['/order-success', order.id], { replaceUrl: true });
    } catch (error) {
      this.error.set(errorMessage(error));
      this.toast.error(errorMessage(error));
      this.placing.set(false);
    }
  }
}

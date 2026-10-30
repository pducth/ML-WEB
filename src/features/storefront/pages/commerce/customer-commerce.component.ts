import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap, tap } from 'rxjs';
import type { Address } from '../../../../core/models/address.model';
import type { CartItem } from '../../../../core/models/cart-item.model';
import type { Order } from '../../../../core/models/order.model';
import { OrderStatus } from '../../../../core/models/order-status.model';
import type { PaymentMethod } from '../../../../core/models/payment.model';
import type { Product, ProductVariant } from '../../../../core/models/product.model';
import type { Voucher } from '../../../../core/models/voucher.model';
import { AddressService } from '../../../../core/services/address.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { OrderService } from '../../../../core/services/order.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { ProductService } from '../../../../core/services/product.service';
import { ToastService } from '../../../../core/services/toast.service';
import { VoucherService } from '../../../../core/services/voucher.service';

type CommercePage = 'cart' | 'checkout' | 'pending' | 'success' | 'orders' | 'order-detail';

interface CartLine {
  cartItem: CartItem;
  product: Product | null;
  variant: ProductVariant | null;
}

interface ShippingDraft {
  recipientName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  postalCode: string;
  country: string;
}

@Component({
  selector: 'app-customer-commerce',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  templateUrl: './customer-commerce.component.html',
  styleUrl: './customer-commerce.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerCommerceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cartApi = inject(CartService);
  private readonly productApi = inject(ProductService);
  private readonly orderApi = inject(OrderService);
  private readonly paymentApi = inject(PaymentService);
  private readonly addressApi = inject(AddressService);
  private readonly voucherApi = inject(VoucherService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly page = signal<CommercePage>('cart');
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly lines = signal<CartLine[]>([]);
  readonly unresolvedItemCount = signal(0);
  readonly orders = signal<Order[]>([]);
  readonly selectedOrder = signal<Order | null>(null);
  readonly addresses = signal<Address[]>([]);
  readonly selectedAddressId = signal('');
  readonly selectedVoucher = signal<Voucher | null>(null);
  readonly voucherCode = signal('');
  readonly paymentMethod = signal<PaymentMethod>('cash_on_delivery');
  readonly orderId = signal('');
  readonly shipping = signal<ShippingDraft>({
    recipientName: '',
    phone: '',
    street: '',
    district: '',
    city: '',
    postalCode: '',
    country: 'US',
  });
  readonly subtotal = computed(() => this.lines().reduce((sum, line) => sum + (line.variant?.price ?? 0) * line.cartItem.quantity, 0));
  readonly discount = computed(() => {
    const voucher = this.selectedVoucher();
    if (!voucher || this.subtotal() < voucher.minimumOrderAmount) return 0;
    const amount =
      voucher.discountType === 'percentage'
        ? this.subtotal() * voucher.discountValue / 100
        : voucher.discountValue;
    return Math.min(amount, voucher.maximumDiscount ?? Number.POSITIVE_INFINITY, this.subtotal());
  });
  readonly shippingFee = computed(() => this.subtotal() >= 35 ? 0 : this.subtotal() > 0 ? 5 : 0);
  readonly total = computed(() => Math.max(0, this.subtotal() - this.discount() + this.shippingFee()));
  readonly currentUser = this.auth.currentUser;

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.page.set((data['customerPage'] as CommercePage | undefined) ?? 'cart');
      this.errorMessage.set('');
      this.selectedOrder.set(null);
      this.orderId.set(this.route.snapshot.queryParamMap.get('id') ?? '');
      switch (this.page()) {
        case 'cart':
        case 'checkout':
          this.loadCart();
          if (this.page() === 'checkout') this.loadAddresses();
          break;
        case 'orders':
          this.loadOrders();
          break;
        case 'order-detail':
          this.loadOrder(this.route.snapshot.paramMap.get('orderId') ?? '');
          break;
        case 'pending':
        case 'success':
          this.loadOrder(this.orderId());
          break;
      }
    });
  }

  private loadCart(): void {
    this.loading.set(true);
    const userId = this.auth.currentUser()?.id ?? null;
    forkJoin({
      cartItems: this.cartApi.getItems(userId),
      products: this.productApi.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ cartItems, products }) => {
        const lines = cartItems.map((cartItem) => {
          const product = products.find((item) => item.id === cartItem.productId);
          const variant = product?.variants.find((item) => item.id === cartItem.variantId);
          return { cartItem, product: product ?? null, variant: variant ?? null };
        });
        this.lines.set(lines);
        this.unresolvedItemCount.set(lines.filter((line) => !line.product || !line.variant).length);
        this.loading.set(false);
        this.errorMessage.set(this.unresolvedItemCount() > 0
          ? 'Some cart items are no longer in the product catalog. Remove those items before checkout.'
          : '');
      },
      error: () => {
        this.errorMessage.set('Your cart could not be loaded. Please try again.');
        this.loading.set(false);
      },
    });
  }

  private loadAddresses(): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    this.addressApi.getForUser(userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (addresses) => {
        this.addresses.set(addresses);
        const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
        if (defaultAddress) {
          this.selectedAddressId.set(defaultAddress.id);
          this.shipping.set({
            recipientName: defaultAddress.recipientName,
            phone: defaultAddress.phone,
            street: defaultAddress.street,
            district: defaultAddress.district,
            city: defaultAddress.city,
            postalCode: defaultAddress.postalCode,
            country: defaultAddress.country,
          });
        }
      },
      error: () => this.toast.show('Saved addresses could not be loaded.', 'error'),
    });
  }

  updateShipping<K extends keyof ShippingDraft>(key: K, value: ShippingDraft[K]): void {
    this.shipping.update((address) => ({ ...address, [key]: value }));
    this.selectedAddressId.set('');
  }

  selectSavedAddress(addressId: string): void {
    this.selectedAddressId.set(addressId);
    const address = this.addresses().find((item) => item.id === addressId);
    if (address) {
      this.shipping.set({
        recipientName: address.recipientName,
        phone: address.phone,
        street: address.street,
        district: address.district,
        city: address.city,
        postalCode: address.postalCode,
        country: address.country,
      });
    }
  }

  updatePaymentMethod(value: string): void {
    if (value === 'card' || value === 'bank_transfer' || value === 'cash_on_delivery') {
      this.paymentMethod.set(value);
    }
  }

  applyVoucher(): void {
    const code = this.voucherCode().trim().toUpperCase();
    if (!code) {
      this.errorMessage.set('Enter a discount code.');
      return;
    }
    this.voucherApi.getByCode(code).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (vouchers) => {
        const voucher = vouchers.find((item) => item.active && item.code.toUpperCase() === code);
        if (!voucher) {
          this.errorMessage.set('This code is invalid or inactive.');
          this.selectedVoucher.set(null);
          return;
        }
        if (Date.now() < new Date(voucher.startsAt).getTime() || Date.now() > new Date(voucher.expiresAt).getTime()) {
          this.errorMessage.set('This discount code is outside its valid dates.');
          return;
        }
        if (voucher.usedCount >= voucher.usageLimit || this.subtotal() < voucher.minimumOrderAmount) {
          this.errorMessage.set(this.subtotal() < voucher.minimumOrderAmount ? 'Your order does not meet the minimum amount.' : 'This discount code has reached its usage limit.');
          return;
        }
        this.selectedVoucher.set(voucher);
        this.errorMessage.set('');
        this.toast.show(`Discount ${voucher.code} applied.`, 'success');
      },
      error: () => this.errorMessage.set('Discount codes could not be checked. Please try again.'),
    });
  }

  removeVoucher(): void {
    this.selectedVoucher.set(null);
    this.voucherCode.set('');
  }

  changeQuantity(line: CartLine, delta: number): void {
    if (!line.product || !line.variant) {
      this.errorMessage.set('This item is unavailable. Remove it from your cart to continue.');
      return;
    }
    const quantity = line.cartItem.quantity + delta;
    if (quantity < 1) {
      this.removeLine(line);
      return;
    }
    if (quantity > line.variant.available) {
      this.errorMessage.set(`Only ${line.variant.available} units of ${line.product.name} are available.`);
      return;
    }
    this.cartApi.updateQuantity(line.cartItem.id, quantity).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.refreshCartCount();
        this.loadCart();
      },
      error: () => this.errorMessage.set('Cart quantity could not be updated.'),
    });
  }

  removeLine(line: CartLine): void {
    this.cartApi.removeItem(line.cartItem.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.refreshCartCount();
        this.loadCart();
      },
      error: () => this.errorMessage.set('This item could not be removed from your cart.'),
    });
  }

  checkout(): void {
    const user = this.auth.currentUser();
    if (!user) {
      this.auth.openAuthModal('/checkout');
      void this.router.navigate(['/']);
      return;
    }
    if (!this.lines().length) {
      this.errorMessage.set('Your cart is empty.');
      return;
    }
    if (this.unresolvedItemCount() > 0) {
      this.errorMessage.set('Remove unavailable items from your cart before placing an order.');
      return;
    }
    const checkoutLines = this.lines().filter(
      (line): line is CartLine & { product: Product; variant: ProductVariant } =>
        line.product !== null && line.variant !== null,
    );
    const shipping = this.shipping();
    if (!shipping.recipientName.trim() || !shipping.phone.trim() || !shipping.street.trim() || !shipping.city.trim()) {
      this.errorMessage.set('Recipient, phone, street address, and city are required.');
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    const addressRequest = this.selectedAddressId()
      ? of(this.addresses().find((address) => address.id === this.selectedAddressId()))
      : this.addressApi.create({
          ...shipping,
          userId: user.id,
          isDefault: this.addresses().length === 0,
        });
    addressRequest.pipe(
      switchMap((address) => {
        if (!address) throw new Error('The selected delivery address is unavailable.');
        const now = new Date().toISOString();
        const order: Omit<Order, 'id'> = {
          orderNumber: `HCI-${Date.now()}`,
          userId: user.id,
          status: this.paymentMethod() === 'cash_on_delivery' ? OrderStatus.Processing : OrderStatus.PaymentPending,
          paymentId: '',
          shippingAddressId: address.id,
          items: checkoutLines.map(({ cartItem, product, variant }) => ({
            id: `item-${cartItem.id}`,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            volumeLabel: `${variant.volume}${variant.unit}`,
            imageUrl: product.imageUrl,
            unitPrice: variant.price,
            quantity: cartItem.quantity,
            lineTotal: variant.price * cartItem.quantity,
          })),
          subtotal: this.subtotal(),
          discountTotal: this.discount(),
          shippingFee: this.shippingFee(),
          total: this.total(),
          voucherCode: this.selectedVoucher()?.code,
          createdAt: now,
          updatedAt: now,
        };
        return this.orderApi.create(order).pipe(map((savedOrder) => ({ savedOrder, address })));
      }),
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ savedOrder }) => this.createPaymentAndFinish(savedOrder),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(error instanceof Error ? error.message : 'Your order could not be placed.');
      },
    });
  }

  private createPaymentAndFinish(order: Order): void {
    const now = new Date().toISOString();
    this.paymentApi.create({
      orderId: order.id,
      method: this.paymentMethod(),
      status: 'pending',
      amount: order.total,
      createdAt: now,
      updatedAt: now,
    }).pipe(
      switchMap((payment) => this.orderApi.update(order.id, { paymentId: payment.id })),
      switchMap(() => this.cartApi.clear(this.auth.currentUser()?.id ?? null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        const path = this.paymentMethod() === 'cash_on_delivery' ? '/order/success' : '/payment/pending';
        void this.router.navigate([path], { queryParams: { id: order.id } });
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set(`Order ${order.orderNumber} was created, but payment setup or cart cleanup failed. Contact support before submitting again.`);
      },
    });
  }

  private refreshCartCount(): void {
    this.cartApi.refreshItemCount(this.auth.currentUser()?.id ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.toast.show('The cart updated, but its item count could not be refreshed.', 'error'),
      });
  }

  private loadOrders(): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    this.loading.set(true);
    this.orderApi.getForUser(userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (orders) => {
        this.orders.set([...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Order history could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  private loadOrder(orderId: string): void {
    if (!orderId) {
      this.errorMessage.set('Order reference is missing.');
      return;
    }
    this.loading.set(true);
    this.orderApi.getById(orderId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (order) => {
        if (order.userId !== this.auth.currentUser()?.id) {
          this.errorMessage.set('This order is not available in your account.');
        } else {
          this.selectedOrder.set(order);
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Order details could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  statusClass(status: string): string {
    if (status === OrderStatus.Completed) return 'status success';
    if ([OrderStatus.Cancelled, OrderStatus.Returned].includes(status as OrderStatus)) return 'status danger';
    if ([OrderStatus.PaymentPending, OrderStatus.ReturnPending].includes(status as OrderStatus)) return 'status warning';
    return 'status';
  }
}

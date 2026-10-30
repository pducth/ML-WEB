import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, type Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';
import { ReferenceStoreService } from '../../../core/services/reference-store.service';
import { ToastService } from '../../../core/services/toast.service';
import type { CartItem } from '../../../core/models/cart-item.model';
import type { Product, ProductVariant } from '../../../core/models/product.model';
import type { ReferenceProduct, ReferenceStore } from '../../../core/models/reference-store.model';

interface CartLine {
  item: CartItem;
  name: string;
  image: string;
  size: string;
  price: number;
  currency: 'VND' | 'USD';
  maxAvailable: number;
}

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  templateUrl: './cart-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent {
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly productsApi = inject(ProductService);
  private readonly referenceStoreApi = inject(ReferenceStoreService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isOpen = this.cart.drawerOpen;
  readonly lines = signal<CartLine[]>([]);
  readonly isLoading = signal(false);
  readonly appliedCoupon = signal<ReferenceStore['coupons'][number] | null>(null);
  readonly itemCount = this.cart.itemCount;
  readonly subtotal = signal(0);
  readonly discount = signal(0);
  readonly shipping = signal(0);
  readonly total = signal(0);
  readonly freeShippingProgress = signal(0);
  readonly freeShippingRemaining = signal(800000);
  readonly allLinesAreVnd = signal(true);
  readonly couponCode = signal('');

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.loadItems();
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  close(): void {
    this.cart.closeDrawer();
  }

  navigateToShop(): void {
    void this.router.navigate(['/shop']);
  }

  updateCouponCode(event: Event): void {
    this.couponCode.set((event.target as HTMLInputElement).value);
  }

  changeQuantity(line: CartLine, delta: number): void {
    const quantity = line.item.quantity + delta;
    const request: Observable<unknown> =
      quantity < 1
        ? this.cart.removeItem(line.item.id)
        : this.cart.updateQuantity(line.item.id, Math.min(quantity, line.maxAvailable));

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.loadItems(),
      error: () => this.toast.show('Không thể cập nhật giỏ hàng. Vui lòng thử lại.', 'error'),
    });
  }

  remove(line: CartLine): void {
    this.cart.removeItem(line.item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.loadItems(),
      error: () => this.toast.show('Không thể xóa sản phẩm khỏi giỏ hàng.', 'error'),
    });
  }

  applyCoupon(): void {
    const code = this.couponCode().trim().toUpperCase();
    this.referenceStoreApi.getSnapshot().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (store) => {
        const coupon = store.coupons.find((candidate) => candidate.code === code);
        if (!coupon) {
          this.toast.show('Mã giảm giá không hợp lệ hoặc đã hết hạn!', 'error');
          return;
        }
        if (this.subtotal() < coupon.minOrder) {
          this.toast.show(
            `Đơn hàng tối thiểu ${coupon.minOrder.toLocaleString('vi-VN')}₫ để dùng mã này.`,
            'error',
          );
          return;
        }
        this.appliedCoupon.set(coupon);
        this.recalculate();
        this.toast.show(`Áp dụng mã ${coupon.code} thành công!`, 'success');
      },
      error: () => this.toast.show('Không thể tải mã giảm giá.', 'error'),
    });
  }

  formatPrice(amount: number, currency: CartLine['currency']): string {
    return currency === 'VND'
      ? `${amount.toLocaleString('vi-VN')}₫`
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  checkout(): void {
    this.close();
    void this.router.navigate(['/checkout']);
  }

  private loadItems(): void {
    this.isLoading.set(true);
    forkJoin({
      items: this.cart.getItems(this.auth.currentUser()?.id ?? null),
      products: this.productsApi.getAll(),
      reference: this.referenceStoreApi.getSnapshot(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ items, products, reference }) => {
          const legacyProducts = reference.products;
          this.lines.set(items.map((item) => this.toCartLine(item, products, legacyProducts)));
          this.isLoading.set(false);
          this.recalculate();
        },
        error: () => {
          this.isLoading.set(false);
          this.toast.show('Không thể tải giỏ hàng. Vui lòng thử lại.', 'error');
        },
      });
  }

  private toCartLine(item: CartItem, products: Product[], legacyProducts: ReferenceProduct[]): CartLine {
    const referenceProduct = legacyProducts.find((product) => product.id === item.productId);
    if (referenceProduct) {
      const size = item.variantId.slice(item.productId.length + 1);
      const variant = referenceProduct.sizes.find((candidate) => candidate.label === size);
      return {
        item,
        name: referenceProduct.name,
        image: referenceProduct.image,
        size,
        price: variant?.price ?? referenceProduct.price,
        currency: 'VND',
        maxAvailable: referenceProduct.stock,
      };
    }

    const product = products.find((candidate) => candidate.id === item.productId);
    const variant: ProductVariant | undefined = product?.variants.find(
      (candidate) => candidate.id === item.variantId,
    );
    return {
      item,
      name: product?.name ?? item.productId,
      image: product?.imageUrl ?? '',
      size: variant ? `${variant.volume}${variant.unit}` : 'Standard',
      price: variant?.price ?? 0,
      currency: 'USD',
      maxAvailable: variant?.available ?? item.quantity,
    };
  }

  private recalculate(): void {
    const lines = this.lines();
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.item.quantity, 0);
    const coupon = this.appliedCoupon();
    let discount = 0;
    if (coupon?.discountPercent) {
      discount = Math.round(subtotal * (coupon.discountPercent / 100));
    } else if (coupon?.discountAmount) {
      discount = coupon.discountAmount;
    }

    const isVnd = lines.every((line) => line.currency === 'VND');
    const freeShipThreshold = isVnd ? 800000 : 100;
    const shippingFee = subtotal >= freeShipThreshold || subtotal === 0 ? 0 : isVnd ? 35000 : 8;
    this.subtotal.set(subtotal);
    this.discount.set(discount);
    this.shipping.set(shippingFee);
    this.total.set(Math.max(0, subtotal - discount + shippingFee));
    this.freeShippingProgress.set(Math.min(100, Math.round((subtotal / freeShipThreshold) * 100)));
    this.freeShippingRemaining.set(Math.max(0, freeShipThreshold - subtotal));
    this.allLinesAreVnd.set(isVnd);
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { OrderStatus } from '../../../../core/models/order-status.model';
import type { Order } from '../../../../core/models/order.model';
import type { Product } from '../../../../core/models/product.model';
import type { ReferenceAdminKPI, ReferenceOrder, ReferenceStore } from '../../../../core/models/reference-store.model';
import { OrderService } from '../../../../core/services/order.service';
import { ProductService } from '../../../../core/services/product.service';
import { ReferenceStoreService } from '../../../../core/services/reference-store.service';
import { ToastService } from '../../../../core/services/toast.service';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, StatusBadgeComponent],
  templateUrl: './admin-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private readonly productsApi = inject(ProductService);
  private readonly referenceStoreApi = inject(ReferenceStoreService);
  private readonly ordersApi = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly kpi = signal<ReferenceAdminKPI | null>(null);
  readonly orders = signal<ReferenceOrder[]>([]);
  readonly products = signal<Product[]>([]);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    forkJoin({
      store: this.referenceStoreApi.getSnapshot(),
      products: this.productsApi.getAll(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ store, products }) => {
          this.kpi.set(store.adminKPI);
          this.orders.set(store.orders);
          this.products.set(products);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải dữ liệu quản trị.');
          this.isLoading.set(false);
        },
      });
  }

  openAddProductModal(): void {
    this.productsApi.openAddProductModal();
  }

  showOrderDetails(order: ReferenceOrder): void {
    const mappedStatus =
      order.status === 'shipping'
        ? OrderStatus.Shipping
        : order.status === 'completed'
          ? OrderStatus.Completed
          : OrderStatus.Processing;
    const [day, month, year] = order.date.split('/').map(Number);
    const createdAt = new Date(Date.UTC(year, month - 1, day)).toISOString();
    const converted: Order = {
      id: order.id,
      orderNumber: order.id,
      userId: 'user-reference-customer',
      status: mappedStatus,
      paymentId: '',
      shippingAddressId: '',
      items: order.items.map((item, index) => {
        const nameAndVolume = item.name.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
        return {
          id: `${order.id}-${index}`,
          productId: '',
          variantId: '',
          productName: nameAndVolume?.[1] ?? item.name,
          volumeLabel: nameAndVolume?.[2] ?? '',
          imageUrl: '',
          unitPrice: item.price,
          quantity: item.qty,
          lineTotal: item.price * item.qty,
        };
      }),
      subtotal: order.total + order.discount - order.shippingFee,
      discountTotal: order.discount,
      shippingFee: order.shippingFee,
      total: order.total,
      createdAt,
      updatedAt: createdAt,
    };
    this.ordersApi.openDetails(converted, 'VND');
  }

  statusFor(order: ReferenceOrder): OrderStatus {
    if (order.status === 'shipping') {
      return OrderStatus.Shipping;
    }
    if (order.status === 'completed') {
      return OrderStatus.Completed;
    }
    return OrderStatus.Processing;
  }

  deleteProduct(product: Product): void {
    this.productsApi.delete(product.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.products.update((products) => products.filter((item) => item.id !== product.id));
        this.toast.show(`Đã xóa sản phẩm: ${product.name}`, 'info');
      },
      error: () => this.toast.show('Không thể xóa sản phẩm.', 'error'),
    });
  }
}

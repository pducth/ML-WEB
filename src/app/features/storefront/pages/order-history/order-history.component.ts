import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ORDER_STATUSES, OrderStatus } from '../../../../core/models';
import { OrderService } from '../../../../core/services/order.service';
import { OrderStatusPillComponent } from '../../../../shared/ui/order-status-pill.component';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

/** C14 — Order history with the 7 standard order statuses. */
@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [NgClass, DatePipe, RouterLink, UsdPipe, OrderStatusPillComponent],
  template: `
    <section class="app-screen animate-fadeIn">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="text-xs text-[#85968E] mb-6 flex items-center gap-2">
          <a routerLink="/" class="hover:text-[#19594A] cursor-pointer">Home</a>
          <span>/</span>
          <a routerLink="/profile" class="hover:text-[#19594A] cursor-pointer">Account</a>
          <span>/</span>
          <span class="text-[#0F3D32] font-semibold">Order History</span>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#DCE5E0] gap-4">
          <div>
            <h2 class="text-2xl font-extrabold text-[#0F3D32]">Order History</h2>
            <p class="text-xs text-[#5E6F68] mt-1">Track your past purchases and shipment delivery status.</p>
          </div>
          <a routerLink="/shop" class="btn-primary text-xs px-5 py-2.5">Continue Shopping</a>
        </div>

        <div class="flex gap-2 flex-wrap mt-6" role="tablist" aria-label="Filter by status">
          @for (option of filters; track option) {
            <button type="button" role="tab" [attr.aria-selected]="filter() === option" (click)="filter.set(option)"
              class="px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all"
              [ngClass]="filter() === option ? 'bg-[#19594A] text-white border-[#19594A]' : 'border-[#DCE5E0] text-[#0F3D32] bg-white hover:border-[#19594A]'">
              {{ option }} <span class="opacity-70">({{ count(option) }})</span>
            </button>
          }
        </div>

        <div class="mt-6 space-y-4">
          @for (order of visible(); track order.id) {
            <div class="bg-white rounded-2xl border border-[#DCE5E0] p-5 shadow-sm hover:border-[#4F7F72] transition-all">
              <div class="flex flex-wrap items-center justify-between pb-4 border-b border-[#DCE5E0] gap-2">
                <div>
                  <div class="flex items-center gap-3 flex-wrap">
                    <span class="font-bold text-[#0F3D32] text-base">Order #{{ order.code }}</span>
                    <app-order-status-pill [status]="order.status" />
                  </div>
                  <p class="text-xs text-[#85968E] mt-0.5">Date: {{ order.createdAt | date: 'mediumDate' }} • {{ order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Bank Transfer' }} · {{ order.paymentStatus }}</p>
                </div>
                <div class="text-right">
                  <span class="text-xs text-[#5E6F68]">Total:</span>
                  <div class="text-base font-bold text-[#19594A]">{{ order.total | usd }}</div>
                </div>
              </div>
              <div class="py-4 flex items-center gap-3 flex-wrap">
                @for (item of order.items.slice(0, 4); track item.variantId) {
                  <img [src]="item.imageUrl" [alt]="item.productName" [title]="item.productName" class="w-12 h-12 rounded-lg object-cover border border-[#DCE5E0]" />
                }
                <span class="text-sm text-[#0F3D32] font-medium">{{ itemCount(order.items) }} item{{ itemCount(order.items) > 1 ? 's' : '' }}</span>
              </div>
              <div class="pt-3 border-t border-[#DCE5E0] flex items-center justify-between gap-3 flex-wrap">
                <span class="text-xs text-[#5E6F68] truncate max-w-[280px]">Ship to: {{ order.shipping.addressLine }}</span>
                <div class="flex gap-2">
                  @if (order.status === pending) {
                    <a [routerLink]="['/payment', order.id]" class="btn-cta-buy text-xs px-4 py-2">Pay Now</a>
                  }
                  <a [routerLink]="['/orders', order.id]" class="text-xs font-bold text-[#19594A] hover:text-[#0F3D32] px-4 py-2 rounded-full border border-[#19594A] hover:bg-[#19594A]/5 transition-all">View Details &amp; Track</a>
                </div>
              </div>
            </div>
          } @empty {
            <div class="py-16 text-center bg-white rounded-3xl border border-[#DCE5E0]">
              <p class="font-bold text-[#0F3D32]">{{ filter() === 'All' ? 'No orders yet.' : 'No ' + filter() + ' orders.' }}</p>
              <p class="text-sm text-[#5E6F68] mt-1">Your next hair ritual is waiting.</p>
              <a routerLink="/shop" class="btn-primary text-sm px-6 py-2.5 mt-5">Explore Products</a>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistoryComponent {
  private readonly orders = inject(OrderService).myOrders;
  readonly pending = OrderStatus.PaymentPending;
  readonly filters: Array<OrderStatus | 'All'> = ['All', ...ORDER_STATUSES];
  readonly filter = signal<OrderStatus | 'All'>('All');
  readonly visible = computed(() => (this.filter() === 'All' ? this.orders() : this.orders().filter((o) => o.status === this.filter())));

  count(option: OrderStatus | 'All'): number {
    return option === 'All' ? this.orders().length : this.orders().filter((o) => o.status === option).length;
  }

  itemCount(items: Array<{ quantity: number }>): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }
}

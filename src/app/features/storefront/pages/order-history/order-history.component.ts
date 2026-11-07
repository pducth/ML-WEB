import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderStatus } from '../../../../core/models';
import { OrderService } from '../../../../core/services/order.service';
import { OrderStatusPillComponent } from '../../../../shared/ui/order-status-pill.component';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

type TabId = 'all' | 'processing' | 'shipping' | 'completed' | 'closed';

/** The statuses a shopper actually follows; cancelled and returned orders share one "Cancelled & returns" tab. */
const TABS: Array<{ id: TabId; label: string; statuses: OrderStatus[] }> = [
  { id: 'all', label: 'All', statuses: [] },
  { id: 'processing', label: 'Processing', statuses: [OrderStatus.Processing] },
  { id: 'shipping', label: 'Shipping', statuses: [OrderStatus.Shipping] },
  { id: 'completed', label: 'Completed', statuses: [OrderStatus.Completed] },
  { id: 'closed', label: 'Cancelled & returns', statuses: [OrderStatus.Cancelled, OrderStatus.ReturnPending, OrderStatus.Returned] },
];

/** C14: Order history, filtered by the statuses a shopper follows. */
@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [NgClass, DatePipe, RouterLink, UsdPipe, OrderStatusPillComponent],
  template: `
    <section class="app-screen animate-fadeIn">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <nav class="text-xs text-[#85968E] mb-8 flex items-center gap-2" aria-label="Breadcrumb">
          <a routerLink="/" class="hover:text-[#19594A]">Home</a>
          <span>/</span>
          <a routerLink="/profile" class="hover:text-[#19594A]">Account</a>
          <span>/</span>
          <span class="text-[#0F3D32] font-semibold">Order History</span>
        </nav>

        <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-8 border-b border-[#DCE5E0]">
          <div>
            <span class="fm-eyebrow">Orders</span>
            <h1 class="fm-display text-3xl sm:text-4xl text-[#0F3D32] leading-tight mt-1">Order history</h1>
            <p class="text-sm text-[#5E6F68] mt-2">Follow each order from payment to delivery.</p>
          </div>
          <a routerLink="/shop" class="btn-secondary text-xs px-5 py-2.5 self-start sm:self-auto">Continue shopping</a>
        </header>

        <div class="flex gap-x-7 gap-y-2 flex-wrap border-b border-[#DCE5E0]" role="tablist" aria-label="Filter by status">
          @for (tab of tabs; track tab.id) {
            <button type="button" role="tab" [attr.aria-selected]="filter() === tab.id" (click)="filter.set(tab.id)"
              class="relative py-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors"
              [ngClass]="filter() === tab.id ? 'text-[#0F3D32]' : 'text-[#85968E] hover:text-[#0F3D32]'">
              {{ tab.label }}@if (count(tab.id) > 0) { <span class="ml-1.5 font-semibold text-[#4F7F72]">{{ count(tab.id) }}</span> }
              @if (filter() === tab.id) { <span class="absolute left-0 right-0 -bottom-px h-[2px] bg-[#0F3D32]"></span> }
            </button>
          }
        </div>

        <div class="mt-8">
          @if (visible().length) {
          <ul class="bg-white border border-[#DCE5E0] divide-y divide-[#DCE5E0]">
          @for (order of visible(); track order.id) {
            <li class="flex items-center gap-4 sm:gap-6 px-5 sm:px-6 py-4 transition-colors hover:bg-[#F7F8F4]">
              <div class="relative w-14 h-14 shrink-0">
                <img [src]="order.items[0].imageUrl" [alt]="order.items[0].productName" class="w-full h-full object-cover bg-[#F0F3EF]" />
                @if (order.items.length > 1) {
                  <span class="absolute -bottom-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 bg-[#0F3D32] text-white text-[10px] font-bold flex items-center justify-center">+{{ order.items.length - 1 }}</span>
                }
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
                  <h2 class="fm-display text-lg text-[#0F3D32] whitespace-nowrap sm:w-[262px] sm:shrink-0">Order #{{ order.code }}</h2>
                  <app-order-status-pill [status]="order.status" [compact]="true" />
                </div>
                <p class="text-xs text-[#85968E] mt-1">{{ order.createdAt | date: 'mediumDate' }}</p>
              </div>
              <span class="fm-display text-lg text-[#0F3D32] w-24 text-right shrink-0 hidden sm:block">{{ order.total | usd }}</span>
              <a [routerLink]="['/orders', order.id]" class="btn-secondary text-xs !px-4 !py-2 w-[132px] text-center shrink-0 hidden md:inline-flex justify-center">View details</a>
              <a [routerLink]="['/orders', order.id]" class="md:hidden text-[#0F3D32] shrink-0" aria-label="View details"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></a>
            </li>
          }
          </ul>
          } @else {
            <div class="py-20 text-center bg-white border border-[#DCE5E0]">
              <span class="fm-eyebrow">{{ filter() === 'all' ? 'No orders yet' : 'Nothing here' }}</span>
              <p class="fm-display text-2xl text-[#0F3D32] mt-2">{{ filter() === 'all' ? 'Your next hair ritual is waiting.' : 'No orders in this status.' }}</p>
              <a routerLink="/shop" class="btn-primary text-sm px-7 py-3 mt-6 inline-flex">Explore products</a>
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
  readonly tabs = TABS;
  readonly filter = signal<TabId>('all');
  readonly visible = computed(() => this.inTab(this.filter()));

  count(tab: TabId): number {
    return this.inTab(tab).length;
  }

  itemCount(items: Array<{ quantity: number }>): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  private inTab(tab: TabId) {
    const statuses = TABS.find((t) => t.id === tab)?.statuses ?? [];
    return statuses.length ? this.orders().filter((o) => statuses.includes(o.status)) : this.orders();
  }
}

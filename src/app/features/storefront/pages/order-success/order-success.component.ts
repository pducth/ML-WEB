import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

/** C09: Order success / thank-you receipt. */
@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [RouterLink, UsdPipe],
  template: `
    <section class="app-screen animate-fadeIn">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        @if (order(); as o) {
          <header class="text-center">
            <span class="fm-eyebrow block">Order confirmed</span>
            <h1 class="fm-display text-3xl sm:text-5xl text-[#0F3D32] mt-2 leading-tight">Thank you for choosing FOLMARÉ</h1>
            <p class="text-sm sm:text-base text-[#5E6F68] mt-4">Order <strong class="text-[#0F3D32] font-semibold">#{{ o.code }}</strong></p>
          </header>

          <div class="mt-12 grid lg:grid-cols-[1.4fr_1fr] bg-white border border-[#DCE5E0]">
            <!-- Items and totals -->
            <div class="p-6 sm:p-8">
              <span class="fm-eyebrow">Order summary</span>
              <ul class="mt-4 divide-y divide-[#DCE5E0] border-y border-[#DCE5E0]">
                @for (item of o.items; track item.variantId) {
                  <li class="py-4 flex items-center justify-between gap-4">
                    <div class="flex items-center gap-4 min-w-0">
                      <img [src]="item.imageUrl" alt="" class="w-14 h-14 object-cover bg-[#F0F3EF] shrink-0" />
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-[#0F3D32] line-clamp-1">{{ item.productName }}</p>
                        <p class="text-xs text-[#5E6F68] mt-0.5">{{ item.sizeLabel }} · Qty {{ item.quantity }}</p>
                      </div>
                    </div>
                    <span class="text-sm font-semibold text-[#0F3D32] shrink-0">{{ item.lineTotal | usd }}</span>
                  </li>
                }
              </ul>
              <dl class="mt-4 space-y-2 text-sm text-[#5E6F68]">
                <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ o.subtotal | usd }}</dd></div>
                @if (o.discount) { <div class="flex justify-between text-[#19594A]"><dt>Voucher {{ o.voucherCode }}</dt><dd>-{{ o.discount | usd }}</dd></div> }
                <div class="flex justify-between"><dt>Shipping</dt><dd>{{ o.shippingFee | usd }}</dd></div>
                <div class="flex justify-between items-baseline pt-3 border-t border-[#DCE5E0]"><dt class="text-[#0F3D32] font-semibold">Total</dt><dd class="fm-display text-2xl text-[#0F3D32]">{{ o.total | usd }}</dd></div>
              </dl>
            </div>

            <!-- Delivery and payment -->
            <div class="relative overflow-hidden p-6 sm:p-8 text-white bg-gradient-to-br from-[#082A22] via-[#0F3D32] to-[#3F7F6B] space-y-7">
              <div class="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#9CC3B4]/20 blur-3xl pointer-events-none" aria-hidden="true"></div>
              <div class="relative">
                <span class="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B7D3C7]">Delivering to</span>
                <p class="fm-display text-xl mt-3">{{ o.shipping.recipientName }}</p>
                <p class="text-sm text-white/85 mt-0.5">{{ o.shipping.phone }}</p>
                <p class="text-sm text-white/85 mt-2 leading-relaxed">{{ o.shipping.addressLine }}</p>
                <p class="text-xs font-semibold text-[#B7D3C7] mt-3">Estimated delivery: 3–5 business days</p>
              </div>
              <div class="relative pt-7 border-t border-white/20">
                <span class="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B7D3C7]">Payment</span>
                <p class="fm-display text-xl mt-3">{{ o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Bank transfer' }}</p>
                <p class="text-sm text-white/85 mt-0.5">{{ o.paymentStatus }}</p>
              </div>
              <div class="relative pt-7 border-t border-white/20">
                <span class="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B7D3C7]">Status</span>
                <p class="fm-display text-xl mt-3 flex items-center gap-2.5"><span class="w-2.5 h-2.5 rounded-full bg-[#9CC3B4]" aria-hidden="true"></span>{{ o.status }}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-4 mt-10">
            <a [routerLink]="['/orders', o.id]" class="btn-primary text-sm px-7 py-3">View order details</a>
            <a routerLink="/shop" class="btn-secondary text-sm px-7 py-3">Continue shopping</a>
          </div>
        } @else {
          <div class="text-center py-10">
            <span class="fm-eyebrow">Not found</span>
            <h1 class="fm-display text-3xl text-[#0F3D32] mt-2">Order not found</h1>
            <a routerLink="/orders" class="btn-primary text-sm px-6 py-3 mt-6 inline-flex">Go to order history</a>
          </div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSuccessComponent {
  private readonly orders = inject(OrderService);
  readonly orderId = input.required<string>();
  readonly order = computed(() => this.orders.getMine(this.orderId()));
}

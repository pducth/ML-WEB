import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { OrderStatusPillComponent } from '../../../../shared/ui/order-status-pill.component';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

/** C09 — Order success / thank-you receipt. */
@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [RouterLink, UsdPipe, OrderStatusPillComponent],
  template: `
    <section class="app-screen animate-fadeIn">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-8">
        @if (order(); as o) {
          <div>
            <span class="badge-teal">ORDER CONFIRMED</span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-[#0F3D32] mt-2">Thank you for choosing FOLMARÉ</h2>
            <p class="text-sm text-[#5E6F68] mt-2">Your order reference is <strong class="text-[#19594A] font-bold text-base">#{{ o.code }}</strong>.</p>
            <p class="text-sm text-[#5E6F68] mt-2 flex items-center justify-center gap-2 flex-wrap">
              Status: <app-order-status-pill [status]="o.status" /> · Payment:
              <span class="font-semibold text-[#0F3D32]">{{ o.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Bank Transfer' }} ({{ o.paymentStatus }})</span>
            </p>
          </div>

          <div class="bg-white p-6 sm:p-8 rounded-3xl border border-[#DCE5E0] shadow-md text-left max-w-lg mx-auto space-y-4">
            <h3 class="text-sm font-bold uppercase tracking-wider text-[#19594A] border-b border-[#DCE5E0] pb-2">Order Summary</h3>
            <div class="space-y-2">
              @for (item of o.items; track item.variantId) {
                <div class="flex items-center justify-between text-sm gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <img [src]="item.imageUrl" alt="" class="w-10 h-10 object-cover rounded-lg border border-[#DCE5E0] shrink-0" />
                    <span class="text-[#0F3D32] font-medium line-clamp-1">{{ item.productName }} <span class="text-xs text-[#85968E]">({{ item.sizeLabel }} × {{ item.quantity }})</span></span>
                  </div>
                  <span class="font-semibold text-[#19594A] shrink-0">{{ item.lineTotal | usd }}</span>
                </div>
              }
            </div>
            <div class="pt-3 border-t border-[#DCE5E0] space-y-1 text-xs text-[#5E6F68]">
              <div class="flex justify-between"><span>Subtotal</span><span>{{ o.subtotal | usd }}</span></div>
              @if (o.discount) { <div class="flex justify-between text-[#4F7F72]"><span>Voucher {{ o.voucherCode }}</span><span>-{{ o.discount | usd }}</span></div> }
              <div class="flex justify-between"><span>Shipping</span><span>{{ o.shippingFee | usd }}</span></div>
              <div class="flex justify-between text-base font-extrabold text-[#0F3D32] pt-1"><span>Total</span><span class="text-[#19594A]">{{ o.total | usd }}</span></div>
            </div>
            <div class="bg-[#F7F8F4] p-4 rounded-xl border border-[#DCE5E0]">
              <h4 class="text-xs font-bold uppercase tracking-wider text-[#5E6F68] mb-2">Delivering to</h4>
              <p class="text-sm font-semibold text-[#0F3D32]">{{ o.shipping.recipientName }} - {{ o.shipping.phone }}</p>
              <p class="text-xs text-[#5E6F68] mt-1">{{ o.shipping.addressLine }}</p>
              <p class="text-[11px] text-[#85968E] mt-1">Estimated delivery: 3–5 business days</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a [routerLink]="['/orders', o.id]" class="btn-primary text-sm px-6 py-3">View Order Details</a>
            <a routerLink="/" class="btn-secondary text-sm px-6 py-3">Continue Shopping</a>
          </div>
        } @else {
          <h2 class="text-2xl font-extrabold text-[#0F3D32]">Order not found</h2>
          <a routerLink="/orders" class="btn-primary text-sm px-6 py-3">Go to Order History</a>
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

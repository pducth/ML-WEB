import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MockDbService, errorMessage } from '../../../../core/data/mock-db.service';
import { OrderStatus } from '../../../../core/models';
import { ClockService } from '../../../../core/services/clock.service';
import { CartService } from '../../../../core/services/cart.service';
import { OrderService } from '../../../../core/services/order.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

const POLL_MS = 5000;

/** C08: Bank transfer awaiting payment (QR valid for the payment window, webhook/polling, sandbox simulation). Leaving the page drops the transfer. */
@Component({
  selector: 'app-payment-pending',
  standalone: true,
  imports: [RouterLink, UsdPipe],
  templateUrl: './payment-pending.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentPendingComponent {
  private readonly orders = inject(OrderService);
  private readonly store = inject(MockDbService);
  private readonly clock = inject(ClockService);
  private readonly toast = inject(ToastService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  readonly settings = inject(SettingsService).settings;

  readonly orderId = input.required<string>();
  readonly order = computed(() => this.orders.getMine(this.orderId()));
  readonly simulating = signal(false);
  readonly lastChecked = signal(Date.now());

  readonly remainingMs = computed(() => {
    const deadline = this.order()?.paymentDeadline;
    return deadline ? Math.max(0, Date.parse(deadline) - this.clock.now()) : 0;
  });
  readonly countdown = computed(() => {
    const total = Math.ceil(this.remainingMs() / 1000);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  });
  readonly expired = computed(() => this.order()?.status === OrderStatus.Cancelled);
  readonly urgent = computed(() => this.remainingMs() > 0 && this.remainingMs() < 5 * 60_000);

  constructor() {
    // Polling fallback (BR-PAY-04): re-read the persisted order every 5 s, next to the webhook path.
    const timer = setInterval(() => {
      this.store.syncFromStorage();
      this.orders.expireOverduePayments();
      this.lastChecked.set(Date.now());
    }, POLL_MS);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      // Leaving this page ends the transfer: the order is dropped and the bag stays as it was.
      this.orders.abandonPayment(this.orderId());
    });

    effect(() => {
      const order = this.order();
      if (order && order.paymentStatus === 'Paid' && order.status !== OrderStatus.Cancelled) {
        this.cart.removeVoucher();
        void this.router.navigate(['/order-success', order.id], { replaceUrl: true });
      }
    });
  }

  copy(text: string): void {
    void navigator.clipboard?.writeText(text).then(
      () => this.toast.show(`Copied ${text}`, 'info'),
      () => this.toast.error('Could not copy to the clipboard.'),
    );
  }

  /** Sandbox: plays the bank webhook with the exact reference and amount. */
  simulatePayment(): void {
    const order = this.order();
    if (!order?.paymentRef) return;
    this.simulating.set(true);
    try {
      this.orders.confirmPayment(order.paymentRef, order.total);
      this.toast.show('Payment received. Thank you!');
    } catch (error) {
      this.toast.error(errorMessage(error));
      this.simulating.set(false);
    }
  }
}

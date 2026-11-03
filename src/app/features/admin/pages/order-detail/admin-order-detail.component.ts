import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { OrderStatus } from '../../../../core/models';
import { ADMIN_CANCEL_REASONS, OrderService, RETURN_REJECT_REASONS } from '../../../../core/services/order.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';
import { AdminModalComponent } from '../../ui/admin-modal.component';
import { ORDER_BADGE, PAYMENT_BADGE } from '../../ui/badges';

type Dialog = 'cancel' | 'approve' | 'reject' | 'ship' | 'complete' | null;
const FLOW = [OrderStatus.PaymentPending, OrderStatus.Processing, OrderStatus.Shipping, OrderStatus.Completed];

/** A09 — Order detail & fulfilment. */
@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, UsdPipe, AdminModalComponent],
  templateUrl: './admin-order-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrderDetailComponent {
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly orderId = input.required<string>();
  readonly order = computed(() => this.orders.getById(this.orderId()));
  readonly badge = ORDER_BADGE;
  readonly paymentBadge = PAYMENT_BADGE;
  readonly cancelReasons = ADMIN_CANCEL_REASONS;
  readonly rejectReasons = RETURN_REJECT_REASONS;

  readonly dialog = signal<Dialog>(null);
  readonly reason = signal('');
  readonly storeFault = signal(false);
  readonly modalError = signal('');

  readonly steps = computed(() => {
    const order = this.order();
    if (!order) return [];
    const flow = order.paymentMethod === 'COD' ? FLOW.slice(1) : FLOW;
    const reached = new Set(order.timeline.map((t) => t.status));
    return flow.map((status) => ({ status, cls: order.status === status ? 'c' : reached.has(status) ? 'd' : '' }));
  });
  readonly canCancel = computed(() => (this.order() ? this.orders.canCancel(this.order()!) : false));
  readonly refundPreview = computed(() => (this.order() ? this.orders.refundFor(this.order()!, this.storeFault()) : 0));
  readonly timeline = computed(() => [...(this.order()?.timeline ?? [])].reverse());

  open(dialog: Dialog): void {
    this.reason.set('');
    this.modalError.set('');
    this.storeFault.set(this.order()?.returnRequest?.storeFault ?? false);
    this.dialog.set(dialog);
  }

  confirm(): void {
    const id = this.orderId();
    try {
      switch (this.dialog()) {
        case 'ship':
          this.orders.markShipping(id);
          this.toast.show('Status updated · On Hand and Reserved reduced');
          break;
        case 'complete':
          this.orders.markCompleted(id);
          this.toast.show('Order completed · customer can now review or request a return');
          break;
        case 'cancel':
          this.orders.cancel(id, this.reason());
          this.toast.show('Order cancelled · Reserved stock released', 'info');
          break;
        case 'approve':
          this.orders.approveReturn(id, this.storeFault());
          this.toast.show('Refund issued & items restocked');
          break;
        case 'reject':
          this.orders.rejectReturn(id, this.reason());
          this.toast.show('Return request rejected', 'info');
          break;
      }
      this.dialog.set(null);
    } catch (error) {
      this.modalError.set(errorMessage(error));
    }
  }
}

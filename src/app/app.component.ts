import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OrderService } from './core/services/order.service';
import { ToastService } from './core/services/toast.service';
import { ConfirmDialogComponent } from './shared/ui/confirm-dialog.component';
import { CartDrawerComponent } from './shared/components/cart-drawer/cart-drawer.component';
import { ToastComponent } from './shared/components/toast/toast.component';

/** How often the auto-cancellation job scans for overdue bank-transfer orders. */
const PAYMENT_EXPIRY_SCAN_MS = 10_000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, CartDrawerComponent, ConfirmDialogComponent],
  template: `
    <router-outlet></router-outlet>
    <app-cart-drawer></app-cart-drawer>
    <app-confirm-dialog></app-confirm-dialog>
    <!-- Tracking by id re-creates the toast so a repeated message restarts its timer. -->
    @for (id of [notifications.id()]; track id) {
      <app-toast
        [visible]="notifications.message() !== null"
        [message]="notifications.message() ?? ''"
        [variant]="notifications.variant()"
        [durationMs]="3600"
        (dismissed)="notifications.clear()"
      ></app-toast>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly notifications = inject(ToastService);

  constructor() {
    const orders = inject(OrderService);
    // BR-PAY-03: unpaid transfers past the 30-minute window are cancelled and their stock released.
    orders.expireOverduePayments();
    const timer = setInterval(() => orders.expireOverduePayments(), PAYMENT_EXPIRY_SCAN_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}

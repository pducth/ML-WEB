import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ToastService } from './core/services/toast.service';
import { CartDrawerComponent } from './shared/components/cart-drawer/cart-drawer.component';
import { AuthModalComponent } from './shared/components/auth-modal/auth-modal.component';
import { OrderDetailModalComponent } from './shared/components/order-detail-modal/order-detail-modal.component';
import { AddProductModalComponent } from './shared/components/add-product-modal/add-product-modal.component';
import { DevToolsBarComponent } from './shared/components/dev-tools-bar/dev-tools-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ToastComponent,
    CartDrawerComponent,
    AuthModalComponent,
    OrderDetailModalComponent,
    AddProductModalComponent,
    DevToolsBarComponent,
  ],
  template: `
    <router-outlet></router-outlet>
    <app-cart-drawer></app-cart-drawer>
    <app-auth-modal></app-auth-modal>
    <app-order-detail-modal></app-order-detail-modal>
    <app-add-product-modal></app-add-product-modal>
    <app-dev-tools-bar></app-dev-tools-bar>
    <app-toast
      [visible]="notifications.message() !== null"
      [message]="notifications.message() ?? ''"
      [variant]="notifications.variant()"
      [durationMs]="3200"
      (dismissed)="notifications.clear()"
    ></app-toast>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly notifications = inject(ToastService);
}

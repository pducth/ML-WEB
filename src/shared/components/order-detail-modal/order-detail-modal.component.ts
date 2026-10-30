import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-order-detail-modal',
  standalone: true,
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './order-detail-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailModalComponent {
  readonly orderService = inject(OrderService);

  close(): void {
    this.orderService.closeDetails();
  }
}

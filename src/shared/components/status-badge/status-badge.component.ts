import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { OrderStatus } from '../../../core/models/order-status.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input.required<OrderStatus>();
  readonly OrderStatus = OrderStatus;
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderStatus } from '../../core/models';

const CLASSES: Record<OrderStatus, string> = {
  [OrderStatus.PaymentPending]: 'bg-amber-100 text-[#805719]',
  [OrderStatus.Processing]: 'bg-[#4F7F72]/10 text-[#3B6B5E]',
  [OrderStatus.Shipping]: 'bg-blue-100 text-blue-700',
  [OrderStatus.Completed]: 'bg-green-100 text-green-700',
  [OrderStatus.Cancelled]: 'bg-gray-100 text-gray-600',
  [OrderStatus.ReturnPending]: 'bg-orange-100 text-orange-700',
  [OrderStatus.Returned]: 'bg-red-100 text-red-700',
};

@Component({
  selector: 'app-order-status-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap" [class]="classes()">{{ status() }}</span>`,
})
export class OrderStatusPillComponent {
  readonly status = input.required<OrderStatus>();
  readonly classes = computed(() => `text-xs px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${CLASSES[this.status()]}`);
}

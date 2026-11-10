import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderStatus } from '../../core/models';

const CLASSES: Record<OrderStatus, string> = {
  [OrderStatus.PaymentPending]: 'bg-[#FFF6E5] text-[#805719] border-[#F0D9A8]',
  [OrderStatus.Processing]: 'bg-[#EEF3EF] text-[#0F3D32] border-[#C5D6CC]',
  [OrderStatus.Shipping]: 'bg-[#E8F0F8] text-[#1F4E79] border-[#BCD3E8]',
  [OrderStatus.Completed]: 'bg-[#0F3D32] text-white border-[#0F3D32]',
  [OrderStatus.Cancelled]: 'bg-[#F3F3F1] text-[#5E6F68] border-[#DADDD8]',
  [OrderStatus.ReturnPending]: 'bg-[#FFF1EC] text-[#C9503A] border-[#FFCDBF]',
  [OrderStatus.Returned]: 'bg-[#FBEAEA] text-[#A33A3A] border-[#F1C4C4]',
};

const BASE = 'inline-block text-[11px] font-bold uppercase tracking-[0.1em] leading-none px-3 py-2 border whitespace-nowrap';
/** Smaller tag of one fixed width, so a column of them lines up in a list. */
const COMPACT = 'inline-block w-[116px] text-center text-[9px] font-bold uppercase tracking-[0.08em] leading-none px-2 py-1 border whitespace-nowrap';

@Component({
  selector: 'app-order-status-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="classes()">{{ status() }}</span>`,
})
export class OrderStatusPillComponent {
  readonly status = input.required<OrderStatus>();
  readonly compact = input(false);
  readonly classes = computed(() => `${this.compact() ? COMPACT : BASE} ${CLASSES[this.status()]}`);
}

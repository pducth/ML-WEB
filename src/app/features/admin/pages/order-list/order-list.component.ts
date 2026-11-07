import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ORDER_STATUSES, type OrderStatus } from '../../../../core/models';
import { normalizePhone } from '../../../../core/services/auth.service';
import { OrderService } from '../../../../core/services/order.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';
import { ORDER_BADGE, PAYMENT_BADGE } from '../../ui/badges';

const PAGE = 20;

/** A08: Order list. */
@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [DatePipe, RouterLink, UsdPipe],
  template: `
    <div class="chips" role="tablist" aria-label="Filter by status">
      @for (s of statuses; track s) {
        <button type="button" class="chip" role="tab" [class.on]="status() === s" [attr.aria-selected]="status() === s" (click)="status.set(s); page.set(1)">{{ s }} ({{ count(s) }})</button>
      }
    </div>
    <div class="tool">
      <input type="search" placeholder="Search by #HCI code, customer name or phone…" aria-label="Search orders" [value]="search()" (input)="search.set($any($event.target).value); page.set(1)" />
      <select aria-label="Payment method" (change)="method.set($any($event.target).value); page.set(1)">
        <option value="all">All methods</option><option value="COD">COD</option><option value="BANK_TRANSFER">Bank transfer</option>
      </select>
      <select aria-label="Payment status" (change)="payment.set($any($event.target).value); page.set(1)">
        <option value="all">All payments</option><option value="Unpaid">Unpaid</option><option value="Paid">Paid</option><option value="Refunded">Refunded</option>
      </select>
    </div>
    <div class="card">
      <div class="tw">
        <table>
          <tr><th>Order ID</th><th>Customer</th><th>Phone</th><th>Date</th><th>Payment</th><th>Paid</th><th>Total</th><th>Status</th><th></th></tr>
          @for (o of pageItems(); track o.id) {
            <tr>
              <td><a [routerLink]="['/admin/orders', o.id]" style="color:var(--teal-d);font-weight:700;text-decoration:none">#{{ o.code }}</a></td>
              <td>{{ o.customerName }}</td>
              <td>{{ o.customerPhone }}</td>
              <td>{{ o.createdAt | date: 'dd/MM HH:mm' }}</td>
              <td>{{ o.paymentMethod === 'COD' ? 'COD' : 'Bank transfer' }}</td>
              <td><span [class]="paymentBadge[o.paymentStatus]">{{ o.paymentStatus }}</span></td>
              <td>{{ o.total | usd }}</td>
              <td><span [class]="badge[o.status]">{{ o.status }}</span></td>
              <td><a class="btn sm gh" [routerLink]="['/admin/orders', o.id]">Details</a></td>
            </tr>
          } @empty {
            <tr><td colspan="9" class="muted">No orders match.</td></tr>
          }
        </table>
      </div>
      <div class="pager">
        <span>{{ filtered().length }} orders · page {{ page() }} / {{ pages() }}</span>
        <button class="btn sm gh" type="button" [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
        <button class="btn sm gh" type="button" [disabled]="page() === pages()" (click)="page.set(page() + 1)">Next</button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderListComponent {
  private readonly orders = inject(OrderService).orders;
  readonly badge = ORDER_BADGE;
  readonly paymentBadge = PAYMENT_BADGE;
  readonly statuses: Array<OrderStatus | 'All'> = ['All', ...ORDER_STATUSES];
  readonly status = signal<OrderStatus | 'All'>((inject(ActivatedRoute).snapshot.queryParamMap.get('status') as OrderStatus | null) ?? 'All');
  readonly search = signal('');
  readonly method = signal('all');
  readonly payment = signal('all');
  readonly page = signal(1);

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase().replace(/^#/, '');
    const phone = normalizePhone(q);
    return this.orders().filter(
      (o) =>
        (this.status() === 'All' || o.status === this.status()) &&
        (this.method() === 'all' || o.paymentMethod === this.method()) &&
        (this.payment() === 'all' || o.paymentStatus === this.payment()) &&
        (!q || o.code.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || (phone.length > 2 && normalizePhone(o.customerPhone).includes(phone))),
    );
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE)));
  readonly pageItems = computed(() => this.filtered().slice((this.page() - 1) * PAGE, this.page() * PAGE));

  count(status: OrderStatus | 'All'): number {
    return status === 'All' ? this.orders().length : this.orders().filter((o) => o.status === status).length;
  }
}

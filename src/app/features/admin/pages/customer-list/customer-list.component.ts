import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { normalizePhone } from '../../../../core/services/auth.service';
import { CustomerAdminService } from '../../../../core/services/customer-admin.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

/** A13: Customer management list. */
@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [DatePipe, RouterLink, UsdPipe],
  template: `
    <div class="tool">
      <input type="search" placeholder="Search by name, email or phone…" aria-label="Search customers" [value]="search()" (input)="search.set($any($event.target).value)" />
      <select aria-label="Status" (change)="status.set($any($event.target).value)">
        <option value="all">All statuses</option><option value="Active">Active</option><option value="Locked">Locked</option>
      </select>
    </div>
    <div class="card">
      <div class="tw">
        <table>
          <tr><th>Customer</th><th>Email</th><th>Phone</th><th>Joined</th><th>Completed orders</th><th>Net spend</th><th>Status</th><th></th></tr>
          @for (row of filtered(); track row.user.id) {
            <tr>
              <td>{{ row.user.fullName }}</td>
              <td>{{ row.user.email }}</td>
              <td>{{ row.user.phone }}</td>
              <td>{{ row.user.createdAt | date: 'dd/MM/yyyy' }}</td>
              <td>{{ row.completedOrders }} <small class="muted">/ {{ row.orderCount }}</small></td>
              <td>{{ row.netSpend | usd }}</td>
              <td><span [class]="row.user.status === 'Active' ? 'b g' : 'b r'">{{ row.user.status }}</span></td>
              <td><a class="btn sm gh" [routerLink]="['/admin/customers', row.user.id]">Profile</a></td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="muted">No customers match.</td></tr>
          }
        </table>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerListComponent {
  private readonly customers = inject(CustomerAdminService);
  readonly search = signal('');
  readonly status = signal('all');
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const phone = normalizePhone(q);
    return this.customers
      .rows()
      .filter((r) => this.status() === 'all' || r.user.status === this.status())
      .filter((r) => !q || r.user.fullName.toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q) || (phone.length > 2 && normalizePhone(r.user.phone).includes(phone)));
  });
}

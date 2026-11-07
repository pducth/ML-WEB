import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { formatAddress } from '../../../../core/services/address.service';
import { CustomerAdminService, LOCK_REASONS, UNLOCK_REASONS } from '../../../../core/services/customer-admin.service';
import { HairRoutineEngineService } from '../../../../core/services/hair-routine-engine.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';
import { AdminModalComponent } from '../../ui/admin-modal.component';
import { ORDER_BADGE } from '../../ui/badges';

const STEP_LABEL: Record<string, string> = { cleanse: 'Cleanse', condition: 'Condition', treat: 'Treat', style_protect: 'Style' };

/** A13: Customer profile: orders, address book, Hair Profile and lock/unlock. */
@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, UsdPipe, AdminModalComponent],
  template: `
    <a class="back" routerLink="/admin/customers">← Customers</a>
    @if (detail(); as d) {
      <div class="grid g2">
        <div class="card">
          <h3>Profile <span [class]="d.user.status === 'Active' ? 'b g' : 'b r'">{{ d.user.status }}</span></h3>
          <div class="row"><span>Full name</span><b>{{ d.user.fullName }}</b></div>
          <div class="row"><span>Email</span><b>{{ d.user.email }}</b></div>
          <div class="row"><span>Phone</span><b>{{ d.user.phone }}</b></div>
          <div class="row"><span>Joined</span><b>{{ d.user.createdAt | date: 'dd/MM/yyyy' }}</b></div>
          <div class="row"><span>Completed orders</span><b>{{ d.completedOrders }}</b></div>
          <div class="row"><span>Net spend</span><b>{{ d.netSpend | usd }}</b></div>
          @if (d.user.lockReason) { <div class="row"><span>Lock reason</span><b>{{ d.user.lockReason }}</b></div> }
          <p>
            @if (d.user.status === 'Active') { <button class="btn or" type="button" (click)="open(true)">Lock account</button> }
            @else { <button class="btn" type="button" (click)="open(false)">Unlock</button> }
          </p>
        </div>
        <div class="card">
          <h3>Saved hair profile</h3>
          @if (d.hairProfile; as hp) {
            <p><span class="b">{{ title(hp.primaryLabel) }}</span> @if (hp.secondaryLabel) { <span class="b w">{{ title(hp.secondaryLabel) }}</span> } <small class="muted">saved {{ hp.savedAt | date: 'dd/MM/yyyy' }}</small></p>
            <div class="steps">
              @for (item of hp.routine; track item.step) { <span [class]="item.productId ? 'd' : ''" [title]="item.productName ?? 'Skipped'">{{ stepLabel[item.step] }}</span> }
            </div>
            @for (item of hp.routine; track item.step) { <div class="row"><span class="muted">{{ stepLabel[item.step] }}</span><span>{{ item.productName ?? 'Skipped' }}</span></div> }
          } @else {
            <p class="muted">No Hair Profile saved.</p>
          }
          <p><small style="color:var(--mut)">Results are for cosmetic guidance only.</small></p>
          <h3 style="margin-top:12px">Address book</h3>
          @for (a of d.addresses; track a.id) {
            <div class="row"><span>{{ a.label }} @if (a.isDefault) { <span class="b">Default</span> }</span><span style="text-align:right;max-width:70%">{{ format(a) }}</span></div>
          } @empty { <p class="muted">No saved addresses.</p> }
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3>Purchase history <em>{{ d.orders.length }} orders · {{ d.netSpend | usd }} net</em></h3>
        <div class="tw">
          <table>
            <tr><th>Order ID</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr>
            @for (o of d.orders; track o.id) {
              <tr><td>#{{ o.code }}</td><td>{{ o.createdAt | date: 'dd/MM/yyyy' }}</td><td>{{ o.total | usd }}</td><td><span [class]="badge[o.status]">{{ o.status }}</span></td><td><a class="btn sm gh" [routerLink]="['/admin/orders', o.id]">Details</a></td></tr>
            } @empty { <tr><td colspan="5" class="muted">No orders yet.</td></tr> }
          </table>
        </div>
      </div>

      <app-admin-modal [open]="lockDialog() !== null" [title]="lockDialog() ? 'Lock account' : 'Unlock account'" [confirmLabel]="lockDialog() ? 'Lock' : 'Unlock'" [tone]="lockDialog() ? 'danger' : 'teal'" [confirmDisabled]="!reason()" (closed)="lockDialog.set(null)" (confirmed)="confirm()">
        <label>Reason *
          <select (change)="reason.set($any($event.target).value)">
            <option value="">Select a reason…</option>
            @for (r of lockDialog() ? lockReasons : unlockReasons; track r) { <option [value]="r">{{ r }}</option> }
          </select>
        </label>
        @if (lockDialog()) { <small>Active sessions will be revoked immediately and the customer cannot sign in.</small> }
      </app-admin-modal>
    } @else {
      <div class="alert err">Customer not found.</div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailComponent {
  private readonly customers = inject(CustomerAdminService);
  private readonly engine = inject(HairRoutineEngineService);
  private readonly toast = inject(ToastService);

  readonly userId = input.required<string>();
  readonly detail = computed(() => this.customers.detail(this.userId()));
  readonly badge = ORDER_BADGE;
  readonly stepLabel = STEP_LABEL;
  readonly lockReasons = LOCK_REASONS;
  readonly unlockReasons = UNLOCK_REASONS;
  readonly format = formatAddress;
  readonly lockDialog = signal<boolean | null>(null);
  readonly reason = signal('');

  title(label: string): string {
    return this.engine.labelTitle(label);
  }

  open(lock: boolean): void {
    this.reason.set('');
    this.lockDialog.set(lock);
  }

  confirm(): void {
    const lock = this.lockDialog();
    if (lock === null) return;
    try {
      this.customers.setLocked(this.userId(), lock, this.reason());
      this.toast.show(lock ? 'Account locked' : 'Account unlocked', 'info');
      this.lockDialog.set(null);
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }
}

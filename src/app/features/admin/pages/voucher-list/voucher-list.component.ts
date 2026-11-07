import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Voucher } from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast.service';
import { VoucherService, voucherState } from '../../../../core/services/voucher.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';
import { VOUCHER_BADGE } from '../../ui/badges';

/** A10: Voucher list. */
@Component({
  selector: 'app-voucher-list',
  standalone: true,
  imports: [DatePipe, RouterLink, UsdPipe],
  template: `
    <div class="tool">
      <input type="search" placeholder="Search discount codes…" aria-label="Search discount codes" [value]="search()" (input)="search.set($any($event.target).value)" />
      <a class="btn" routerLink="/admin/vouchers/new">+ Create voucher</a>
    </div>
    <div class="card">
      <div class="tw">
        <table>
          <tr><th>Code</th><th>Description</th><th>Type</th><th>Value</th><th>Conditions</th><th>Usage</th><th>Validity</th><th>Status</th><th>Enabled</th><th></th></tr>
          @for (v of filtered(); track v.id) {
            <tr>
              <td><b>{{ v.code }}</b></td>
              <td class="wrap">{{ v.description }}</td>
              <td>{{ v.type === 'percent' ? '%' : 'Fixed amount' }}</td>
              <td>@if (v.type === 'percent') { {{ v.value }}% } @else { {{ v.value | usd }} }</td>
              <td>Orders from {{ v.minOrder | usd }}@if (v.maxDiscount) { · max {{ v.maxDiscount | usd }} } · {{ v.perUserLimit }}/account</td>
              <td><div style="width:120px"><div class="bar" [class.o]="v.usedCount / v.totalQuota > 0.8"><i [style.width.%]="(v.usedCount / v.totalQuota) * 100"></i></div></div><small class="muted">{{ v.usedCount }} / {{ v.totalQuota }}</small></td>
              <td>{{ v.startsAt | date: 'dd/MM/yy' }} – {{ v.endsAt | date: 'dd/MM/yy' }}</td>
              <td><span [class]="badge[state(v)]">{{ state(v) }}</span></td>
              <td><button type="button" class="sw" [class.off]="!v.active" role="switch" [attr.aria-checked]="v.active" [attr.aria-label]="'Enable ' + v.code" (click)="toggle(v)"></button></td>
              <td><a class="btn sm gh" [routerLink]="['/admin/vouchers', v.id, 'edit']">Edit</a></td>
            </tr>
          } @empty {
            <tr><td colspan="10" class="muted">No discount codes match.</td></tr>
          }
        </table>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoucherListComponent {
  private readonly vouchers = inject(VoucherService);
  private readonly toast = inject(ToastService);
  readonly badge = VOUCHER_BADGE;
  readonly state = (v: Voucher) => voucherState(v);
  readonly search = signal('');
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.vouchers.vouchers().filter((v) => !q || v.code.toLowerCase().includes(q) || v.description.toLowerCase().includes(q));
  });

  toggle(v: Voucher): void {
    this.vouchers.toggle(v.id);
    this.toast.show(`${v.code} ${v.active ? 'disabled' : 'enabled'}.`, 'info');
  }
}

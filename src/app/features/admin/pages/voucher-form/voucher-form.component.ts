import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import type { VoucherType } from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast.service';
import { VoucherService } from '../../../../core/services/voucher.service';

function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}

/** A11 — Create / edit voucher. */
@Component({
  selector: 'app-voucher-form',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a class="back" routerLink="/admin/vouchers">← Discount codes</a>
    @if (voucherId() && !existing()) {
      <div class="alert err">Voucher not found.</div>
    } @else {
      @if (error()) { <div class="alert err" role="alert">{{ error() }}</div> }
      <div class="card">
        <div class="form">
          <label>Voucher code *<input [value]="code()" (input)="code.set($any($event.target).value.toUpperCase())" placeholder="WELCOME10" /></label>
          <label>Description<input [value]="description()" (input)="description.set($any($event.target).value)" placeholder="10% off your order" /></label>
          <label>Discount type
            <select (change)="type.set($any($event.target).value)">
              <option value="percent" [selected]="type() === 'percent'">Percentage (%)</option>
              <option value="fixed" [selected]="type() === 'fixed'">Fixed amount (USD)</option>
            </select>
          </label>
          <label>Value *<input type="number" min="0" step="0.01" [value]="value()" (input)="value.set($any($event.target).valueAsNumber)" /></label>
          <label>Minimum order (USD)<input type="number" min="0" step="0.01" [value]="minOrder()" (input)="minOrder.set($any($event.target).valueAsNumber)" /></label>
          <label>Maximum discount (USD)<input type="number" min="0" step="0.01" [value]="maxDiscount() ?? ''" placeholder="No cap" (input)="maxDiscount.set($any($event.target).value === '' ? null : $any($event.target).valueAsNumber)" /></label>
          <label>Total usage limit *<input type="number" min="1" step="1" [value]="totalQuota()" (input)="totalQuota.set($any($event.target).valueAsNumber)" /></label>
          <label>Limit per account *<input type="number" min="1" step="1" [value]="perUserLimit()" (input)="perUserLimit.set($any($event.target).valueAsNumber)" /></label>
          <label>Start date<input type="date" [value]="startsAt()" (input)="startsAt.set($any($event.target).value)" /></label>
          <label>End date<input type="date" [value]="endsAt()" (input)="endsAt.set($any($event.target).value)" /></label>
        </div>
        <p style="margin-top:16px;display:flex;align-items:center;gap:10px"><b>Enabled</b> <button type="button" class="sw" [class.off]="!active()" role="switch" [attr.aria-checked]="active()" aria-label="Enabled" (click)="active.set(!active())"></button></p>
        @if (existing(); as v) { <p class="muted">Used {{ v.usedCount }} times so far.</p> }
        <div class="alert">One code per order · discount cannot exceed the subtotal · usage is restored when an order is cancelled.</div>
        <button class="btn" type="button" (click)="save()">Save voucher</button> <a class="btn gh" routerLink="/admin/vouchers">Cancel</a>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoucherFormComponent {
  private readonly vouchers = inject(VoucherService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly voucherId = input<string>();
  readonly existing = computed(() => (this.voucherId() ? this.vouchers.getById(this.voucherId()!) : undefined));

  readonly code = signal('');
  readonly description = signal('');
  readonly type = signal<VoucherType>('percent');
  readonly value = signal(10);
  readonly minOrder = signal(0);
  readonly maxDiscount = signal<number | null>(null);
  readonly totalQuota = signal(100);
  readonly perUserLimit = signal(1);
  readonly startsAt = signal(new Date().toISOString().slice(0, 10));
  readonly endsAt = signal(new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10));
  readonly active = signal(true);
  readonly error = signal('');

  constructor() {
    effect(() => {
      this.voucherId();
      untracked(() => {
        const v = this.existing();
        if (!v) return;
        this.code.set(v.code);
        this.description.set(v.description);
        this.type.set(v.type);
        this.value.set(v.value);
        this.minOrder.set(v.minOrder);
        this.maxDiscount.set(v.maxDiscount);
        this.totalQuota.set(v.totalQuota);
        this.perUserLimit.set(v.perUserLimit);
        this.startsAt.set(toDateInput(v.startsAt));
        this.endsAt.set(toDateInput(v.endsAt));
        this.active.set(v.active);
      });
    });
  }

  save(): void {
    this.error.set('');
    try {
      this.vouchers.save(
        {
          code: this.code(),
          description: this.description().trim(),
          type: this.type(),
          value: this.value(),
          minOrder: this.minOrder() || 0,
          maxDiscount: this.maxDiscount(),
          totalQuota: this.totalQuota(),
          perUserLimit: this.perUserLimit(),
          startsAt: this.startsAt() ? `${this.startsAt()}T00:00:00Z` : '',
          endsAt: this.endsAt() ? `${this.endsAt()}T23:59:59Z` : '',
          active: this.active(),
        },
        this.voucherId(),
      );
      this.toast.show('Voucher saved');
      void this.router.navigateByUrl('/admin/vouchers');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}

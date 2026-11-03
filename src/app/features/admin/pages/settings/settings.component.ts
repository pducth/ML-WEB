import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { errorMessage } from '../../../../core/data/mock-db.service';
import type { StoreSettings } from '../../../../core/models';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';

type NumericKey = 'shippingFee' | 'paymentTimeoutMinutes' | 'lowStockThreshold' | 'safetyStock' | 'leadTimeDays' | 'reviewPeriodDays' | 'wapeThreshold' | 'returnWindowDays';

/** A12 — Store, payment, inventory and ML parameters. */
@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    @let s = draft();
    @if (error()) { <div class="alert err" role="alert">{{ error() }}</div> }
    <div class="grid g2">
      <div class="card"><h3>Store information</h3>
        <div class="form">
          <label>Store name<input [value]="s.storeName" (input)="setText('storeName', $event)" /></label>
          <label>Support email<input type="email" [value]="s.supportEmail" (input)="setText('supportEmail', $event)" /></label>
          <label style="grid-column:1/-1">Warehouse address<input [value]="s.warehouseAddress" (input)="setText('warehouseAddress', $event)" /></label>
          <label>Currency<input value="USD ($XX.XX)" disabled /></label>
        </div>
      </div>
      <div class="card"><h3>Payment <em>Bank transfer · PAY-HCI references</em></h3>
        <div class="form">
          <label>Bank<input [value]="s.bank.bankName" (input)="setBank('bankName', $event)" /></label>
          <label>Account number<input [value]="s.bank.accountNumber" (input)="setBank('accountNumber', $event)" /></label>
          <label style="grid-column:1/-1">Account name<input [value]="s.bank.accountName" (input)="setBank('accountName', $event)" /></label>
          <label>Payment deadline (minutes)<input type="number" min="1" step="1" [value]="s.paymentTimeoutMinutes" (input)="setNumber('paymentTimeoutMinutes', $event)" /></label>
          <label>Payment simulation mode<span><button type="button" class="sw" [class.off]="!s.paymentSimulation" role="switch" [attr.aria-checked]="s.paymentSimulation" aria-label="Payment simulation mode" (click)="draft.set({ ...s, paymentSimulation: !s.paymentSimulation })"></button></span></label>
        </div>
      </div>
      <div class="card"><h3>Operations</h3>
        <div class="form">
          <label>Shipping fee (USD)<input type="number" min="0" step="0.01" [value]="s.shippingFee" (input)="setNumber('shippingFee', $event)" /></label>
          <label>Low stock threshold<input type="number" min="0" step="1" [value]="s.lowStockThreshold" (input)="setNumber('lowStockThreshold', $event)" /></label>
          <label>Return window (days)<input type="number" min="0" step="1" [value]="s.returnWindowDays" (input)="setNumber('returnWindowDays', $event)" /></label>
        </div>
      </div>
      <div class="card"><h3>ML parameters <em>Reorder = max(0, forecast + safety stock − (available + incoming))</em></h3>
        <div class="form">
          <label>Default safety stock<input type="number" min="0" step="1" [value]="s.safetyStock" (input)="setNumber('safetyStock', $event)" /></label>
          <label>Supplier lead time (days)<input type="number" min="0" step="1" [value]="s.leadTimeDays" (input)="setNumber('leadTimeDays', $event)" /></label>
          <label>Review period (days)<input type="number" min="0" step="1" [value]="s.reviewPeriodDays" (input)="setNumber('reviewPeriodDays', $event)" /></label>
          <label>Forecast horizon (days)<input [value]="s.leadTimeDays + s.reviewPeriodDays" disabled /></label>
          <label>WAPE threshold (%)<input type="number" min="0" step="1" [value]="s.wapeThreshold" (input)="setNumber('wapeThreshold', $event)" /></label>
        </div>
      </div>
    </div>
    <p style="margin-top:16px"><button class="btn" type="button" (click)="save()">Save changes</button> <button class="btn gh" type="button" (click)="reset()">Discard</button></p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly service = inject(SettingsService);
  private readonly toast = inject(ToastService);
  readonly draft = signal<StoreSettings>(structuredClone(this.service.settings()));
  readonly error = signal('');

  setText(key: 'storeName' | 'supportEmail' | 'warehouseAddress', event: Event): void {
    this.draft.update((d) => ({ ...d, [key]: (event.target as HTMLInputElement).value }));
  }

  setBank(key: keyof StoreSettings['bank'], event: Event): void {
    this.draft.update((d) => ({ ...d, bank: { ...d.bank, [key]: (event.target as HTMLInputElement).value } }));
  }

  setNumber(key: NumericKey, event: Event): void {
    this.draft.update((d) => ({ ...d, [key]: (event.target as HTMLInputElement).valueAsNumber }));
  }

  save(): void {
    this.error.set('');
    try {
      this.service.update(this.draft());
      this.toast.show('Changes saved');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  reset(): void {
    this.draft.set(structuredClone(this.service.settings()));
    this.error.set('');
  }
}

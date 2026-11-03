import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { InventoryService, type InventoryRow } from '../../../../core/services/inventory.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AdminModalComponent } from '../../ui/admin-modal.component';
import { STOCK_BADGE } from '../../ui/badges';

const ADJUST_REASONS = ['Stocktake', 'Damaged goods', 'Failed delivery – restock', 'Other'];
const PAGE = 20;

/** A07 — Variant inventory (closed loop step 2: Receive Stock moves Incoming into On Hand). */
@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [DatePipe, AdminModalComponent],
  template: `
    <div class="tool">
      <input type="search" placeholder="Search SKUs or products…" aria-label="Search SKUs" [value]="search()" (input)="search.set($any($event.target).value); page.set(1)" />
      <select aria-label="Stock filter" (change)="filter.set($any($event.target).value); page.set(1)">
        <option value="all" [selected]="filter() === 'all'">All variants</option>
        <option value="low" [selected]="filter() === 'low'">Low &amp; out of stock (≤ {{ settings().lowStockThreshold }})</option>
        <option value="out" [selected]="filter() === 'out'">Out of stock</option>
        <option value="incoming" [selected]="filter() === 'incoming'">Incoming to receive</option>
      </select>
    </div>
    <div class="card">
      <div class="tw">
        <table>
          <tr><th>SKU</th><th>Product</th><th>Size</th><th>On Hand</th><th>Reserved</th><th>Incoming</th><th>Available</th><th>Status</th><th></th></tr>
          @for (row of pageItems(); track row.variant.id) {
            <tr>
              <td>{{ row.variant.sku }}</td>
              <td class="wrap">{{ row.product.name }} @if (row.product.status === 'Inactive') { <span class="b x">Inactive</span> }</td>
              <td>{{ row.variant.sizeLabel }}</td>
              <td>{{ row.variant.onHand }}</td>
              <td>{{ row.variant.reserved }}</td>
              <td>{{ row.variant.incoming }}</td>
              <td><b>{{ row.available }}</b></td>
              <td><span [class]="badge[row.status]">{{ row.status }}</span></td>
              <td>
                @if (row.variant.incoming > 0) { <button class="btn sm" type="button" (click)="receiveTarget.set(row)">Receive Stock</button> }
                <button class="btn sm gh" type="button" style="margin-left:6px" (click)="openAdjust(row)">Adjust stock</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="9" class="muted">No variants match.</td></tr>
          }
        </table>
      </div>
      <div class="pager">
        <span>{{ filtered().length }} variants · page {{ page() }} / {{ pages() }}</span>
        <button class="btn sm gh" type="button" [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
        <button class="btn sm gh" type="button" [disabled]="page() === pages()" (click)="page.set(page() + 1)">Next</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h3>Inventory adjustment records <em>Audit trail</em></h3>
      @for (a of inventory.adjustments().slice(0, 10); track a.id) {
        <div class="row"><span><b>{{ a.sku }}</b> · {{ a.type === 'ADJUST' ? 'Adjusted' : a.type === 'RECEIVE' ? 'Received' : 'Ordered' }} · {{ a.reason }}</span>
          <span class="muted">On Hand {{ a.before.onHand }} → {{ a.after.onHand }} · Incoming {{ a.before.incoming }} → {{ a.after.incoming }} · {{ a.at | date: 'short' }}</span></div>
      } @empty {
        <p class="muted" style="margin:0">No manual adjustments yet.</p>
      }
    </div>

    <app-admin-modal [open]="adjustTarget() !== null" title="Adjust inventory" (closed)="adjustTarget.set(null)" (confirmed)="confirmAdjust()" [confirmDisabled]="!reason()">
      @if (adjustTarget(); as row) {
        <p style="margin:0">{{ row.product.name }} · {{ row.variant.sizeLabel }} <span class="muted">({{ row.variant.sku }})</span></p>
        <label>New On Hand quantity<input type="number" min="0" step="1" [value]="newOnHand()" (input)="newOnHand.set($any($event.target).valueAsNumber)" /></label>
        <label>Reason *
          <select (change)="reason.set($any($event.target).value)">
            <option value="">Select a reason…</option>
            @for (r of reasons; track r) { <option [value]="r">{{ r }}</option> }
          </select>
        </label>
        <small class="muted">On Hand cannot be lower than Reserved ({{ row.variant.reserved }}).</small>
        @if (modalError()) { <span class="err-text">{{ modalError() }}</span> }
      }
    </app-admin-modal>

    <app-admin-modal [open]="receiveTarget() !== null" title="Receive stock" confirmLabel="Receive stock" (closed)="receiveTarget.set(null)" (confirmed)="confirmReceive()">
      @if (receiveTarget(); as row) {
        <p style="margin:0">Receive <b>{{ row.variant.incoming }}</b> units of {{ row.product.name }} · {{ row.variant.sizeLabel }}?</p>
        <small class="muted">Incoming stock moves to On Hand: {{ row.variant.onHand }} → {{ row.variant.onHand + row.variant.incoming }}. Low-stock alerts clear automatically once Available is above {{ settings().lowStockThreshold }}.</small>
      }
    </app-admin-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryComponent {
  readonly inventory = inject(InventoryService);
  readonly settings = inject(SettingsService).settings;
  private readonly toast = inject(ToastService);

  readonly badge = STOCK_BADGE;
  readonly reasons = ADJUST_REASONS;
  readonly search = signal('');
  readonly filter = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('filter') ?? 'all');
  readonly page = signal(1);
  readonly adjustTarget = signal<InventoryRow | null>(null);
  readonly receiveTarget = signal<InventoryRow | null>(null);
  readonly newOnHand = signal(0);
  readonly reason = signal('');
  readonly modalError = signal('');

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.inventory
      .rows()
      .filter((r) => {
        if (this.filter() === 'low') return r.status !== 'In stock';
        if (this.filter() === 'out') return r.status === 'Out of stock';
        if (this.filter() === 'incoming') return r.variant.incoming > 0;
        return true;
      })
      .filter((r) => !q || r.variant.sku.toLowerCase().includes(q) || r.product.name.toLowerCase().includes(q))
      .sort((a, b) => a.available - b.available);
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE)));
  readonly pageItems = computed(() => this.filtered().slice((this.page() - 1) * PAGE, this.page() * PAGE));

  openAdjust(row: InventoryRow): void {
    this.newOnHand.set(row.variant.onHand);
    this.reason.set('');
    this.modalError.set('');
    this.adjustTarget.set(row);
  }

  confirmAdjust(): void {
    const row = this.adjustTarget();
    if (!row) return;
    try {
      this.inventory.adjust(row.variant.id, this.newOnHand(), this.reason());
      this.adjustTarget.set(null);
      this.toast.show('Inventory updated');
    } catch (error) {
      this.modalError.set(errorMessage(error));
    }
  }

  confirmReceive(): void {
    const row = this.receiveTarget();
    if (!row) return;
    try {
      this.inventory.receive(row.variant.id);
      this.toast.show('Stock added to On Hand');
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
    this.receiveTarget.set(null);
  }
}

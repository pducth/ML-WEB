import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../../../../core/models';
import { ForecastService, type ForecastRow } from '../../../../core/services/forecast.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AdminModalComponent } from '../../ui/admin-modal.component';
import { LineChartComponent } from '../../ui/charts.component';

/** A03: Sales forecast & ML replenishment (closed loop step 1: Order Stock → Incoming). */
@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [DatePipe, DecimalPipe, PercentPipe, LineChartComponent, AdminModalComponent],
  templateUrl: './forecast.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForecastComponent {
  readonly forecast = inject(ForecastService);
  private readonly inventory = inject(InventoryService);
  private readonly toast = inject(ToastService);
  readonly settings = inject(SettingsService).settings;

  readonly categories = PRODUCT_CATEGORIES;
  readonly chartCategory = signal<ProductCategory | 'all'>('all');
  readonly filterCategory = signal<ProductCategory | 'all'>('all');
  readonly search = signal('');
  readonly onlyReorder = signal(true);
  readonly orderTarget = signal<ForecastRow | null>(null);
  readonly orderQty = signal(0);
  readonly retrainOpen = signal(false);

  readonly chart = computed(() => {
    const cats = this.forecast.categories().filter((c) => this.chartCategory() === 'all' || c.category === this.chartCategory());
    const weeks = cats[0]?.history.map((h) => h.week) ?? [];
    const actual = weeks.map((week, i) => ({ label: week, value: cats.reduce((s, c) => s + (c.history[i]?.actual ?? 0), 0) }));
    const predicted = weeks.map((week, i) => ({ label: week, value: cats.reduce((s, c) => s + (c.history[i]?.predicted ?? 0), 0) }));
    const next = cats.reduce((s, c) => s + c.forecast14d, 0);
    const last = predicted[predicted.length - 1];
    const forecast = last ? [...predicted, { label: 'W+1', value: Math.round(next / 2) }, { label: 'W+2', value: Math.round(next / 2) }] : [];
    return { actual, forecast, next };
  });

  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.forecast.rows().filter(
      (row) =>
        (this.filterCategory() === 'all' || row.product.category === this.filterCategory()) &&
        (!q || row.product.name.toLowerCase().includes(q) || row.variant.sku.toLowerCase().includes(q)) &&
        (!this.onlyReorder() || row.coldStart || (row.suggested ?? 0) > 0),
    );
  });
  readonly reorderCount = computed(() => this.forecast.rows().filter((r) => (r.suggested ?? 0) > 0).length);

  openOrder(row: ForecastRow): void {
    this.orderTarget.set(row);
    this.orderQty.set(row.suggested ?? 0);
  }

  confirmOrder(): void {
    const row = this.orderTarget();
    if (!row) return;
    try {
      this.inventory.orderStock(row.variant.id, this.orderQty());
      this.toast.show(`Stock order placed · ${row.variant.sku} Incoming +${this.orderQty()}`);
      this.orderTarget.set(null);
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  confirmRetrain(): void {
    this.forecast.requestRetrain();
    this.retrainOpen.set(false);
    this.toast.show('Retraining queued for the offline batch pipeline. Metrics update when the new model output is published.', 'info');
  }
}

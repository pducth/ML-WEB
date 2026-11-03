import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService, PERIOD_LABELS, type DashboardPeriod, type Kpi } from '../../../../core/services/analytics.service';
import { ForecastService } from '../../../../core/services/forecast.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { MockDbService } from '../../../../core/data/mock-db.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';
import { DonutChartComponent, LineChartComponent } from '../../ui/charts.component';

/** A02 — Executive dashboard & KPIs. */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DecimalPipe, RouterLink, UsdPipe, LineChartComponent, DonutChartComponent],
  templateUrl: './admin-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly store = inject(MockDbService);
  readonly forecast = inject(ForecastService);
  readonly lowStock = inject(InventoryService).lowStock;

  readonly periods = Object.entries(PERIOD_LABELS) as Array<[DashboardPeriod, string]>;
  readonly period = signal<DashboardPeriod>('30d');
  readonly periodLabel = computed(() => PERIOD_LABELS[this.period()]);
  readonly stats = computed(() => {
    this.store.db();
    return this.analytics.dashboard(this.period());
  });

  readonly categoryDonut = computed(() => this.stats().categoryShare.map((c) => ({ label: c.category, value: c.value, share: c.share })));

  /** Store-wide demand: summed category backtests (actual vs model) followed by the 14-day forecast. */
  readonly demand = computed(() => {
    const cats = this.forecast.categories();
    const weeks = cats[0]?.history.map((h) => h.week) ?? [];
    const actual = weeks.map((week, i) => ({ label: week, value: cats.reduce((s, c) => s + (c.history[i]?.actual ?? 0), 0) }));
    const next = cats.reduce((s, c) => s + c.forecast14d, 0);
    const lastActual = actual[actual.length - 1];
    const forecast = lastActual ? [lastActual, { label: 'W+1', value: Math.round(next / 2) }, { label: 'W+2', value: Math.round(next / 2) }] : [];
    return { actual, forecast, offset: Math.max(0, actual.length - 1), next };
  });

  delta(kpi: Kpi): { text: string; up: boolean } {
    if (kpi.change === null) return { text: 'New vs. previous period', up: true };
    const up = kpi.change >= 0;
    return { text: `${up ? '▲' : '▼'} ${Math.abs(kpi.change).toFixed(1)}% vs. previous period`, up };
  }
}

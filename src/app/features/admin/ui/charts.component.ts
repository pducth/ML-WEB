import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UsdPipe } from '../../../shared/ui/usd.pipe';

export interface SeriesPoint {
  label: string;
  value: number;
}

const W = 400;
const BASE = 140;
const HEIGHT = 125;

/** Bar chart, App bars() from Admin.html (last bar highlighted in brown). */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 400 150" width="100%" role="img" [attr.aria-label]="label()">
      @for (bar of bars(); track $index) {
        <rect [attr.x]="bar.x" [attr.y]="bar.y" [attr.width]="bar.w" [attr.height]="bar.h" rx="4" [attr.fill]="$last ? 'var(--or)' : 'var(--teal)'"><title>{{ bar.title }}</title></rect>
      }
      <line x1="0" y1="140" x2="400" y2="140" stroke="var(--line)" />
    </svg>
  `,
})
export class BarChartComponent {
  readonly data = input<SeriesPoint[]>([]);
  readonly label = input('Chart');
  readonly bars = computed(() => {
    const d = this.data();
    const max = Math.max(1, ...d.map((p) => p.value));
    const w = W / Math.max(1, d.length);
    return d.map((p, i) => ({ x: i * w + 4, w: Math.max(2, w - 8), h: (p.value / max) * HEIGHT, y: BASE - (p.value / max) * HEIGHT, title: `${p.label}: ${p.value}` }));
  });
}

/**
 * Line chart, App lines() from Admin.html: solid teal for actuals, dashed brown for the
 * forecast, with a divider where the forecast starts. Values are auto-scaled to the plot height.
 */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 400 150" width="100%" role="img" [attr.aria-label]="label()" style="display:block"
      [attr.height]="height()" [attr.preserveAspectRatio]="height() ? 'none' : null">
      <line x1="0" y1="140" x2="400" y2="140" stroke="var(--line)" vector-effect="non-scaling-stroke" />
      @if (geometry().split !== null) {
        <line [attr.x1]="geometry().split" y1="5" [attr.x2]="geometry().split" y2="140" stroke="var(--line)" vector-effect="non-scaling-stroke" />
      }
      <polyline fill="none" stroke="#4F7F72" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" [attr.points]="geometry().actual" />
      @if (geometry().forecast) {
        <polyline fill="none" stroke="var(--or)" stroke-width="3" stroke-dasharray="6 5" stroke-linejoin="round" vector-effect="non-scaling-stroke" [attr.points]="geometry().forecast" />
      }
      @for (dot of geometry().dots; track $index) {
        <circle [attr.cx]="dot.x" [attr.cy]="dot.y" r="6" fill="transparent"><title>{{ dot.title }}</title></circle>
      }
    </svg>
  `,
})
export class LineChartComponent {
  readonly actual = input<SeriesPoint[]>([]);
  readonly forecast = input<SeriesPoint[]>([]);
  readonly forecastOffset = input(0);
  readonly label = input('Chart');
  /** Fixed pixel height (stretches horizontally); omit to keep the reference 400×150 aspect ratio. */
  readonly height = input<number | null>(null);

  readonly geometry = computed(() => {
    const actual = this.actual();
    const forecast = this.forecast();
    const offset = this.forecastOffset();
    const count = Math.max(actual.length, offset + forecast.length);
    const step = W / Math.max(1, count - 1);
    const max = Math.max(1, ...actual.map((p) => p.value), ...forecast.map((p) => p.value)) * 1.08;
    const y = (v: number) => BASE - (v / max) * HEIGHT;
    const pts = (d: SeriesPoint[], o: number) => d.map((p, i) => `${((i + o) * step).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    return {
      actual: pts(actual, 0),
      forecast: forecast.length ? pts(forecast, offset) : '',
      split: forecast.length && offset > 0 ? offset * step : null,
      dots: [
        ...actual.map((p, i) => ({ x: i * step, y: y(p.value), title: `${p.label}: ${p.value} (actual)` })),
        ...forecast.map((p, i) => ({ x: (i + offset) * step, y: y(p.value), title: `${p.label}: ${p.value} (forecast)` })),
      ],
    };
  });
}

export const CATEGORY_COLORS = ['#4F7F72', '#0F3D32', '#FF7F64', '#A8C3B6', '#D8C5AE', '#FFAD8C'];

/** Donut chart for the gross-sales mix by category (A02). */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [UsdPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="donut-wrap">
      <svg viewBox="0 0 42 42" width="150" height="150" style="justify-self:center" role="img" [attr.aria-label]="label()">
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--line)" stroke-width="6" />
        @for (seg of segments(); track seg.label) {
          <circle cx="21" cy="21" r="15.915" fill="none" [attr.stroke]="seg.color" stroke-width="6" [attr.stroke-dasharray]="seg.dash" [attr.stroke-dashoffset]="seg.offset" transform="rotate(-90 21 21)"><title>{{ seg.label }}: {{ seg.share.toFixed(1) }}%</title></circle>
        }
      </svg>
      <div class="donut-legend">
        @for (seg of segments(); track seg.label) {
          <span><i [style.background]="seg.color"></i>{{ seg.label }} <b style="margin-left:auto">{{ seg.share.toFixed(1) }}%</b> <small class="muted">{{ seg.value | usd }}</small></span>
        }
      </div>
    </div>
  `,
})
export class DonutChartComponent {
  readonly data = input<Array<{ label: string; value: number; share: number }>>([]);
  readonly label = input('Chart');
  readonly segments = computed(() => {
    let cumulative = 0;
    return this.data().map((d, i) => {
      const seg = { ...d, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], dash: `${d.share} ${100 - d.share}`, offset: -cumulative };
      cumulative += d.share;
      return seg;
    });
  });
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'text' | 'card' | 'image';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  templateUrl: './skeleton-loader.component.html',
  styleUrl: './skeleton-loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonLoaderComponent {
  readonly lines = input(3);
  readonly variant = input<SkeletonVariant>('text');
  readonly placeholders = computed(() => Array.from({ length: Math.max(1, this.lines()) }));
}

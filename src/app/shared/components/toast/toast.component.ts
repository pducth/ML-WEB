import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { NgClass } from '@angular/common';

export type ToastVariant = 'success' | 'error' | 'info';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  readonly visible = input(false);
  readonly message = input('');
  readonly variant = input<ToastVariant>('success');
  readonly durationMs = input(4000);
  readonly dismissed = output<void>();

  constructor() {
    effect((onCleanup) => {
      if (!this.visible() || this.durationMs() <= 0) {
        return;
      }

      const timerId = setTimeout(() => this.dismissed.emit(), this.durationMs());
      onCleanup(() => clearTimeout(timerId));
    });
  }
}

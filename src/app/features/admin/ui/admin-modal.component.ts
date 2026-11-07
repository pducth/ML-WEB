import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Admin dialog, the reference `.ov > .md` modal (title, body, right-aligned actions). */
@Component({
  selector: 'app-admin-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'open() && closed.emit()' },
  template: `
    @if (open()) {
      <div class="ov" (click)="$event.target === $event.currentTarget && closed.emit()">
        <div class="md" role="dialog" aria-modal="true" [attr.aria-label]="title()">
          <h3>{{ title() }}</h3>
          <ng-content />
          <div class="act">
            <button class="btn gh" type="button" (click)="closed.emit()">Close</button>
            <button class="btn" type="button" [class.or]="tone() === 'brown'" [class.danger]="tone() === 'danger'" [disabled]="confirmDisabled()" (click)="confirmed.emit()">{{ confirmLabel() }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly confirmLabel = input('Save');
  readonly confirmDisabled = input(false);
  readonly tone = input<'teal' | 'brown' | 'danger'>('teal');
  readonly closed = output<void>();
  readonly confirmed = output<void>();
}

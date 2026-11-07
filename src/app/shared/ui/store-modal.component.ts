import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PortalDirective } from './portal.directive';

/** Storefront dialog shell, same overlay/panel markup as the reference auth and order modals. */
@Component({
  selector: 'app-store-modal',
  standalone: true,
  imports: [PortalDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'open() && closed.emit()' },
  template: `
    @if (open()) {
      <div appPortal class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div (click)="closed.emit()" class="absolute inset-0 modal-overlay"></div>
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          class="relative bg-white border border-[#DCE5E0] shadow-2xl w-full p-6 sm:p-8 z-10 animate-fadeIn max-h-[90vh] overflow-y-auto"
          [class.max-w-md]="size() === 'md'"
          [class.max-w-lg]="size() === 'lg'"
        >
          <button type="button" (click)="closed.emit()" class="absolute top-5 right-5 text-[#85968E] hover:text-[#0F3D32]" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          @if (title()) {
            <h3 class="fm-display text-xl text-[#0F3D32] mb-4 pr-8">{{ title() }}</h3>
          }
          <ng-content />
        </div>
      </div>
    }
  `,
})
export class StoreModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly size = input<'md' | 'lg'>('md');
  readonly closed = output<void>();
}

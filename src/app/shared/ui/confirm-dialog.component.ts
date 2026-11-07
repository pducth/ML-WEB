import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../../core/services/confirm.service';
import { PortalDirective } from './portal.directive';

/** The single "are you sure?" dialog, mounted once in the app shell. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [PortalDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'confirm.answer(false)' },
  template: `
    @if (confirm.request(); as r) {
      <div appPortal class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div (click)="confirm.answer(false)" class="absolute inset-0 modal-overlay"></div>
        <div role="alertdialog" aria-modal="true" [attr.aria-label]="r.title" class="relative z-10 w-full max-w-md bg-white border border-[#DCE5E0] shadow-2xl p-6 sm:p-7 animate-fadeIn">
          <h2 class="fm-display text-xl text-[#0F3D32] leading-snug">{{ r.title }}</h2>
          @if (r.message) { <p class="mt-2 text-sm text-[#5E6F68] leading-relaxed text-pretty">{{ r.message }}</p> }
          <div class="mt-6 flex gap-3">
            <button type="button" (click)="confirm.answer(false)" class="btn-secondary flex-1 !py-3 !px-4 text-sm whitespace-nowrap">{{ r.cancelLabel ?? 'No' }}</button>
            <button type="button" (click)="confirm.answer(true)" class="flex-1 !py-3 !px-4 text-sm whitespace-nowrap btn-primary" [class.!bg-[#C9503A]]="r.danger" [class.!border-[#C9503A]]="r.danger">{{ r.confirmLabel ?? 'Yes' }}</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly confirm = inject(ConfirmService);
}

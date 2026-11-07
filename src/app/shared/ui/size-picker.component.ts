import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { availableOf, type ProductVariant } from '../../core/models';
import { PortalDirective } from './portal.directive';
import { UsdPipe } from './usd.pipe';

/** Compact size selector for a bag line: a quiet trigger that opens a small square list of sizes. */
@Component({
  selector: 'app-size-picker',
  standalone: true,
  imports: [UsdPipe, PortalDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-block',
    '(document:keydown.escape)': 'close()',
    '(window:scroll)': 'close()',
    '(window:resize)': 'close()',
  },
  template: `
    <button type="button" #trigger (click)="toggle(trigger)" [attr.aria-expanded]="open()" aria-haspopup="listbox"
      class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5E6F68] hover:text-[#0F3D32] transition-colors">
      <span>Size: <span class="text-[#0F3D32]">{{ current()?.sizeLabel }}</span> · {{ current()?.volume }}</span>
      <svg class="w-3 h-3 transition-transform" [class.rotate-180]="open()" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg>
    </button>

    @if (open()) {
      <div appPortal class="fixed inset-0 z-[60]" (click)="close()">
        <ul role="listbox" aria-label="Choose a size" (click)="$event.stopPropagation()"
          class="absolute min-w-[230px] bg-white border border-[#DCE5E0] shadow-[0_12px_32px_rgba(15,61,50,0.16)] py-1 animate-fadeIn"
          [style.top.px]="pos().top" [style.left.px]="pos().left">
          @for (v of variants(); track v.id) {
            @let soldOut = stock(v) === 0 && v.id !== variantId();
            <li role="option" [attr.aria-selected]="v.id === variantId()">
              <button type="button" (click)="pick(v)" [disabled]="soldOut"
                class="w-full flex items-center justify-between gap-4 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-[#F7F8F4] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                [class.bg-[#F7F8F4]]="v.id === variantId()">
                <span class="flex items-center gap-2">
                  <span class="w-3 text-[#19594A]">@if (v.id === variantId()) { ✓ }</span>
                  <span class="font-semibold text-[#0F3D32]">{{ v.sizeLabel }}<span class="font-normal text-[#5E6F68]"> · {{ v.volume }}</span></span>
                </span>
                <span class="text-[#0F3D32]">{{ soldOut ? 'Sold out' : (v.price | usd) }}</span>
              </button>
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class SizePickerComponent {
  readonly variants = input.required<ProductVariant[]>();
  readonly variantId = input.required<string>();
  readonly picked = output<string>();

  readonly open = signal(false);
  readonly pos = signal({ top: 0, left: 0 });
  readonly current = computed(() => this.variants().find((v) => v.id === this.variantId()) ?? null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  stock(variant: ProductVariant): number {
    return availableOf(variant);
  }

  toggle(trigger: HTMLElement): void {
    if (this.open()) {
      this.close();
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const width = 240;
    this.pos.set({ top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) });
    this.open.set(true);
  }

  close(): void {
    if (this.open()) this.open.set(false);
  }

  pick(variant: ProductVariant): void {
    this.close();
    if (variant.id !== this.variantId()) this.picked.emit(variant.id);
  }
}

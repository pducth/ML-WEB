import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { WishlistService } from '../../core/services/wishlist.service';

/** Heart toggle that saves a product to the wishlist. */
@Component({
  selector: 'app-wishlist-heart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="toggle($event)" [attr.aria-pressed]="saved()" [attr.aria-label]="saved() ? 'Remove ' + name() + ' from wishlist' : 'Save ' + name() + ' to wishlist'"
      class="group/heart w-9 h-9 flex items-center justify-center transition-transform duration-200 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0F3D32]">
      <svg class="w-[22px] h-[22px] transition-colors [filter:drop-shadow(0_0_2px_rgb(255_255_255/0.95))]" viewBox="0 0 24 24" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"
        [attr.fill]="saved() ? '#C9503A' : 'none'" [attr.stroke]="saved() ? '#C9503A' : '#0F3D32'">
        <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
      </svg>
    </button>
  `,
})
export class WishlistHeartComponent {
  private readonly wishlist = inject(WishlistService);
  readonly productId = input.required<string>();
  readonly name = input('product');
  readonly saved = computed(() => this.wishlist.has(this.productId()));

  toggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlist.toggle(this.productId(), this.name());
  }
}

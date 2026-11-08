import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { WishlistService } from '../../../../core/services/wishlist.service';
import { ProductCardComponent } from '../../../../shared/ui/product-card.component';

/** Wishlist: the products a shopper saved with the heart, newest first. */
@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [RouterLink, ProductCardComponent],
  template: `
    <section class="app-screen animate-fadeIn">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <nav class="text-xs text-[#85968E] mb-8 flex items-center gap-2" aria-label="Breadcrumb">
          <a routerLink="/" class="hover:text-[#19594A]">Home</a>
          <span>/</span>
          <span class="text-[#0F3D32] font-semibold">Wishlist</span>
        </nav>

        <header class="pb-8 border-b border-[#DCE5E0]">
          <span class="fm-eyebrow">Saved for later</span>
          <h1 class="fm-display text-3xl sm:text-4xl text-[#0F3D32] leading-snug mt-1">Wishlist</h1>
          <p class="text-sm text-[#5E6F68] mt-2">{{ products().length }} saved {{ products().length === 1 ? 'product' : 'products' }}</p>
        </header>

        @if (products().length) {
          <div class="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-5 gap-y-10">
            @for (product of products(); track product.id) {
              <app-product-card [product]="product" />
            }
          </div>
        } @else {
          <div class="mt-10 py-20 text-center bg-white border border-[#DCE5E0]">
            <span class="fm-eyebrow">Nothing saved yet</span>
            <p class="fm-display text-2xl text-[#0F3D32] mt-2">Your wishlist is empty</p>
            <a routerLink="/shop" class="btn-primary text-sm px-7 py-3 mt-6 inline-flex">Explore products</a>
          </div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistComponent {
  private readonly catalog = inject(ProductService);
  private readonly wishlist = inject(WishlistService);

  /** Saved products that are still on sale, in the order they were saved. */
  readonly products = computed(() => {
    const active = new Map(this.catalog.activeProducts().map((p) => [p.id, p]));
    return this.wishlist.ids().flatMap((id) => (active.has(id) ? [active.get(id)!] : []));
  });
}

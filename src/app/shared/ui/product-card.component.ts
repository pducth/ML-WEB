import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/data/mock-db.service';
import { availableOf, productAvailable, startingPrice, type Product, type ProductVariant } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ReviewService } from '../../core/services/review.service';
import { ToastService } from '../../core/services/toast.service';
import { PortalDirective } from './portal.directive';
import { WishlistHeartComponent } from './wishlist-heart.component';
import { ProductMediaComponent } from './product-media.component';
import { StarsComponent } from './stars.component';
import { CompactPipe } from './compact.pipe';
import { UsdPipe } from './usd.pipe';

/** Shop grid card, markup from App.renderShopProducts() in ui-reference/customer/app.js. */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [NgClass, RouterLink, UsdPipe, CompactPipe, StarsComponent, ProductMediaComponent, PortalDirective, WishlistHeartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'picking.set(false)' },
  template: `
    @let p = product();
    <div class="group product-card flex flex-col h-full">
      <div class="relative">
      <a [routerLink]="['/products', p.id]" class="ca-media relative overflow-hidden aspect-[4/5] cursor-pointer block">
        <app-product-media [product]="p" />
        @if (outOfStock()) {
          <span class="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white bg-[#C9503A] px-2.5 py-1">Sold out</span>
        } @else {
          <span class="absolute top-3 left-3 right-[7.25rem] truncate text-[10px] font-semibold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-[#0F3D32]" [class.max-sm:hidden]="!!tag()">{{ p.category }}</span>
        }
        @if (tag(); as tag) {
          <span class="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 border"
            [ngClass]="tag === 'New' ? 'bg-[#FFF1EC] text-[#C9503A] border-[#FFCDBF]' : 'bg-[#0F3D32] text-white border-[#0F3D32]'">{{ tag }}</span>
        }
      </a>
        <app-wishlist-heart class="absolute bottom-2.5 right-2.5 z-10" [productId]="p.id" [name]="p.name" />
      </div>

      <div class="pt-4 flex-1 flex flex-col">
        <p class="fm-brand-chip">{{ p.brand }}</p>
        <a [routerLink]="['/products', p.id]" class="mt-1.5 font-medium text-[#0F3D32] text-base leading-snug line-clamp-2 hover:text-[#4F7F72] transition-colors duration-500 cursor-pointer block">{{ p.name }}</a>
        <p class="text-[13px] text-[#5E6F68] mt-1 line-clamp-1">{{ sizes() }}</p>
        <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-2 text-xs">
          @if (stats().count) {
            <app-stars [rating]="stats().average" />
            <span class="text-[#5E6F68]">({{ stats().count | compact }})</span>
          }
          @if (p.soldTotal) {
            <span class="font-semibold text-[#0F3D32]" [class.pl-1.5]="stats().count">@if (stats().count) { <span class="font-normal text-[#85968E]">·</span> }{{ p.soldTotal | compact }} sold</span>
          }
        </div>
        <p class="mt-2 text-sm font-medium text-[#0F3D32]">@if (hasSeveralPrices()) { <span class="font-normal text-[#5E6F68]">From </span> }{{ from() | usd }}</p>

        <div class="mt-auto pt-3">
          <button type="button" (click)="open()" [disabled]="outOfStock()" class="fm-text-link disabled:opacity-40 disabled:cursor-not-allowed">
            {{ outOfStock() ? 'Sold out' : '+ Quick add' }}
          </button>
        </div>
      </div>
    </div>

    @if (picking()) {
      <div appPortal class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div (click)="picking.set(false)" class="absolute inset-0 modal-overlay"></div>
        <div role="dialog" aria-modal="true" [attr.aria-label]="'Choose a size for ' + p.name" class="relative z-10 w-full max-w-sm bg-white border border-[#DCE5E0] shadow-2xl animate-fadeIn">
          <button type="button" (click)="picking.set(false)" aria-label="Close" class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[#5E6F68] hover:text-[#0F3D32]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          <div class="flex items-center gap-4 p-5 pr-12 border-b border-[#DCE5E0]">
            <img [src]="p.images[0]" [alt]="p.name" class="w-16 h-16 object-cover bg-[#F0F3EF] shrink-0" />
            <div class="min-w-0">
              <p class="fm-brand-chip">{{ p.brand }}</p>
              <p class="mt-1 font-medium text-[#0F3D32] leading-snug line-clamp-2">{{ p.name }}</p>
            </div>
          </div>
          <div class="p-5">
            <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F3D32] mb-3">Choose a size</p>
            <div class="grid gap-2">
              @for (v of forSale(); track v.id) {
                <button type="button" (click)="add(v)" [disabled]="stockOf(v) === 0"
                  class="flex items-center justify-between gap-3 px-4 py-3 border border-[#DCE5E0] bg-white text-left text-sm transition-colors hover:border-[#0F3D32] hover:bg-[#F7F8F4] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#DCE5E0] disabled:hover:bg-white">
                  <span class="font-semibold text-[#0F3D32]">{{ v.sizeLabel }}<span class="font-normal text-[#5E6F68]"> · {{ v.volume }}</span></span>
                  <span class="font-medium text-[#0F3D32]">{{ stockOf(v) === 0 ? 'Sold out' : (v.price | usd) }}</span>
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProductCardComponent {
  private readonly cart = inject(CartService);
  private readonly catalog = inject(ProductService);
  private readonly reviews = inject(ReviewService);
  private readonly toast = inject(ToastService);

  readonly product = input.required<Product>();
  readonly picking = signal(false);
  readonly forSale = computed(() => this.product().variants.filter((v) => v.forSale));
  readonly from = computed(() => startingPrice(this.product()));
  readonly hasSeveralPrices = computed(() => new Set(this.forSale().map((v) => v.price)).size > 1);
  /** A new launch outranks "Best Seller" when both apply. */
  readonly tag = computed(() => (this.catalog.newArrivalIds().has(this.product().id) ? 'New' : this.catalog.bestSellerIds().has(this.product().id) ? 'Best Seller' : ''));
  readonly outOfStock = computed(() => productAvailable(this.product()) === 0);
  readonly stats = computed(() => this.reviews.statsFor(this.product().id));
  readonly sizes = computed(() => this.product().variants.filter((v) => v.forSale).map((v) => v.sizeLabel).join(' · '));

  stockOf(variant: ProductVariant): number {
    return availableOf(variant);
  }

  open(): void {
    const sizes = this.forSale();
    // A single size needs no picker.
    if (sizes.length === 1) this.add(sizes[0]);
    else this.picking.set(true);
  }

  add(variant: ProductVariant): void {
    try {
      this.cart.add(this.product().id, variant.id, 1);
      this.picking.set(false);
      this.toast.show(`${this.product().name} (${variant.sizeLabel}) added to your bag.`);
      this.cart.openDrawer();
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/data/mock-db.service';
import { defaultVariant, productAvailable, type Product } from '../../core/models';
import { CartService } from '../../core/services/cart.service';
import { ProductService } from '../../core/services/product.service';
import { ReviewService } from '../../core/services/review.service';
import { ToastService } from '../../core/services/toast.service';
import { ProductMediaComponent } from './product-media.component';
import { StarsComponent } from './stars.component';
import { CompactPipe } from './compact.pipe';
import { UsdPipe } from './usd.pipe';

/** Shop grid card — markup from App.renderShopProducts() in ui-reference/customer/app.js. */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [NgClass, RouterLink, UsdPipe, CompactPipe, StarsComponent, ProductMediaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = product();
    <div class="group product-card flex flex-col h-full">
      <a [routerLink]="['/products', p.id]" class="ca-media relative overflow-hidden aspect-[4/5] cursor-pointer block">
        <app-product-media [product]="p" />
        @if (outOfStock()) {
          <span class="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white bg-[#C9503A] px-2.5 py-1">Sold out</span>
        } @else {
          <span class="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#0F3D32]">{{ p.category }}</span>
        }
        @if (tag(); as tag) {
          <span class="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 border"
            [ngClass]="tag === 'New' ? 'bg-[#FFF1EC] text-[#C9503A] border-[#FFCDBF]' : 'bg-[#0F3D32] text-white border-[#0F3D32]'">{{ tag }}</span>
        }
      </a>

      <div class="pt-4 flex-1 flex flex-col">
        <p class="fm-brand-chip">{{ p.brand }}</p>
        <a [routerLink]="['/products', p.id]" class="mt-1.5 font-medium text-[#0F3D32] text-base leading-snug line-clamp-2 hover:text-[#4F7F72] transition-colors duration-500 cursor-pointer block">{{ p.name }}</a>
        <p class="text-[13px] text-[#5E6F68] mt-1 line-clamp-1">{{ sizes() }}</p>
        <div class="flex items-center gap-1.5 mt-2 text-xs">
          @if (stats().count) {
            <app-stars [rating]="stats().average" />
            <span class="text-[#5E6F68]">({{ stats().count | compact }})</span>
          }
          @if (p.soldTotal) {
            <span class="font-semibold text-[#0F3D32]" [class.pl-1.5]="stats().count">@if (stats().count) { <span class="font-normal text-[#85968E]">·</span> }{{ p.soldTotal | compact }} sold</span>
          }
        </div>
        <p class="mt-2 text-sm font-medium text-[#0F3D32]">{{ variant()?.price ?? 0 | usd }}</p>

        <div class="mt-auto pt-3">
          <button type="button" (click)="quickAdd()" [disabled]="outOfStock()" class="fm-text-link disabled:opacity-40 disabled:cursor-not-allowed">
            {{ outOfStock() ? 'Sold out' : '+ Quick add' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ProductCardComponent {
  private readonly cart = inject(CartService);
  private readonly catalog = inject(ProductService);
  private readonly reviews = inject(ReviewService);
  private readonly toast = inject(ToastService);

  readonly product = input.required<Product>();
  readonly variant = computed(() => defaultVariant(this.product()));
  /** A new launch outranks "Best Seller" when both apply. */
  readonly tag = computed(() => (this.catalog.newArrivalIds().has(this.product().id) ? 'New' : this.catalog.bestSellerIds().has(this.product().id) ? 'Best Seller' : ''));
  readonly outOfStock = computed(() => productAvailable(this.product()) === 0);
  readonly stats = computed(() => this.reviews.statsFor(this.product().id));
  readonly sizes = computed(() => this.product().variants.filter((v) => v.forSale).map((v) => v.sizeLabel).join(' · '));

  quickAdd(): void {
    const variant = this.variant();
    if (!variant) return;
    try {
      this.cart.add(this.product().id, variant.id, 1);
      this.toast.show(`${this.product().name} (${variant.sizeLabel}) added to your bag.`);
      this.cart.openDrawer();
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }
}

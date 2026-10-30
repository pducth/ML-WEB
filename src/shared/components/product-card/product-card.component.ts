import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Product } from '../../../core/models/product.model';
import { CurrencyPipe } from '../../pipes/currency.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly prioritizeImage = input(false);
  readonly selected = output<Product>();

  get isOutOfStock(): boolean {
    return this.product().variants.every((variant) => variant.available <= 0);
  }

  get startingPrice(): number {
    const prices = this.product().variants.map((variant) => variant.price);
    if (prices.length === 0) {
      throw new RangeError(`Product ${this.product().id} must have at least one variant.`);
    }

    return Math.min(...prices);
  }

  selectProduct(): void {
    this.selected.emit(this.product());
  }
}

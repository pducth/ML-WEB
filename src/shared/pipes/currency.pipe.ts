import { Pipe } from '@angular/core';
import type { PipeTransform } from '@angular/core';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

@Pipe({
  name: 'currency',
  standalone: true,
})
export class CurrencyPipe implements PipeTransform {
  transform(amount: number): string {
    if (!Number.isFinite(amount)) {
      throw new RangeError('Currency amount must be a finite number.');
    }

    return usdFormatter.format(amount);
  }
}

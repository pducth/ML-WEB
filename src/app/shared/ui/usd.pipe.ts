import { Pipe, type PipeTransform } from '@angular/core';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Store currency is USD shown with 2 decimals, e.g. $34.00 (A12 settings). */
@Pipe({ name: 'usd', standalone: true })
export class UsdPipe implements PipeTransform {
  transform(amount: number | null | undefined): string {
    return usd.format(Number.isFinite(amount) ? (amount as number) : 0);
  }
}

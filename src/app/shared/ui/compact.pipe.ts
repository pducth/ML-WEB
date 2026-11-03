import { Pipe, type PipeTransform } from '@angular/core';

/** 1234 → "1.2K", 1000 → "1K", 12500 → "13K", small numbers unchanged. */
@Pipe({ name: 'compact', standalone: true })
export class CompactPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    const n = Number.isFinite(value) ? (value as number) : 0;
    if (n < 1000) return String(n);
    const thousands = n / 1000;
    return `${thousands < 10 ? Math.round(thousands * 10) / 10 : Math.round(thousands)}K`;
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import type { Review } from '../../../../core/models';
import { ProductService } from '../../../../core/services/product.service';
import { HIDE_REASONS, ReviewService } from '../../../../core/services/review.service';
import { ToastService } from '../../../../core/services/toast.service';

const PAGE = 15;

/** A14 — Review moderation (hidden reviews leave the PDP average and count). */
@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="chips" role="tablist" aria-label="Filter reviews">
      @for (f of filters; track f) { <button type="button" class="chip" role="tab" [class.on]="filter() === f" [attr.aria-selected]="filter() === f" (click)="filter.set(f); page.set(1)">{{ f }} ({{ count(f) }})</button> }
    </div>
    <div class="tool">
      <input type="search" placeholder="Search by product, customer or text…" aria-label="Search reviews" [value]="search()" (input)="search.set($any($event.target).value); page.set(1)" />
      <select aria-label="Rating" (change)="rating.set(+$any($event.target).value); page.set(1)">
        <option value="0">All ratings</option>
        @for (n of [5, 4, 3, 2, 1]; track n) { <option [value]="n">{{ n }} stars</option> }
      </select>
    </div>
    <div class="card">
      @for (r of pageItems(); track r.id) {
        <div class="row">
          <div style="flex:1;min-width:240px">
            <b><a [routerLink]="['/products', r.productId]" target="_blank" style="color:inherit">{{ productName(r.productId) }}</a></b> · {{ r.authorName }}
            <span class="stars">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}</span>
            <small class="muted"> · {{ r.createdAt | date: 'dd/MM/yyyy' }} · Verified purchase</small><br />
            <span style="color:var(--mut)">{{ r.comment || '(rating only)' }}</span>
            @if (r.media.length) { <br /><small class="muted">{{ mediaSummary(r) }}</small> }
            @if (r.status === 'Hidden') { <br /><small class="err-text">Hidden: {{ r.hiddenReason }}</small> }
          </div>
          @if (r.status === 'Hidden') {
            <span><span class="b x">Hidden</span> <button class="btn sm gh" type="button" (click)="unhide(r)">Show again</button></span>
          } @else {
            <span style="display:flex;gap:6px">
              <select [attr.aria-label]="'Reason to hide review by ' + r.authorName" (change)="setReason(r.id, $any($event.target).value)">
                <option value="">Select a reason to hide</option>
                @for (h of hideReasons; track h) { <option [value]="h">{{ h }}</option> }
              </select>
              <button class="btn sm or" type="button" [disabled]="!reasons()[r.id]" (click)="hide(r)">Hide</button>
            </span>
          }
        </div>
      } @empty {
        <p class="muted" style="margin:0">No reviews match.</p>
      }
      <div class="pager">
        <span>{{ filtered().length }} reviews · page {{ page() }} / {{ pages() }}</span>
        <button class="btn sm gh" type="button" [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
        <button class="btn sm gh" type="button" [disabled]="page() === pages()" (click)="page.set(page() + 1)">Next</button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent {
  private readonly reviews = inject(ReviewService);
  private readonly products = inject(ProductService);
  private readonly toast = inject(ToastService);

  mediaSummary(r: Review): string {
    const photos = r.media.filter((m) => m.type === 'image').length;
    const videos = r.media.length - photos;
    return [photos ? `${photos} photo${photos > 1 ? 's' : ''}` : '', videos ? `${videos} video` : ''].filter(Boolean).join(' + ') + ' attached';
  }

  readonly hideReasons = HIDE_REASONS;
  readonly filters = ['All', 'Visible', 'Hidden'] as const;
  readonly filter = signal<'All' | 'Visible' | 'Hidden'>('All');
  readonly search = signal('');
  readonly rating = signal(0);
  readonly page = signal(1);
  readonly reasons = signal<Record<string, string>>({});

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.reviews
      .reviews()
      .filter((r) => (this.filter() === 'All' || r.status === this.filter()) && (!this.rating() || r.rating === this.rating()))
      .filter((r) => !q || r.authorName.toLowerCase().includes(q) || r.comment.toLowerCase().includes(q) || this.productName(r.productId).toLowerCase().includes(q));
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE)));
  readonly pageItems = computed(() => this.filtered().slice((this.page() - 1) * PAGE, this.page() * PAGE));

  productName(id: string): string {
    return this.products.getById(id)?.name ?? 'Removed product';
  }

  count(f: 'All' | 'Visible' | 'Hidden'): number {
    return f === 'All' ? this.reviews.reviews().length : this.reviews.reviews().filter((r) => r.status === f).length;
  }

  setReason(id: string, reason: string): void {
    this.reasons.update((all) => ({ ...all, [id]: reason }));
  }

  hide(r: Review): void {
    try {
      this.reviews.hide(r.id, this.reasons()[r.id] ?? '');
      this.toast.show('Review hidden · excluded from the product rating', 'info');
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  unhide(r: Review): void {
    this.reviews.unhide(r.id);
    this.toast.show('Review shown again');
  }
}

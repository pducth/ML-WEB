import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { OrderStatus, type OrderItem, type ReviewMedia } from '../../../../core/models';
import { CANCEL_REASONS, OrderService, RETURN_REASONS } from '../../../../core/services/order.service';
import { REVIEW_MAX_LENGTH, REVIEW_MAX_PHOTOS, ReviewService } from '../../../../core/services/review.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrderStatusPillComponent } from '../../../../shared/ui/order-status-pill.component';
import { StoreModalComponent } from '../../../../shared/ui/store-modal.component';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';

const FLOW = [OrderStatus.PaymentPending, OrderStatus.Processing, OrderStatus.Shipping, OrderStatus.Completed];

interface ReviewDraft {
  rating: number;
  comment: string;
  media: ReviewMedia[];
}

/** C15: Order detail, cancellation, 7-day return and verified reviews. */
@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [NgClass, DatePipe, FormsModule, RouterLink, UsdPipe, OrderStatusPillComponent, StoreModalComponent],
  templateUrl: './order-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent {
  private readonly orders = inject(OrderService);
  private readonly reviews = inject(ReviewService);
  private readonly toast = inject(ToastService);
  readonly settings = inject(SettingsService).settings;

  readonly orderId = input.required<string>();
  readonly order = computed(() => this.orders.getPlacedMine(this.orderId()));

  readonly cancelReasons = CANCEL_REASONS;
  readonly returnReasons = RETURN_REASONS;
  readonly maxLength = REVIEW_MAX_LENGTH;
  readonly maxPhotos = REVIEW_MAX_PHOTOS;

  readonly cancelOpen = signal(false);
  readonly cancelReason = signal('');
  readonly returnOpen = signal(false);
  readonly returnReason = signal('');
  readonly sealIntact = signal(false);
  readonly modalError = signal('');
  readonly drafts = signal<Record<string, ReviewDraft>>({});

  readonly canCancel = computed(() => (this.order() ? this.orders.canCancel(this.order()!) : false));
  readonly canReturn = computed(() => (this.order() ? this.orders.canRequestReturn(this.order()!) : false));
  readonly returnDeadline = computed(() => (this.order() ? this.orders.returnDeadline(this.order()!) : null));
  readonly canReview = computed(() => (this.order() ? this.reviews.canReview(this.order()!) : false));
  readonly selectedReturnReason = computed(() => this.returnReasons.find((r) => r.label === this.returnReason()));
  readonly refundPreview = computed(() => {
    const order = this.order();
    const reason = this.selectedReturnReason();
    return order && reason ? this.orders.refundFor(order, reason.storeFault) : 0;
  });

  /** Progress bar: the happy path, or the terminal branch the order ended in. */
  readonly steps = computed(() => {
    const order = this.order();
    if (!order) return [];
    const reached = new Set(order.timeline.map((t) => t.status));
    const flow = FLOW.slice(1);
    const extra = [OrderStatus.Cancelled, OrderStatus.ReturnPending, OrderStatus.Returned].filter((s) => reached.has(s));
    return [...flow, ...extra].map((status) => ({ status, done: reached.has(status), current: order.status === status }));
  });

  readonly timeline = computed(() => [...(this.order()?.timeline ?? [])].reverse());

  myReview(item: OrderItem) {
    return this.reviews.mineFor(this.orderId(), item.productId);
  }

  draftFor(item: OrderItem): ReviewDraft {
    const existing = this.myReview(item);
    return this.drafts()[item.productId] ?? { rating: existing?.rating ?? 0, comment: existing?.comment ?? '', media: existing?.media ?? [] };
  }

  setDraft(item: OrderItem, changes: Partial<ReviewDraft>): void {
    this.drafts.update((all) => ({ ...all, [item.productId]: { ...this.draftFor(item), ...changes } }));
  }

  /** Adds the photos / video picked in the file dialog to the draft (up to 4 photos and one video). */
  async attach(item: OrderItem, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    try {
      const media = [...this.draftFor(item).media];
      for (const file of files) {
        const next = await this.reviews.readMedia(file);
        if (next.type === 'video') {
          const index = media.findIndex((m) => m.type === 'video');
          if (index >= 0) media.splice(index, 1);
        } else if (media.filter((m) => m.type === 'image').length >= this.maxPhotos) {
          throw new Error(`You can attach up to ${this.maxPhotos} photos.`);
        }
        media.push(next);
      }
      this.setDraft(item, { media });
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  removeMedia(item: OrderItem, index: number): void {
    this.setDraft(item, { media: this.draftFor(item).media.filter((_, i) => i !== index) });
  }

  submitReview(item: OrderItem): void {
    const order = this.order();
    if (!order) return;
    const draft = this.draftFor(item);
    // A review is final: once it exists the page shows it read-only.
    if (this.myReview(item)) return;
    try {
      this.reviews.submit(order, item.productId, draft.rating, draft.comment, draft.media);
      this.toast.show('Thank you for your review!');
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }

  openCancel(): void {
    this.cancelReason.set('');
    this.modalError.set('');
    this.cancelOpen.set(true);
  }

  confirmCancel(): void {
    try {
      this.orders.cancel(this.orderId(), this.cancelReason());
      this.cancelOpen.set(false);
      this.toast.show(this.order()?.paymentStatus === 'Refunded' ? 'Order cancelled. A full refund has been issued.' : 'Your order has been cancelled.', 'info');
    } catch (error) {
      this.modalError.set(errorMessage(error));
    }
  }

  openReturn(): void {
    this.returnReason.set('');
    this.sealIntact.set(false);
    this.modalError.set('');
    this.returnOpen.set(true);
  }

  confirmReturn(): void {
    try {
      this.orders.requestReturn(this.orderId(), this.returnReason(), this.sealIntact());
      this.returnOpen.set(false);
      this.toast.show('Return requested. We will review it shortly.');
    } catch (error) {
      this.modalError.set(errorMessage(error));
    }
  }
}

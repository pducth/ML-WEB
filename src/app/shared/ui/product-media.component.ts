import { ChangeDetectionStrategy, Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import type { Product } from '../../core/models';

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Product card image with a hover preview: on pointer hover the packshot cross-fades to the product's
 * texture clip (loaded only on first hover) or, without one, to a texture or before/after still.
 * Reduced motion: clips are not played.
 */
@Component({
  selector: 'app-product-media',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block w-full h-full overflow-hidden',
    '(mouseenter)': 'onEnter()',
    '(mouseleave)': 'stop()',
  },
  template: `
    <img [src]="product().images[0]" [alt]="product().name" [attr.loading]="eager() ? 'eager' : 'lazy'" class="card-img w-full h-full object-cover" />
    @if (hover(); as h) {
      @if (h.type === 'video') {
        @if (loaded()) {
          <video #clip [src]="h.src" muted playsinline loop preload="auto" aria-hidden="true"
            class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" [class.opacity-0]="!showing()"
            (playing)="playing.set(true)"></video>
        }
      } @else {
        <img [src]="h.src" alt="" aria-hidden="true" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" [class.opacity-0]="!active()" />
      }
    }
  `,
})
export class ProductMediaComponent {
  readonly product = input.required<Product>();
  readonly eager = input(false);

  private readonly clip = viewChild<ElementRef<HTMLVideoElement>>('clip');
  readonly hover = computed(() => this.product().hover ?? null);
  readonly loaded = signal(false);
  readonly active = signal(false);
  readonly playing = signal(false);
  readonly showing = computed(() => this.active() && this.playing());

  onEnter(): void {
    if (!reducedMotion()) this.start();
  }

  start(): void {
    const hover = this.hover();
    if (!hover) return;
    this.active.set(true);
    if (hover.type !== 'video') return;
    if (!this.loaded()) {
      this.loaded.set(true);
      // The <video> renders on the next change detection; play once it exists.
      queueMicrotask(() => setTimeout(() => this.play()));
      return;
    }
    this.play();
  }

  stop(): void {
    this.active.set(false);
    const video = this.clip()?.nativeElement;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    this.playing.set(false);
  }

  private play(): void {
    const video = this.clip()?.nativeElement;
    if (!video || !this.active()) return;
    // Autoplay can be refused (data saver); the packshot simply stays visible.
    video.play().catch(() => this.playing.set(false));
  }
}

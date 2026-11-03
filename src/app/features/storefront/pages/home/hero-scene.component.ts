import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Product } from '../../../../core/models';

export interface HeroProduct {
  brand: string;
  product: Product;
}

/**
 * Hero stage: a sky backdrop and a ring of product cards built from packshots cut out of data/store/product_data
 * (public/assets/hero-hd). Sizes are container units of the stage: 1 cqw = 1 % of the hero width.
 * Elements with a `data-depth` drift with the pointer and on scroll, which is what reads as 3D.
 */
/** Card tint and the natural ingredient shown on the card of each house. */
const CARDS: Record<string, { tone: string; tag: string }> = {
  AROMATICA: { tone: 'sage', tag: 'Rosemary' },
  RAHUA: { tone: 'peach', tag: 'Rainforest herbs' },
  DAVINES: { tone: 'cream', tag: 'Roucou oil' },
  MOROCCANOIL: { tone: 'sand', tag: 'Argan oil' },
};

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

@Component({
  selector: 'app-hero-scene',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './hero-scene.component.css',
  host: {
    class: 'fm-scene',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerleave)': 'onPointerLeave()',
  },
  template: `
    <div class="fm-scene__stage">
      <div class="fm-scene__deck" data-depth="8" role="region" aria-roledescription="carousel" aria-label="Signature products"
        (mouseenter)="paused.set(true)" (mouseleave)="paused.set(false)" (focusin)="paused.set(true)" (focusout)="paused.set(false)"
        (pointerdown)="onDown($event)" (pointermove)="onMove($event)" (pointerup)="onUp()" (pointercancel)="onUp()">
        @for (item of products(); track item.product.id) {
          @let info = cardInfo(item.brand);
          <a class="fm-scene__card fm-scene__card--{{ info.tone }}" [routerLink]="['/products', item.product.id]" (click)="onCard($event)" draggable="false"
            [attr.aria-label]="item.brand + ' — ' + item.product.name">
            <span class="fm-scene__card-brand">{{ item.brand }}</span>
            <span class="fm-scene__card-media"><img [src]="'/assets/hero-hd/' + item.product.key + '.webp'" alt="" draggable="false" /></span>
            <span class="fm-scene__card-name">{{ item.product.name }}</span>
            <span class="fm-scene__card-tag">{{ info.tag }}</span>
          </a>
        }
      </div>
    </div>

    <div class="fm-scene__content">
      <div class="fm-scene__copy">
        <p class="fm-eyebrow fm-animate-in">FOLMARÉ · The curated edit</p>
        <h1 class="fm-animate-in fm-delay-1">Botanical Haircare <i>for Modern Rituals</i></h1>
        <p class="fm-scene__lead fm-animate-in fm-delay-2">Discover haircare from nature, curated just for you.</p>
      </div>
      <div class="fm-scene__cta fm-animate-in fm-delay-3">
        <a routerLink="/shop" class="btn-primary">
          Discover collection
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" /></svg>
        </a>
      </div>
    </div>
  `,
})
export class HeroSceneComponent {
  readonly products = input.required<HeroProduct[]>();

  readonly paused = signal(false);

  cardInfo(brand: string) {
    return CARDS[brand.toUpperCase()] ?? { tone: 'cream', tag: 'Botanical care' };
  }

  // ---- the ring: all cards sit on an ellipse and keep floating; it turns slowly or by dragging ----
  private theta = 20;
  private vel = 0;
  private dragging = false;
  private lastX = 0;
  private moved = 0;

  onDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.dragging = true;
    this.lastX = event.clientX;
    this.moved = 0;
  }

  onMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const target = event.currentTarget as HTMLElement;
    const dx = event.clientX - this.lastX;
    this.lastX = event.clientX;
    this.moved += Math.abs(dx);
    if (this.moved > 6 && !target.hasPointerCapture(event.pointerId)) target.setPointerCapture(event.pointerId);
    this.theta += dx * 0.3;
    this.vel = dx * 0.3;
  }

  onUp(): void {
    this.dragging = false;
  }

  onCard(event: Event): void {
    if (this.moved > 6) event.preventDefault();
  }

  private layoutCards(time: number): void {
    const n = this.cards.length;
    this.cards.forEach((el, i) => {
      const a = ((this.theta + (i * 360) / n) * Math.PI) / 180;
      const c = Math.cos(a);
      const front = (c + 1) / 2;
      const bob = reducedMotion() ? 0 : Math.sin(time / 900 + i * 1.7) * 0.7;
      const tilt = Math.sin(a);
      el.style.transform = `translate(calc(-50% + ${(15.5 * tilt).toFixed(2)}cqw), ${(-(1 - c) * 3.4 + bob).toFixed(2)}cqw) perspective(70cqw) rotateY(${(-tilt * 38).toFixed(1)}deg) rotateX(${((1 - c) * 6).toFixed(1)}deg) rotate(${(tilt * 5 + Math.sin(time / 1700 + i) * 1.2).toFixed(2)}deg) scale(${(0.7 + 0.3 * c).toFixed(3)})`;
      el.style.zIndex = String(10 + Math.round(c * 10));
      el.style.opacity = (0.62 + 0.38 * front).toFixed(2);
      el.style.filter = `brightness(${(0.86 + 0.14 * front).toFixed(2)}) saturate(${(0.8 + 0.2 * front).toFixed(2)}) blur(${((1 - front) * 0.9).toFixed(1)}px)`;
    });
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private pointer = { x: 0, y: 0 };
  private eased = { x: 0, y: 0, scroll: 0 };
  private frame = 0;
  private cards: HTMLElement[] = [];

  constructor() {
    afterNextRender(() => {
      const el = this.host.nativeElement;
      this.cards = [...el.querySelectorAll<HTMLElement>('.fm-scene__card')];
      const layers = [...el.querySelectorAll<HTMLElement>('[data-depth]')];
      const reduced = reducedMotion();
      const loop = (time: number) => {
        if (!this.dragging) {
          this.theta += (this.paused() || reduced ? 0 : 0.19) + this.vel;
          this.vel = Math.abs(this.vel) < 0.01 ? 0 : this.vel * 0.94;
        }
        this.layoutCards(time);
        if (!reduced) this.tick(layers);
        this.frame = requestAnimationFrame(loop);
      };
      this.frame = requestAnimationFrame(loop);
    });
    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.frame));
  }

  onPointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const rect = this.host.nativeElement.getBoundingClientRect();
    this.pointer = { x: ((event.clientX - rect.left) / rect.width - 0.5) * 2, y: ((event.clientY - rect.top) / rect.height - 0.5) * 2 };
  }

  onPointerLeave(): void {
    this.pointer = { x: 0, y: 0 };
  }

  private tick(layers: HTMLElement[]): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const scroll = Math.max(0, -rect.top);
    const k = 0.08;
    this.eased.x += (this.pointer.x - this.eased.x) * k;
    this.eased.y += (this.pointer.y - this.eased.y) * k;
    this.eased.scroll += (scroll - this.eased.scroll) * 0.2;
    for (const layer of layers) {
      const depth = Number(layer.dataset['depth']);
      const rate = Number(layer.dataset['scroll'] ?? 0);
      // Near layers travel further than far ones; scrolling pushes near layers down faster.
      layer.style.translate = `${(-this.eased.x * depth).toFixed(2)}px ${(-this.eased.y * depth * 0.45 + this.eased.scroll * rate).toFixed(2)}px`;
    }
  }
}

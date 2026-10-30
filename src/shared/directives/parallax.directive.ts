import {
  Directive,
  ElementRef,
  PLATFORM_ID,
  Renderer2,
  input,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { AfterViewInit, OnDestroy } from '@angular/core';

export type ParallaxAxis = 'x' | 'y' | 'both';

@Directive({
  selector: '[appParallax]',
  standalone: true,
})
export class ParallaxDirective implements AfterViewInit, OnDestroy {
  readonly speed = input(0.35, { alias: 'appParallax' });
  readonly axis = input<ParallaxAxis>('y', { alias: 'appParallaxAxis' });
  readonly mouseStrength = input(12, { alias: 'appParallaxMouseStrength' });
  readonly depth = input(0, { alias: 'appParallaxDepth' });
  readonly scale = input(1, { alias: 'appParallaxScale' });
  readonly tilt = input(false, { alias: 'appParallaxTilt' });
  readonly layer = input<number | null>(null, { alias: 'appParallaxLayer' });
  readonly stage = input(false, { alias: 'appParallaxStage' });

  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private baseTransform = 'none';
  private originalTransform = '';
  private originalTranslate = '';
  private transformChanged = false;
  private stylesCaptured = false;
  private frameId: number | null = null;
  private scrollY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;
  private currentMouseX = 0;
  private currentMouseY = 0;

  private readonly onScroll = (): void => {
    this.scrollY = window.scrollY;
    this.scheduleFrame();
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    this.targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.targetMouseY = (event.clientY / window.innerHeight) * 2 - 1;
    this.scheduleFrame();
  };

  ngAfterViewInit(): void {
    if (!this.isBrowser || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.baseTransform = window.getComputedStyle(this.element).transform;
    this.originalTransform = this.element.style.getPropertyValue('transform');
    this.originalTranslate = this.element.style.getPropertyValue('translate');
    this.stylesCaptured = true;
    this.scrollY = window.scrollY;
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    this.scheduleFrame();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) {
      return;
    }

    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('mousemove', this.onMouseMove);
    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    if (this.stylesCaptured) {
      this.restoreStyle('translate', this.originalTranslate);
      if (this.transformChanged) {
        this.restoreStyle('transform', this.originalTransform);
      }
    }
  }

  private scheduleFrame(): void {
    if (this.frameId === null) {
      this.frameId = window.requestAnimationFrame(() => this.updatePosition());
    }
  }

  private updatePosition(): void {
    this.frameId = null;
    this.currentMouseX += (this.targetMouseX - this.currentMouseX) * 0.08;
    this.currentMouseY += (this.targetMouseY - this.currentMouseY) * 0.08;

    if (this.stage()) {
      const tiltX = -this.currentMouseY * 3.5;
      const tiltY = this.currentMouseX * 4.5;
      this.renderer.setStyle(this.element, 'transform', `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`);
      this.transformChanged = true;
      this.scheduleWhileMouseMoves();
      return;
    }

    const layer = this.layer();
    if (layer !== null) {
      const factors = [
        { x: -6, y: -4, scroll: 0.44, z: -100, scale: 1.22 },
        { x: -14, y: -9, scroll: 0.47, z: -50, scale: 1.12 },
        { x: -24, y: -15, scroll: 0.5, z: 0, scale: 1.03 },
        { x: -36, y: -22, scroll: 0.53, z: 50, scale: 1.04 },
        { x: -52, y: -30, scroll: 0.56, z: 100, scale: 1.05 },
      ][layer - 1];

      if (factors) {
        const x = this.currentMouseX * factors.x;
        const y = this.currentMouseY * factors.y + this.scrollY * factors.scroll;
        this.renderer.setStyle(
          this.element,
          'transform',
          `translate3d(${x}px, ${y}px, ${factors.z}px) scale(${factors.scale})`,
        );
        this.transformChanged = true;
      }
      this.scheduleWhileMouseMoves();
      return;
    }

    const axis = this.axis();
    const offsetX =
      axis === 'y' ? 0 : this.currentMouseX * this.mouseStrength();
    const offsetY =
      axis === 'x'
        ? 0
        : this.scrollY * this.speed() + this.currentMouseY * this.mouseStrength();

    this.renderer.setStyle(this.element, 'translate', `${offsetX}px ${offsetY}px`);

    if (this.tilt()) {
      const base = this.baseTransform === 'none' ? '' : `${this.baseTransform} `;
      const tiltX = -this.currentMouseY * 3.5;
      const tiltY = this.currentMouseX * 4.5;
      this.renderer.setStyle(
        this.element,
        'transform',
        `${base}perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
      );
      this.transformChanged = true;
    } else if (this.depth() !== 0 || this.scale() !== 1) {
      const base = this.baseTransform === 'none' ? '' : `${this.baseTransform} `;
      this.renderer.setStyle(
        this.element,
        'transform',
        `${base}translateZ(${this.depth()}px) scale(${this.scale()})`,
      );
      this.transformChanged = true;
    }

    this.scheduleWhileMouseMoves();
  }

  private scheduleWhileMouseMoves(): void {
    const mouseIsSettled =
      Math.abs(this.targetMouseX - this.currentMouseX) < 0.001 &&
      Math.abs(this.targetMouseY - this.currentMouseY) < 0.001;

    if (!mouseIsSettled) {
      this.scheduleFrame();
    }
  }

  private restoreStyle(property: string, value: string): void {
    if (value) {
      this.renderer.setStyle(this.element, property, value);
    } else {
      this.renderer.removeStyle(this.element, property);
    }
  }
}

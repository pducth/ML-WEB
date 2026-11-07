import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

/** Slides its element in the first time it scrolls into view; `appReveal` is the delay in milliseconds. */
@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: { class: 'fm-reveal', '[style.--reveal-delay]': 'delay() + "ms"' },
})
export class RevealDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly delay = input<number | ''>(0, { alias: 'appReveal' });
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.el.classList.add('is-revealed');
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this.el.classList.add('is-revealed');
        this.observer?.disconnect();
      },
      { threshold: 0.35 },
    );
    this.observer.observe(this.el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}

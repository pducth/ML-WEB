import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/** Moves its element to <body> so a fixed overlay is never trapped inside a transformed ancestor. */
@Directive({ selector: '[appPortal]', standalone: true })
export class PortalDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  ngOnInit(): void {
    document.body.appendChild(this.el);
  }

  ngOnDestroy(): void {
    this.el.remove();
  }
}

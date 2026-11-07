import { Directive, ElementRef, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';

const EYE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.4 4.5-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

/** Adds a show / hide button to a password input. Wraps the input, so ngModel and styling keep working. */
@Directive({ selector: 'input[appPasswordToggle]', standalone: true })
export class PasswordToggleDirective implements OnInit, OnDestroy {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private button?: HTMLButtonElement;
  private wrapper?: HTMLElement;
  private unlisten?: () => void;

  ngOnInit(): void {
    const parent = this.input.parentNode;
    if (!parent) return;
    this.wrapper = this.renderer.createElement('div');
    this.renderer.setStyle(this.wrapper, 'position', 'relative');
    this.renderer.insertBefore(parent, this.wrapper, this.input);
    this.renderer.appendChild(this.wrapper, this.input);
    this.renderer.setStyle(this.input, 'padding-right', '3rem');

    this.button = this.renderer.createElement('button');
    this.renderer.setAttribute(this.button, 'type', 'button');
    this.renderer.setAttribute(this.button, 'tabindex', '0');
    this.renderer.setStyle(this.button, 'position', 'absolute');
    this.renderer.setStyle(this.button, 'right', '0');
    this.renderer.setStyle(this.button, 'top', '0');
    this.renderer.setStyle(this.button, 'bottom', '0');
    this.renderer.setStyle(this.button, 'width', '3rem');
    this.renderer.setStyle(this.button, 'display', 'flex');
    this.renderer.setStyle(this.button, 'align-items', 'center');
    this.renderer.setStyle(this.button, 'justify-content', 'center');
    this.renderer.setStyle(this.button, 'color', '#5E6F68');
    this.renderer.setStyle(this.button, 'cursor', 'pointer');
    this.renderer.appendChild(this.wrapper, this.button);
    this.render();
    this.unlisten = this.renderer.listen(this.button, 'click', () => {
      this.input.type = this.input.type === 'password' ? 'text' : 'password';
      this.render();
    });
  }

  ngOnDestroy(): void {
    this.unlisten?.();
  }

  private render(): void {
    const shown = this.input.type === 'text';
    if (!this.button) return;
    this.button.innerHTML = shown ? EYE_OFF : EYE;
    this.renderer.setAttribute(this.button, 'aria-label', shown ? 'Hide password' : 'Show password');
    this.renderer.setAttribute(this.button, 'aria-pressed', String(shown));
  }
}

import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Label of the button that goes ahead (default "Yes"). */
  confirmLabel?: string;
  /** Label of the button that backs out (default "No"). */
  cancelLabel?: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
}

/** Asks the shopper "are you sure?" through one shared dialog (see ConfirmDialogComponent). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<(ConfirmOptions & { resolve: (answer: boolean) => void }) | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    // A new question replaces an unanswered one, which counts as "no".
    this.request()?.resolve(false);
    return new Promise<boolean>((resolve) => this.request.set({ ...options, resolve }));
  }

  answer(value: boolean): void {
    const current = this.request();
    this.request.set(null);
    current?.resolve(value);
  }
}

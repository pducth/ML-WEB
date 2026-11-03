import { Injectable, computed, signal } from '@angular/core';
import type { ToastVariant } from '../../shared/components/toast/toast.component';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly notification = signal<{ message: string; variant: ToastVariant; id: number } | null>(null);

  readonly message = computed(() => this.notification()?.message ?? null);
  readonly variant = computed(() => this.notification()?.variant ?? 'info');
  /** Changes on every call so the same message shown twice restarts the timer. */
  readonly id = computed(() => this.notification()?.id ?? 0);

  show(message: string, variant: ToastVariant = 'success'): void {
    this.notification.set({ message, variant, id: Date.now() });
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  clear(): void {
    this.notification.set(null);
  }
}

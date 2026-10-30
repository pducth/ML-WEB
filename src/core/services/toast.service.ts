import { Injectable, computed, signal } from '@angular/core';
import type { ToastVariant } from '../../shared/components/toast/toast.component';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly notification = signal<{ message: string; variant: ToastVariant } | null>(null);

  readonly message = computed(() => this.notification()?.message ?? null);
  readonly variant = computed(() => this.notification()?.variant ?? 'info');

  show(message: string, variant: ToastVariant = 'error'): void {
    this.notification.set({ message, variant });
  }

  clear(): void {
    this.notification.set(null);
  }
}

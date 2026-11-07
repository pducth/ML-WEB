import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { readJson, writeJson } from '../data/browser-storage';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

const KEY_PREFIX = 'folmare:wishlist:';
const GUEST = 'guest';

/**
 * Saved products, newest first. A signed-in shopper has a list of their own; a guest's list is kept under a
 * guest key and merged into the account the moment they sign in. Stored in the browser, per shopper.
 */
@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly owner = computed(() => this.auth.currentUser()?.id ?? GUEST);

  readonly ids = signal<string[]>([]);
  readonly count = computed(() => this.ids().length);
  private readonly saved = computed(() => new Set(this.ids()));

  constructor() {
    effect(() => {
      const owner = this.owner();
      untracked(() => this.load(owner));
    });
  }

  has(productId: string): boolean {
    return this.saved().has(productId);
  }

  toggle(productId: string, name?: string): void {
    const adding = !this.has(productId);
    this.update(adding ? [productId, ...this.ids()] : this.ids().filter((id) => id !== productId));
    this.toast.show(adding ? `${name ?? 'Product'} added to your wishlist.` : `${name ?? 'Product'} removed from your wishlist.`, adding ? 'success' : 'info');
  }

  remove(productId: string): void {
    this.update(this.ids().filter((id) => id !== productId));
  }

  private load(owner: string): void {
    let list = readJson<string[]>('local', KEY_PREFIX + owner, []);
    if (owner !== GUEST) {
      // Items saved while signed out join the account list.
      const guest = readJson<string[]>('local', KEY_PREFIX + GUEST, []);
      if (guest.length) {
        list = [...guest.filter((id) => !list.includes(id)), ...list];
        writeJson('local', KEY_PREFIX + owner, list);
        writeJson('local', KEY_PREFIX + GUEST, null);
      }
    }
    this.ids.set(list);
  }

  private update(list: string[]): void {
    this.ids.set(list);
    writeJson('local', KEY_PREFIX + this.owner(), list.length ? list : null);
  }
}

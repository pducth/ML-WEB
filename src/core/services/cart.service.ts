import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../environment/environment';
import type { CartItem } from '../models/cart-item.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/cartItems`;
  private readonly itemCountValue = signal(0);

  readonly itemCount = this.itemCountValue.asReadonly();
  readonly drawerOpen = signal(false);

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  resetItemCount(): void {
    this.itemCountValue.set(0);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  getItems(userId: string | null) {
    const params = new HttpParams().set('userId', userId ?? 'null');
    return this.http.get<CartItem[]>(this.endpoint, { params });
  }

  addItem(item: Omit<CartItem, 'id' | 'addedAt'>) {
    return this.http.post<CartItem>(this.endpoint, {
      ...item,
      addedAt: new Date().toISOString(),
    });
  }

  addOrUpdateItem(
    item: Omit<CartItem, 'id' | 'addedAt'>,
    available: number,
  ): Observable<CartItem> {
    return this.getItems(item.userId).pipe(
      switchMap((items) => {
        const existingItem = items.find(
          (cartItem) =>
            cartItem.productId === item.productId && cartItem.variantId === item.variantId,
        );

        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          return throwError(() => new RangeError('Cart item quantity must be a positive integer.'));
        }

        if (item.quantity > available || (existingItem && existingItem.quantity + item.quantity > available)) {
          return throwError(() => new RangeError(`Only ${available} units of this size are available.`));
        }

        const updatedItemCount =
          items.reduce((total, cartItem) => total + cartItem.quantity, 0) + item.quantity;
        const mutation = existingItem
          ? this.updateQuantity(existingItem.id, existingItem.quantity + item.quantity)
          : this.addItem(item);

        return mutation.pipe(
          tap(() => this.itemCountValue.set(updatedItemCount)),
        );
      }),
    );
  }

  updateQuantity(id: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new RangeError('Cart item quantity must be a positive integer.');
    }

    return this.http
      .patch<CartItem>(`${this.endpoint}/${encodeURIComponent(id)}`, { quantity });
  }

  removeItem(id: string) {
    return this.http.delete<void>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }

  clear(userId: string | null) {
    return this.getItems(userId).pipe(
      switchMap((items) =>
        items.length
          ? forkJoin(items.map((item) => this.removeItem(item.id)))
          : of([]),
      ),
      switchMap(() => this.refreshItemCount(userId)),
      map(() => undefined),
    );
  }

  refreshItemCount(userId: string | null): Observable<number> {
    return this.getItems(userId).pipe(
      map((items) => items.reduce((total, item) => total + item.quantity, 0)),
      tap((count) => this.itemCountValue.set(count)),
    );
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../environment/environment';
import type { CartItem } from '../models/cart-item.model';

const CART_STORAGE_KEY = 'haircare_cart_items';

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

  getItems(userId: string | null): Observable<CartItem[]> {
    const params = new HttpParams().set('userId', userId ?? 'null');
    return this.http.get<CartItem[]>(this.endpoint, { params }).pipe(
      catchError(() => of(this.readStoredItems(userId))),
    );
  }

  addItem(item: Omit<CartItem, 'id' | 'addedAt'>): Observable<CartItem> {
    const addedItem: CartItem = {
      ...item,
      id: `cart-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      addedAt: new Date().toISOString(),
    };

    return this.http.post<CartItem>(this.endpoint, addedItem).pipe(
      catchError(() => {
        const stored = this.readAllStored();
        stored.push(addedItem);
        this.saveStored(stored);
        return of(addedItem);
      }),
    );
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

  updateQuantity(id: string, quantity: number): Observable<CartItem> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new RangeError('Cart item quantity must be a positive integer.');
    }

    return this.http
      .patch<CartItem>(`${this.endpoint}/${encodeURIComponent(id)}`, { quantity })
      .pipe(
        catchError(() => {
          const stored = this.readAllStored();
          const target = stored.find((it) => it.id === id);
          if (target) {
            target.quantity = quantity;
            this.saveStored(stored);
            return of(target);
          }
          return throwError(() => new Error('Item not found in cart'));
        }),
      );
  }

  removeItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${encodeURIComponent(id)}`).pipe(
      catchError(() => {
        const stored = this.readAllStored().filter((it) => it.id !== id);
        this.saveStored(stored);
        return of(undefined);
      }),
    );
  }

  clear(userId: string | null): Observable<void> {
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

  private readAllStored(): CartItem[] {
    try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  private readStoredItems(userId: string | null): CartItem[] {
    const all = this.readAllStored();
    return all.filter((it) => it.userId === userId || (!it.userId && !userId));
  }

  private saveStored(items: CartItem[]): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      // localStorage may fail
    }
  }
}

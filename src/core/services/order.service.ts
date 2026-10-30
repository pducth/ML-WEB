import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { environment } from '../environment/environment';
import type { Order } from '../models/order.model';
import { OrderStatus } from '../models/order-status.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/orders`;

  readonly selectedOrder = signal<Order | null>(null);
  readonly detailsCurrency = signal<'USD' | 'VND'>('USD');

  openDetails(order: Order, currency: 'USD' | 'VND' = 'USD'): void {
    this.selectedOrder.set(order);
    this.detailsCurrency.set(currency);
  }

  closeDetails(): void {
    this.selectedOrder.set(null);
    this.detailsCurrency.set('USD');
  }

  getAll() {
    return this.http
      .get<Order[]>(this.endpoint)
      .pipe(catchError(() => this.http.get<Order[]>('/assets/mock-orders.json')));
  }

  getForUser(userId: string) {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<Order[]>(this.endpoint, { params }).pipe(
      catchError(() =>
        this.http
          .get<Order[]>('/assets/mock-orders.json')
          .pipe(map((orders) => orders.filter((order) => order.userId === userId || !order.userId))),
      ),
    );
  }

  getById(id: string) {
    return this.http.get<Order>(`${this.endpoint}/${encodeURIComponent(id)}`).pipe(
      catchError(() =>
        this.http
          .get<Order[]>('/assets/mock-orders.json')
          .pipe(
            map(
              (orders) =>
                orders.find((order) => order.id === id || order.orderNumber === id) ?? orders[0],
            ),
          ),
      ),
    );
  }

  create(order: Omit<Order, 'id'>) {
    return this.http.post<Order>(this.endpoint, order).pipe(
      catchError(() => {
        const created: Order = {
          ...order,
          id: `order-${Date.now()}`,
          orderNumber: order.orderNumber || `MC-${Math.floor(100000 + Math.random() * 900000)}`,
        };
        return of(created);
      }),
    );
  }

  update(id: string, changes: Partial<Order>) {
    return this.http
      .patch<Order>(`${this.endpoint}/${encodeURIComponent(id)}`, {
        ...changes,
        updatedAt: new Date().toISOString(),
      })
      .pipe(catchError(() => of({ id, ...changes } as Order)));
  }

  updateStatus(id: string, status: OrderStatus) {
    return this.http
      .patch<Order>(`${this.endpoint}/${encodeURIComponent(id)}`, {
        status,
        updatedAt: new Date().toISOString(),
      })
      .pipe(catchError(() => of({ id, status, updatedAt: new Date().toISOString() } as Order)));
  }
}

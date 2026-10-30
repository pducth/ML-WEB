import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../environment/environment';
import type { Order } from '../models/order.model';
import type { OrderStatus } from '../models/order-status.model';

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
    return this.http.get<Order[]>(this.endpoint);
  }

  getForUser(userId: string) {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<Order[]>(this.endpoint, { params });
  }

  getById(id: string) {
    return this.http.get<Order>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }

  create(order: Omit<Order, 'id'>) {
    return this.http.post<Order>(this.endpoint, order);
  }

  update(id: string, changes: Partial<Order>) {
    return this.http.patch<Order>(`${this.endpoint}/${encodeURIComponent(id)}`, {
      ...changes,
      updatedAt: new Date().toISOString(),
    });
  }

  updateStatus(id: string, status: OrderStatus) {
    return this.http.patch<Order>(`${this.endpoint}/${encodeURIComponent(id)}`, {
      status,
      updatedAt: new Date().toISOString(),
    });
  }
}

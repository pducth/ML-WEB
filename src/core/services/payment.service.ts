import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../environment/environment';
import type { Payment, PaymentMethod } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/payments`;

  getById(id: string) {
    return this.http.get<Payment>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }

  create(payment: Omit<Payment, 'id'>) {
    return this.http.post<Payment>(this.endpoint, payment);
  }

  updateMethod(id: string, method: PaymentMethod) {
    return this.http.patch<Payment>(`${this.endpoint}/${encodeURIComponent(id)}`, { method });
  }
}

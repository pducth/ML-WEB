import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { environment } from '../environment/environment';
import type { Payment, PaymentMethod } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/payments`;

  getById(id: string) {
    return this.http.get<Payment>(`${this.endpoint}/${encodeURIComponent(id)}`).pipe(
      catchError(() =>
        of({
          id,
          orderId: 'MC-202688',
          amount: 66,
          method: 'cash_on_delivery' as PaymentMethod,
          status: 'paid',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Payment),
      ),
    );
  }

  create(payment: Omit<Payment, 'id'>) {
    return this.http.post<Payment>(this.endpoint, payment).pipe(
      catchError(() => {
        const created: Payment = {
          ...payment,
          id: `pay-${Date.now()}`,
        } as Payment;
        return of(created);
      }),
    );
  }

  updateMethod(id: string, method: PaymentMethod) {
    return this.http
      .patch<Payment>(`${this.endpoint}/${encodeURIComponent(id)}`, { method })
      .pipe(catchError(() => of({ id, method } as Payment)));
  }
}

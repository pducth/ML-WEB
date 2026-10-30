import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { environment } from '../environment/environment';
import type { Voucher } from '../models/voucher.model';

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/vouchers`;

  getAll() {
    return this.http
      .get<Voucher[]>(this.endpoint)
      .pipe(catchError(() => this.http.get<Voucher[]>('/assets/mock-vouchers.json')));
  }

  create(voucher: Omit<Voucher, 'id'>) {
    return this.http.post<Voucher>(this.endpoint, voucher).pipe(
      catchError(() => {
        const created: Voucher = { ...voucher, id: `voucher-${Date.now()}` } as Voucher;
        return of(created);
      }),
    );
  }

  update(id: string, voucher: Partial<Voucher>) {
    return this.http
      .patch<Voucher>(`${this.endpoint}/${encodeURIComponent(id)}`, voucher)
      .pipe(catchError(() => of({ id, ...voucher } as Voucher)));
  }

  getByCode(code: string) {
    const norm = code.trim().toUpperCase();
    const params = new HttpParams().set('code', norm);
    return this.http.get<Voucher[]>(this.endpoint, { params }).pipe(
      catchError(() =>
        this.http
          .get<Voucher[]>('/assets/mock-vouchers.json')
          .pipe(map((vouchers) => vouchers.filter((v) => v.code.toUpperCase() === norm))),
      ),
    );
  }
}

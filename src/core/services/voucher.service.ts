import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../environment/environment';
import type { Voucher } from '../models/voucher.model';

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/vouchers`;

  getAll() {
    return this.http.get<Voucher[]>(this.endpoint);
  }

  create(voucher: Omit<Voucher, 'id'>) {
    return this.http.post<Voucher>(this.endpoint, voucher);
  }

  update(id: string, voucher: Partial<Voucher>) {
    return this.http.patch<Voucher>(`${this.endpoint}/${encodeURIComponent(id)}`, voucher);
  }

  getByCode(code: string) {
    const params = new HttpParams().set('code', code.trim().toUpperCase());
    return this.http.get<Voucher[]>(this.endpoint, { params });
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../environment/environment';
import type { Address } from '../models/address.model';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/addresses`;

  getForUser(userId: string) {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<Address[]>(this.endpoint, { params });
  }

  create(address: Omit<Address, 'id'>) {
    return this.http.post<Address>(this.endpoint, address);
  }

  update(id: string, address: Partial<Address>) {
    return this.http.patch<Address>(`${this.endpoint}/${encodeURIComponent(id)}`, address);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }
}

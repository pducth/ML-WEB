import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { environment } from '../environment/environment';
import type { Address } from '../models/address.model';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/addresses`;

  getForUser(userId: string) {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<Address[]>(this.endpoint, { params }).pipe(
      catchError(() =>
        this.http
          .get<Address[]>('/assets/mock-addresses.json')
          .pipe(map((addresses) => addresses.filter((a) => a.userId === userId || !a.userId))),
      ),
    );
  }

  create(address: Omit<Address, 'id'>) {
    return this.http.post<Address>(this.endpoint, address).pipe(
      catchError(() => {
        const created: Address = { ...address, id: `address-${Date.now()}` } as Address;
        return of(created);
      }),
    );
  }

  update(id: string, address: Partial<Address>) {
    return this.http
      .patch<Address>(`${this.endpoint}/${encodeURIComponent(id)}`, address)
      .pipe(catchError(() => of({ id, ...address } as Address)));
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.endpoint}/${encodeURIComponent(id)}`).pipe(
      catchError(() => of(undefined)),
    );
  }
}

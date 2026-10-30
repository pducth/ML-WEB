import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../environment/environment';
import type { Review } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/reviews`;

  getForProduct(productId: string) {
    const params = new HttpParams().set('productId', productId).set('status', 'approved');
    return this.http.get<Review[]>(this.endpoint, { params });
  }

  getAll() {
    return this.http.get<Review[]>(this.endpoint);
  }

  update(id: string, changes: Pick<Review, 'status'>) {
    return this.http.patch<Review>(`${this.endpoint}/${encodeURIComponent(id)}`, changes);
  }

  create(review: Omit<Review, 'id'>) {
    return this.http.post<Review>(this.endpoint, review);
  }
}

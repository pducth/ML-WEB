import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { environment } from '../environment/environment';
import type { Review } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/reviews`;

  getForProduct(productId: string) {
    const params = new HttpParams().set('productId', productId).set('status', 'approved');
    return this.http.get<Review[]>(this.endpoint, { params }).pipe(
      catchError(() =>
        this.http
          .get<Review[]>('/assets/mock-reviews.json')
          .pipe(
            map((reviews) =>
              reviews.filter((r) => r.productId === productId && r.status === 'approved'),
            ),
          ),
      ),
    );
  }

  getAll() {
    return this.http
      .get<Review[]>(this.endpoint)
      .pipe(catchError(() => this.http.get<Review[]>('/assets/mock-reviews.json')));
  }

  update(id: string, changes: Pick<Review, 'status'>) {
    return this.http
      .patch<Review>(`${this.endpoint}/${encodeURIComponent(id)}`, changes)
      .pipe(catchError(() => of({ id, ...changes } as Review)));
  }

  create(review: Omit<Review, 'id'>) {
    return this.http.post<Review>(this.endpoint, review).pipe(
      catchError(() => {
        const created: Review = { ...review, id: `review-${Date.now()}` } as Review;
        return of(created);
      }),
    );
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../environment/environment';
import type { Product, ProductCategory } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/products`;
  readonly addProductModalOpen = signal(false);
  readonly previewCatalog = signal(false);

  openAddProductModal(): void {
    this.addProductModalOpen.set(true);
  }

  closeAddProductModal(): void {
    this.addProductModalOpen.set(false);
  }

  getAll(category?: ProductCategory, allowPreview = false) {
    const params = category ? new HttpParams().set('category', category) : undefined;
    const request = this.http.get<Product[]>(this.endpoint, { params });
    if (!allowPreview) return request;

    return request.pipe(
      tap(() => this.previewCatalog.set(false)),
      catchError(() =>
        this.http.get<Product[]>('/assets/storefront-catalog-preview.json').pipe(
          map((products) => category ? products.filter((product) => product.category === category) : products),
          tap(() => this.previewCatalog.set(true)),
        ),
      ),
    );
  }

  getById(id: string, allowPreview = false) {
    const request = this.http.get<Product>(`${this.endpoint}/${encodeURIComponent(id)}`);
    if (!allowPreview) return request;

    return request.pipe(
      tap(() => this.previewCatalog.set(false)),
      catchError((apiError: unknown) =>
        this.http.get<Product[]>('/assets/storefront-catalog-preview.json').pipe(
          map((products) => products.find((product) => product.id === id)),
          switchMap((product) => {
            if (!product) return throwError(() => apiError);
            this.previewCatalog.set(true);
            return of(product);
          }),
        ),
      ),
    );
  }

  search(query: string) {
    const params = new HttpParams().set('q', query);
    return this.http.get<Product[]>(this.endpoint, { params });
  }

  create(product: Omit<Product, 'id'>) {
    return this.http.post<Product>(this.endpoint, product);
  }

  update(id: string, product: Partial<Product>) {
    return this.http.patch<Product>(`${this.endpoint}/${encodeURIComponent(id)}`, product);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }
}

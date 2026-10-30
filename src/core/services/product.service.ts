import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../environment/environment';
import type { Product, ProductCategory } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/products`;
  readonly addProductModalOpen = signal(false);

  openAddProductModal(): void {
    this.addProductModalOpen.set(true);
  }

  closeAddProductModal(): void {
    this.addProductModalOpen.set(false);
  }

  getAll(category?: ProductCategory) {
    const params = category ? new HttpParams().set('category', category) : undefined;
    return this.http.get<Product[]>(this.endpoint, { params });
  }

  getById(id: string) {
    return this.http.get<Product>(`${this.endpoint}/${encodeURIComponent(id)}`);
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

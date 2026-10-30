import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../core/services/product.service';
import { ToastService } from '../../../core/services/toast.service';
import type { ProductCategory } from '../../../core/models/product.model';

@Component({
  selector: 'app-add-product-modal',
  standalone: true,
  templateUrl: './add-product-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddProductModalComponent {
  readonly productsApi = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  close(): void {
    this.productsApi.closeAddProductModal();
  }

  submit(event: SubmitEvent, name: string, categoryKey: string, priceInput: string, stockInput: string): void {
    event.preventDefault();
    const price = Number(priceInput);
    const stock = Number(stockInput);
    const categories: Record<string, ProductCategory> = {
      oil: 'Treatment/Oil',
      shampoo: 'Shampoo',
      mask: 'Hair Masks',
    };
    const category = categories[categoryKey];
    if (!name.trim() || !category || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      this.toast.show('Vui lòng nhập thông tin sản phẩm hợp lệ.', 'error');
      return;
    }

    const id = `custom-${Date.now()}`;
    const now = new Date().toISOString();
    this.productsApi
      .create({
        name: name.trim(),
        slug: id,
        category,
        description: 'Sản phẩm Moroccanoil chính hãng được cập nhật vào kho hàng hệ thống.',
        imageUrl: '/assets/images/unsplash-photo-1522337360788-8b13dee7a37e.jpg',
        rating: 5,
        reviewCount: 0,
        variants: [
          {
            id: `${id}-standard`,
            sku: `MORO-${id.toUpperCase()}`,
            volume: 1,
            unit: 'ml',
            price,
            onHand: stock,
            reserved: 0,
            incoming: 0,
            available: stock,
          },
        ],
        tags: [],
        createdAt: now,
        updatedAt: now,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.close();
          this.toast.show(`Đã thêm sản phẩm "${name}" thành công!`, 'success');
        },
        error: () => this.toast.show('Không thể lưu sản phẩm mới.', 'error'),
      });
  }
}

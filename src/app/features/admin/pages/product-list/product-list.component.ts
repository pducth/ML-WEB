import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { PRODUCT_CATEGORIES, productAvailable, startingPrice, type Product } from '../../../../core/models';
import { ProductService } from '../../../../core/services/product.service';
import { ToastService } from '../../../../core/services/toast.service';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';
import { AdminModalComponent } from '../../ui/admin-modal.component';

const PAGE = 15;
const STEP_LABEL: Record<string, string> = { cleanse: 'Cleanse', condition: 'Condition', treat: 'Treat', style_protect: 'Style' };

/** A04 — Product list. */
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, UsdPipe, AdminModalComponent],
  template: `
    <div class="tool">
      <input type="search" placeholder="Search products or categories…" aria-label="Search products" [value]="search()" (input)="search.set($any($event.target).value); page.set(1)" />
      <select aria-label="Category" (change)="category.set($any($event.target).value); page.set(1)">
        <option value="all">All categories</option>
        @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
      </select>
      <select aria-label="Status" (change)="status.set($any($event.target).value); page.set(1)">
        <option value="all">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
      </select>
      <a class="btn" routerLink="/admin/products/new">+ Add product</a>
    </div>
    <div class="card">
      <div class="tw">
        <table>
          <tr><th>Product</th><th>Category</th><th>Variants</th><th>Starting price</th><th>Available</th><th>Quiz tags</th><th>Active</th><th></th></tr>
          @for (p of pageItems(); track p.id) {
            <tr>
              <td class="wrap"><img class="thumb" [src]="p.images[0]" alt="" />{{ p.name }}</td>
              <td>{{ p.category }}</td>
              <td>{{ sizes(p) }}</td>
              <td>{{ price(p) | usd }}</td>
              <td><span [class]="available(p) ? 'b g' : 'b r'">{{ available(p) }}</span></td>
              <td>@if (p.quiz.needs.length && p.quiz.scalp.length) { <span class="b">{{ p.quiz.needs.join(' · ') }} · {{ stepLabel[p.quiz.step] }}</span> } @else { <span class="b w">Missing tags</span> }</td>
              <td><button type="button" class="sw" [class.off]="p.status !== 'Active'" role="switch" [attr.aria-checked]="p.status === 'Active'" [attr.aria-label]="'Active: ' + p.name" (click)="toggle(p)"></button></td>
              <td>
                <a class="btn sm gh" [routerLink]="['/admin/products', p.id, 'edit']">Edit</a>
                <button type="button" class="btn sm gh" style="margin-left:6px" [disabled]="hasOrders(p)" [title]="hasOrders(p) ? 'Has order history — set Inactive instead' : 'Delete product'" (click)="toDelete.set(p)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="muted">No products match.</td></tr>
          }
        </table>
      </div>
      <div class="pager">
        <span>{{ filtered().length }} products · page {{ page() }} / {{ pages() }}</span>
        <button class="btn sm gh" type="button" [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
        <button class="btn sm gh" type="button" [disabled]="page() === pages()" (click)="page.set(page() + 1)">Next</button>
      </div>
    </div>

    <app-admin-modal [open]="toDelete() !== null" title="Delete product" confirmLabel="Delete" tone="danger" (closed)="toDelete.set(null)" (confirmed)="confirmDelete()">
      <p style="margin:0">Permanently delete <b>{{ toDelete()?.name }}</b>? This is only allowed because it has never been ordered.</p>
    </app-admin-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
  private readonly products = inject(ProductService);
  private readonly toast = inject(ToastService);

  readonly categories = PRODUCT_CATEGORIES;
  readonly stepLabel = STEP_LABEL;
  readonly search = signal('');
  readonly category = signal('all');
  readonly status = signal('all');
  readonly page = signal(1);
  readonly toDelete = signal<Product | null>(null);

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.products
      .products()
      .filter((p) => (this.category() === 'all' || p.category === this.category()) && (this.status() === 'all' || p.status === this.status()))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.variants.some((v) => v.sku.toLowerCase().includes(q)));
  });
  readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE)));
  readonly pageItems = computed(() => this.filtered().slice((this.page() - 1) * PAGE, this.page() * PAGE));

  readonly price = startingPrice;
  readonly available = productAvailable;
  sizes(p: Product): string {
    return p.variants.map((v) => v.sizeLabel).join(' · ');
  }
  hasOrders(p: Product): boolean {
    return this.products.productsWithOrders().has(p.id);
  }

  toggle(p: Product): void {
    const next = p.status === 'Active' ? 'Inactive' : 'Active';
    this.products.setStatus(p.id, next);
    this.toast.show(`${p.name} is now ${next}${next === 'Inactive' ? ' — hidden from the store and the Hair Quiz' : ''}.`, 'info');
  }

  confirmDelete(): void {
    const p = this.toDelete();
    if (!p) return;
    try {
      this.products.delete(p.id);
      this.toast.show('Product deleted.');
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
    this.toDelete.set(null);
  }
}

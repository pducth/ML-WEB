import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, forkJoin, of } from 'rxjs';
import { environment } from '../../../../core/environment/environment';
import { OrderStatus } from '../../../../core/models/order-status.model';
import type { Order } from '../../../../core/models/order.model';
import type { Product, ProductCategory, ProductQuizTags, ProductVariant } from '../../../../core/models/product.model';
import { PRODUCT_CATEGORIES } from '../../../../core/models/product.model';
import type { Review } from '../../../../core/models/review.model';
import type { User } from '../../../../core/models/user.model';
import type { Voucher } from '../../../../core/models/voucher.model';
import { OrderService } from '../../../../core/services/order.service';
import { ProductService } from '../../../../core/services/product.service';
import { ReviewService } from '../../../../core/services/review.service';
import { ToastService } from '../../../../core/services/toast.service';
import { VoucherService } from '../../../../core/services/voucher.service';
import { DEMO_USERS } from '../../../../core/services/auth.service';

type AdminPageKey =
  | 'dashboard'
  | 'forecasts'
  | 'products'
  | 'product-form'
  | 'inventory'
  | 'orders'
  | 'order-detail'
  | 'vouchers'
  | 'voucher-form'
  | 'customers'
  | 'reviews'
  | 'settings';
type InventoryAction = 'adjust' | 'receive';
type QuizStep = ProductQuizTags['step'];

interface ProductDraft {
  name: string;
  category: ProductCategory;
  description: string;
  imageUrl: string;
  defaultSku: string;
  defaultVolume: number;
  defaultUnit: 'ml' | 'g';
  defaultPrice: number;
  tags: string;
  quizNeeds: string;
  quizScalp: string;
  quizStep: QuizStep;
}

interface VoucherDraft {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscount: number | null;
  usageLimit: number;
  startsAt: string;
  expiresAt: string;
  active: boolean;
}

interface StoreSettings {
  storeName: string;
  contactEmail: string;
  shippingFee: number;
  paymentDeadlineMinutes: number;
  lowStockThreshold: number;
  safetyStock: number;
  forecastHorizon: number;
  wapeThreshold: number;
}

const EMPTY_PRODUCT_DRAFT: ProductDraft = {
  name: '',
  category: 'Shampoo',
  description: '',
  imageUrl: '',
  defaultSku: '',
  defaultVolume: 250,
  defaultUnit: 'ml',
  defaultPrice: 0,
  tags: '',
  quizNeeds: '',
  quizScalp: '',
  quizStep: 'cleanse',
};

const EMPTY_VOUCHER_DRAFT: VoucherDraft = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  minimumOrderAmount: 0,
  maximumDiscount: null,
  usageLimit: 100,
  startsAt: new Date().toISOString().slice(0, 10),
  expiresAt: '',
  active: true,
};

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'HairCare Insight',
  contactEmail: 'care@haircare.vn',
  shippingFee: 5,
  paymentDeadlineMinutes: 30,
  lowStockThreshold: 15,
  safetyStock: 15,
  forecastHorizon: 14,
  wapeThreshold: 20,
};

const PAGE_TITLES: Record<AdminPageKey, string> = {
  dashboard: 'Overview',
  forecasts: 'Revenue forecast',
  products: 'Products',
  'product-form': 'Product details',
  inventory: 'Inventory',
  orders: 'Orders',
  'order-detail': 'Order details',
  vouchers: 'Discount codes',
  'voucher-form': 'Voucher details',
  customers: 'Customers',
  reviews: 'Reviews',
  settings: 'Store settings',
};

@Component({
  selector: 'app-admin-workspace',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink],
  templateUrl: './admin-workspace.component.html',
  styleUrl: './admin-workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWorkspaceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly productsApi = inject(ProductService);
  private readonly ordersApi = inject(OrderService);
  private readonly vouchersApi = inject(VoucherService);
  private readonly reviewsApi = inject(ReviewService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly page = signal<AdminPageKey>('dashboard');
  readonly title = computed(() => PAGE_TITLES[this.page()]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly products = signal<Product[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly vouchers = signal<Voucher[]>([]);
  readonly customers = signal<User[]>([]);
  readonly reviews = signal<Review[]>([]);
  readonly query = signal('');
  readonly statusFilter = signal('All');
  readonly productDraft = signal<ProductDraft>({ ...EMPTY_PRODUCT_DRAFT });
  readonly voucherDraft = signal<VoucherDraft>({ ...EMPTY_VOUCHER_DRAFT });
  readonly settings = signal<StoreSettings>({ ...DEFAULT_SETTINGS });
  readonly editingProductId = signal('');
  readonly editingProduct = signal<Product | null>(null);
  readonly editingVoucherId = signal('');
  readonly inventoryEdit = signal<{
    product: Product;
    variant: ProductVariant;
    action: InventoryAction;
  } | null>(null);
  readonly stockValue = signal(0);
  readonly reservedValue = signal(0);
  readonly incomingValue = signal(0);
  readonly receivingValue = signal(1);
  readonly orderId = signal('');
  readonly selectedOrder = computed(() => this.orders().find((order) => order.id === this.orderId()) ?? null);
  readonly filteredProducts = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.products().filter((product) => {
      const matchesQuery =
        !query ||
        [product.name, product.category, product.tags.join(' '), ...product.variants.map((variant) => variant.sku)]
          .join(' ')
          .toLowerCase()
          .includes(query);
      return matchesQuery;
    });
  });
  readonly filteredOrders = computed(() => {
    const filter = this.statusFilter();
    const query = this.query().trim().toLowerCase();
    return this.orders().filter((order) => {
      const matchesStatus = filter === 'All' || order.status === filter;
      const matchesQuery =
        !query ||
        `${order.orderNumber} ${order.id} ${order.voucherCode ?? ''}`.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  });
  readonly filteredVouchers = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.vouchers().filter((voucher) => !query || `${voucher.code} ${voucher.description}`.toLowerCase().includes(query));
  });
  readonly filteredCustomers = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.customers().filter((customer) =>
      !query || `${customer.fullName} ${customer.email} ${customer.phone}`.toLowerCase().includes(query),
    );
  });
  readonly averageOrderValue = computed(() => {
    const orders = this.orders();
    return orders.length ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0;
  });
  readonly recordedRevenue = computed(() => this.orders().reduce((sum, order) => sum + order.total, 0));
  readonly processingOrderCount = computed(
    () => this.orders().filter((order) => order.status === OrderStatus.Processing).length,
  );
  readonly revenueBars = [48, 62, 54, 75, 66, 83, 72, 94];
  readonly quizInsights = [
    { label: 'Hydration', value: 32 },
    { label: 'Repair', value: 24 },
    { label: 'Color', value: 18 },
    { label: 'Scalp', value: 12 },
    { label: 'Curl', value: 8 },
    { label: 'Volume', value: 6 },
  ];
  readonly forecastMetrics = [
    { category: 'Shampoo', wape: 14.2, model: 'Random Forest' },
    { category: 'Conditioner', wape: 16.8, model: 'Linear Regression' },
    { category: 'Hair Masks', wape: 18.5, model: 'Random Forest' },
    { category: 'Treatment / Oil', wape: 12.9, model: 'Linear Regression' },
    { category: 'Dry Shampoo', wape: 19.1, model: 'Linear Regression' },
    { category: 'Styling & Finishing', wape: 22.4, model: 'Random Forest' },
  ];
  readonly forecastRows = computed(() =>
    this.products()
      .flatMap((product) =>
        product.variants.map((variant) => {
          const forecast = this.forecastDemand(product);
          return {
            product,
            variant,
            forecast,
            recommended: Math.max(0, forecast + 15 - variant.available - variant.incoming),
          };
        }),
      )
      .slice(0, 20),
  );
  readonly reviewsPending = computed(() => this.reviews().filter((review) => review.status === 'pending').length);

  readonly categories = PRODUCT_CATEGORIES;
  readonly orderStatuses = Object.values(OrderStatus);
  readonly quizNeeds = ['Repair', 'Scalp', 'Color', 'Curl', 'Hydration', 'Volume', 'Styling'];
  readonly scalpTypes = ['all', 'normal', 'oily', 'dry_sensitive', 'flaky'];
  readonly quizSteps: Array<{ value: QuizStep; label: string }> = [
    { value: 'cleanse', label: 'Cleanse' },
    { value: 'condition', label: 'Condition' },
    { value: 'treat', label: 'Treat & Nourish' },
    { value: 'style_protect', label: 'Style & Protect' },
  ];

  ngOnInit(): void {
    combineLatest([this.route.data, this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([data, params]) => {
        this.page.set((data['adminPage'] as AdminPageKey | undefined) ?? 'dashboard');
        this.query.set('');
        this.statusFilter.set('All');
        this.errorMessage.set('');
        this.successMessage.set('');
        this.loadPage(params.get('productId') ?? '', params.get('voucherId') ?? '', params.get('orderId') ?? '');
      });
  }

  private loadPage(productId: string, voucherId: string, orderId: string): void {
    this.loading.set(true);
    switch (this.page()) {
      case 'dashboard':
        this.loadOrdersInitial();
        break;
      case 'forecasts':
      case 'products':
      case 'inventory':
        this.productsApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (products) => {
            this.products.set(products);
            this.loading.set(false);
          },
          error: () => this.fail('Unable to load products. Please try again.'),
        });
        break;
      case 'product-form':
        this.editingProductId.set(productId);
        this.editingProduct.set(null);
        if (!productId) {
          this.productDraft.set({ ...EMPTY_PRODUCT_DRAFT });
          this.loading.set(false);
          break;
        }
        this.productsApi.getById(productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (product) => {
            this.editingProduct.set(product);
            this.productDraft.set({
              name: product.name,
              category: product.category,
              description: product.description,
              imageUrl: product.imageUrl,
              defaultSku: product.variants[0]?.sku ?? '',
              defaultVolume: product.variants[0]?.volume ?? 250,
              defaultUnit: product.variants[0]?.unit ?? 'ml',
              defaultPrice: product.variants[0]?.price ?? 0,
              tags: product.tags.join(', '),
              quizNeeds: product.quiz?.needs.join(', ') ?? '',
              quizScalp: product.quiz?.scalp.join(', ') ?? '',
              quizStep: product.quiz?.step ?? 'cleanse',
            });
            this.loading.set(false);
          },
          error: () => this.fail('Unable to load this product.'),
        });
        break;
      case 'orders':
        this.query.set('');
        this.loadOrders();
        break;
      case 'order-detail':
        this.orderId.set(orderId);
        this.ordersApi.getById(orderId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (order) => {
            this.orders.set([order]);
            this.loading.set(false);
          },
          error: () => this.fail('Unable to load this order.'),
        });
        break;
      case 'vouchers':
        this.vouchersApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (vouchers) => {
            this.vouchers.set(vouchers);
            this.loading.set(false);
          },
          error: () => this.fail('Unable to load vouchers.'),
        });
        break;
      case 'voucher-form':
        this.editingVoucherId.set(voucherId);
        if (!voucherId) {
          this.voucherDraft.set({ ...EMPTY_VOUCHER_DRAFT });
          this.loading.set(false);
          break;
        }
        this.vouchersApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (vouchers) => {
            const voucher = vouchers.find((item) => item.id === voucherId);
            if (!voucher) {
              this.fail('The requested voucher was not found.');
              return;
            }
            this.voucherDraft.set({
              code: voucher.code,
              description: voucher.description,
              discountType: voucher.discountType,
              discountValue: voucher.discountValue,
              minimumOrderAmount: voucher.minimumOrderAmount,
              maximumDiscount: voucher.maximumDiscount ?? null,
              usageLimit: voucher.usageLimit,
              startsAt: voucher.startsAt.slice(0, 10),
              expiresAt: voucher.expiresAt.slice(0, 10),
              active: voucher.active,
            });
            this.loading.set(false);
          },
          error: () => this.fail('Unable to load vouchers.'),
        });
        break;
      case 'customers':
        this.http
          .get<User[]>(`${environment.apiUrl}/users`)
          .pipe(
            catchError(() => of(DEMO_USERS)),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe({
          next: (users) => {
            this.customers.set(users.filter((user) => user.role === 'Customer'));
            this.loading.set(false);
          },
          error: () => this.fail('Unable to load customers.'),
        });
        break;
      case 'reviews':
        this.reviewsApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (reviews) => {
            this.reviews.set(reviews);
            this.loading.set(false);
          },
          error: () => this.fail('Unable to load reviews.'),
        });
        break;
      case 'settings':
        this.loadSettings();
        this.loading.set(false);
        break;
    }
  }

  private loadOrders(): void {
    this.ordersApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: () => {
        this.fail('Unable to load orders.');
      },
    });
  }

  private fail(message: string): void {
    this.errorMessage.set(message);
    this.loading.set(false);
  }

  productQuizTags(product: Product): string {
    const tags = product.quiz?.needs ?? [];
    return tags.length ? tags.join(' · ') : 'Not configured';
  }

  availableUnits(product: Product): number {
    return product.variants.reduce((total, variant) => total + variant.available, 0);
  }

  lowStockCount(): number {
    return this.products().reduce(
      (count, product) => count + product.variants.filter((variant) => variant.available <= 15).length,
      0,
    );
  }

  orderStatusClass(status: string): string {
    if (['Completed', 'approved'].includes(status)) return 'badge success';
    if (['Cancelled', 'rejected', 'Returned'].includes(status)) return 'badge danger';
    if (['Payment Pending', 'Return Pending', 'pending'].includes(status)) return 'badge warning';
    return 'badge';
  }

  openInventoryEditor(product: Product, variant: ProductVariant, action: InventoryAction): void {
    this.inventoryEdit.set({ product, variant, action });
    this.stockValue.set(variant.onHand);
    this.reservedValue.set(variant.reserved);
    this.incomingValue.set(variant.incoming);
    this.receivingValue.set(1);
  }

  closeInventoryEditor(): void {
    this.inventoryEdit.set(null);
  }

  receiveRecommendedStock(product: Product, variant: ProductVariant): void {
    const recommended = this.recommendedQuantity(product, variant);
    if (recommended < 1) return;
    this.patchVariant(product, variant, {
      ...variant,
      incoming: variant.incoming + recommended,
    });
  }

  recommendedQuantity(product: Product, variant: ProductVariant): number {
    return Math.max(0, this.forecastDemand(product) + 15 - variant.available - variant.incoming);
  }

  private forecastDemand(product: Product): number {
    const categoryDemand: Record<string, number> = {
      Shampoo: 96,
      Conditioner: 64,
      'Hair Masks': 74,
      'Treatment/Oil': 120,
      'Dry Shampoo': 38,
      'Styling & Finishing': 90,
    };
    return Math.ceil((categoryDemand[product.category] ?? 60) / Math.max(product.variants.length, 1));
  }

  matchesInventoryQuery(product: Product, variant: ProductVariant): boolean {
    const query = this.query().trim().toLowerCase();
    return !query || `${product.name} ${variant.sku}`.toLowerCase().includes(query);
  }

  addNeed(need: string): void {
    const current = this.parseTags(this.productDraft().quizNeeds);
    if (!current.includes(need)) {
      this.updateDraft('quizNeeds', [...current, need].join(', '));
    }
  }

  saveInventory(): void {
    const edit = this.inventoryEdit();
    if (!edit) return;
    if (edit.action === 'receive') {
      const quantity = Math.floor(this.receivingValue());
      if (!Number.isFinite(quantity) || quantity <= 0) {
        this.errorMessage.set('Enter a receiving quantity greater than zero.');
        return;
      }
      this.patchVariant(edit.product, edit.variant, {
        ...edit.variant,
        onHand: edit.variant.onHand + quantity,
        incoming: Math.max(0, edit.variant.incoming - quantity),
        available: edit.variant.onHand + quantity - edit.variant.reserved,
      });
      return;
    }
    const onHand = Math.floor(this.stockValue());
    const reserved = Math.floor(this.reservedValue());
    const incoming = Math.floor(this.incomingValue());
    if ([onHand, reserved, incoming].some((value) => !Number.isFinite(value) || value < 0) || reserved > onHand) {
      this.errorMessage.set('Stock values must be non-negative and reserved stock cannot exceed on-hand stock.');
      return;
    }
    this.patchVariant(edit.product, edit.variant, {
      ...edit.variant,
      onHand,
      reserved,
      incoming,
      available: onHand - reserved,
    });
  }

  private patchVariant(product: Product, variant: ProductVariant, updated: ProductVariant): void {
    const changes: Partial<Product> = {
      variants: product.variants.map((item) => (item.id === variant.id ? updated : item)),
      updatedAt: new Date().toISOString(),
    };
    this.productsApi.update(product.id, changes).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.products.update((items) => items.map((item) => (item.id === saved.id ? saved : item)));
        this.inventoryEdit.set(null);
        this.errorMessage.set('');
        this.toast.show('Inventory updated.', 'success');
      },
      error: () => this.toast.show('Inventory could not be updated.', 'error'),
    });
  }

  deleteProduct(product: Product): void {
    if (!window.confirm(`Delete "${product.name}" from the catalog?`)) return;
    this.productsApi.delete(product.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.products.update((items) => items.filter((item) => item.id !== product.id));
        this.toast.show('Product deleted.', 'success');
      },
      error: () => this.toast.show('Product could not be deleted.', 'error'),
    });
  }

  saveProduct(): void {
    const draft = this.productDraft();
    const now = new Date().toISOString();
    const quizNeeds = this.parseTags(draft.quizNeeds);
    const quizScalp = this.parseTags(draft.quizScalp);
    const invalidNeeds = quizNeeds.filter((need) => !this.quizNeeds.includes(need));
    const invalidScalp = quizScalp.filter((scalp) => !this.scalpTypes.includes(scalp));
    if (invalidNeeds.length || invalidScalp.length) {
      this.errorMessage.set('Use only the supported Hair Quiz need and scalp labels shown in the form.');
      return;
    }
    const quiz = quizNeeds.length || quizScalp.length
      ? { needs: quizNeeds, scalp: quizScalp.length ? quizScalp : ['all'], step: draft.quizStep }
      : undefined;
    const currentProduct = this.editingProduct();
    const payload: Omit<Product, 'id'> = {
      name: draft.name.trim(),
      slug: this.slugify(draft.name),
      category: draft.category,
      description: draft.description.trim(),
      imageUrl: draft.imageUrl.trim(),
      rating: currentProduct?.rating ?? 0,
      reviewCount: currentProduct?.reviewCount ?? 0,
      variants: currentProduct?.variants ?? [
        {
          id: `variant-${Date.now()}`,
          sku: draft.defaultSku.trim() || `${this.slugify(draft.name).toUpperCase()}-DEFAULT`,
          volume: Number(draft.defaultVolume),
          unit: draft.defaultUnit,
          price: Number(draft.defaultPrice),
          onHand: 0,
          reserved: 0,
          incoming: 0,
          available: 0,
        },
      ],
      tags: this.parseTags(draft.tags),
      quiz,
      createdAt: currentProduct?.createdAt ?? now,
      updatedAt: now,
    };
    const save$ = this.editingProductId()
      ? this.productsApi.update(this.editingProductId(), payload)
      : this.productsApi.create(payload);
    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.show(this.editingProductId() ? 'Product updated.' : 'Product created.', 'success');
        void this.router.navigate(['/admin/products']);
      },
      error: () => this.errorMessage.set('Product could not be saved. Check the form and try again.'),
    });
  }

  updateDraft<K extends keyof ProductDraft>(field: K, value: ProductDraft[K]): void {
    this.productDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  private parseTags(value: string): string[] {
    return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('haircare-admin-settings');
      this.settings.set(saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) as Partial<StoreSettings> } : { ...DEFAULT_SETTINGS });
    } catch {
      this.errorMessage.set('Saved settings could not be read from this browser.');
    }
  }

  saveSettings(): void {
    try {
      localStorage.setItem('haircare-admin-settings', JSON.stringify(this.settings()));
      this.successMessage.set('Settings saved in this browser.');
      this.errorMessage.set('');
    } catch {
      this.errorMessage.set('Settings could not be saved in this browser.');
    }
  }

  updateSettings<K extends keyof StoreSettings>(field: K, value: StoreSettings[K]): void {
    this.settings.update((settings) => ({ ...settings, [field]: value }));
  }

  saveVoucher(): void {
    const draft = this.voucherDraft();
    const payload: Omit<Voucher, 'id'> = {
      code: draft.code.trim().toUpperCase(),
      description: draft.description.trim(),
      discountType: draft.discountType,
      discountValue: Number(draft.discountValue),
      minimumOrderAmount: Number(draft.minimumOrderAmount),
      maximumDiscount: draft.maximumDiscount === null ? undefined : Number(draft.maximumDiscount),
      usageLimit: Number(draft.usageLimit),
      usedCount: 0,
      startsAt: new Date(`${draft.startsAt}T00:00:00`).toISOString(),
      expiresAt: new Date(`${draft.expiresAt}T23:59:59`).toISOString(),
      active: draft.active,
    };
    const save$ = this.editingVoucherId()
      ? this.vouchersApi.update(this.editingVoucherId(), payload)
      : this.vouchersApi.create(payload);
    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.show(this.editingVoucherId() ? 'Voucher updated.' : 'Voucher created.', 'success');
        void this.router.navigate(['/admin/vouchers']);
      },
      error: () => this.errorMessage.set('Voucher could not be saved.'),
    });
  }

  toggleVoucher(voucher: Voucher): void {
    this.vouchersApi.update(voucher.id, { active: !voucher.active }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.vouchers.update((items) => items.map((item) => item.id === updated.id ? updated : item));
        this.toast.show(updated.active ? 'Voucher enabled.' : 'Voucher disabled.', 'success');
      },
      error: () => this.toast.show('Voucher status could not be changed.', 'error'),
    });
  }

  moderateReview(review: Review, status: Review['status']): void {
    this.reviewsApi.update(review.id, { status }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.reviews.update((items) => items.map((item) => item.id === updated.id ? updated : item));
        this.toast.show(`Review ${status}.`, 'success');
      },
      error: () => this.toast.show('Review status could not be changed.', 'error'),
    });
  }

  updateOrderStatus(order: Order, requestedStatus: string): void {
    const status = this.orderStatuses.find((item) => item === requestedStatus);
    if (!status) {
      this.errorMessage.set('Select a valid order status.');
      return;
    }
    this.ordersApi.updateStatus(order.id, status).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.orders.update((items) => items.map((item) => item.id === updated.id ? updated : item));
        this.toast.show('Order status updated.', 'success');
      },
      error: () => this.toast.show('Order status could not be updated.', 'error'),
    });
  }

  updateVoucherDraft<K extends keyof VoucherDraft>(field: K, value: VoucherDraft[K]): void {
    this.voucherDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  private loadOrdersInitial(): void {
    forkJoin({
      products: this.productsApi.getAll(),
      orders: this.ordersApi.getAll(),
      reviews: this.reviewsApi.getAll(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ products, orders, reviews }) => {
          this.products.set(products);
          this.orders.set(orders);
          this.reviews.set(reviews);
          this.loading.set(false);
        },
        error: () => this.fail('Dashboard data could not be loaded.'),
      });
  }
}

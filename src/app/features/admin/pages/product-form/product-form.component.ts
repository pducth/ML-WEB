import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked, type WritableSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { HAIR_LABELS, PRODUCT_CATEGORIES, SIZE_LABELS, availableOf, type ProductCategory, type RoutineStep, type SizeLabel } from '../../../../core/models';
import { ProductService, type ProductInput } from '../../../../core/services/product.service';
import { ToastService } from '../../../../core/services/toast.service';

interface VariantRow {
  enabled: boolean;
  id: string;
  sizeLabel: SizeLabel;
  sku: string;
  volume: string;
  price: number | null;
  onHand: number | null;
  forSale: boolean;
  reserved: number;
  available: number;
}

const DEFAULT_VOLUME: Record<SizeLabel, string> = { Travel: '2.4 fl oz', Full: '8.5 fl oz', 'Half-Liter': '16.9 fl oz', Liter: '33.8 fl oz' };
const SCALP_OPTIONS = [
  { id: 'all', label: 'All scalp types' },
  { id: 'normal', label: 'Normal' },
  { id: 'oily', label: 'Oily' },
  { id: 'dry_sensitive', label: 'Dry / sensitive' },
  { id: 'flaky', label: 'Dandruff / flaky' },
];
const STEPS: Array<{ id: RoutineStep; label: string }> = [
  { id: 'cleanse', label: 'Cleanse' },
  { id: 'condition', label: 'Condition' },
  { id: 'treat', label: 'Treat & Nourish' },
  { id: 'style_protect', label: 'Style & Protect' },
];
const MAX_IMAGE_SIDE = 800;

/** A05 (create) & A06 (edit) — product form. Stock levels of existing sizes are managed in A07. */
@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent {
  private readonly products = inject(ProductService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly productId = input<string>();
  readonly editing = computed(() => !!this.productId());
  readonly existing = computed(() => (this.productId() ? this.products.getById(this.productId()!) : undefined));

  readonly categories = PRODUCT_CATEGORIES;
  readonly labels = HAIR_LABELS;
  readonly scalpOptions = SCALP_OPTIONS;
  readonly steps = STEPS;

  readonly name = signal('');
  readonly category = signal<ProductCategory>('Shampoo');
  readonly description = signal('');
  readonly benefits = signal('');
  readonly ingredients = signal('');
  readonly howToUse = signal('');
  readonly images = signal<string[]>([]);
  readonly imageUrl = signal('');
  readonly scalp = signal<string[]>(['all']);
  readonly needs = signal<string[]>([]);
  readonly step = signal<RoutineStep>('cleanse');
  readonly allowSubstitute = signal(true);
  readonly active = signal(true);
  readonly variants = signal<VariantRow[]>([]);
  readonly error = signal('');

  constructor() {
    // Only the route id is tracked: later store writes must not wipe what the admin is typing.
    effect(() => {
      this.productId();
      untracked(() => this.fill());
    });
  }

  private fill(): void {
    {
      const p = this.existing();
      if (p) {
        this.name.set(p.name);
        this.category.set(p.category);
        this.description.set(p.description);
        this.benefits.set(p.keyBenefits.join('\n'));
        this.ingredients.set(p.ingredients);
        this.howToUse.set(p.howToUse);
        this.images.set([...p.images]);
        this.scalp.set([...p.quiz.scalp]);
        this.needs.set([...p.quiz.needs]);
        this.step.set(p.quiz.step);
        this.allowSubstitute.set(p.allowAutoSubstitute);
        this.active.set(p.status === 'Active');
      }
      this.variants.set(
        SIZE_LABELS.map((size) => {
          const v = p?.variants.find((x) => x.sizeLabel === size);
          return {
            enabled: p ? !!v : size === 'Full',
            id: v?.id ?? '',
            sizeLabel: size,
            sku: v?.sku ?? '',
            volume: v?.volume ?? DEFAULT_VOLUME[size],
            price: v?.price ?? null,
            onHand: v?.onHand ?? null,
            forSale: v?.forSale ?? true,
            reserved: v?.reserved ?? 0,
            available: v ? availableOf(v) : 0,
          };
        }),
      );
    }
  }

  toggleIn(list: WritableSignal<string[]>, id: string): void {
    list.update((values) => (values.includes(id) ? values.filter((v) => v !== id) : [...values, id]));
  }

  updateVariant(index: number, changes: Partial<VariantRow>): void {
    this.variants.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));
  }

  enableVariant(index: number, enabled: boolean): void {
    const row = this.variants()[index];
    this.updateVariant(index, { enabled, sku: row.sku || this.products.suggestSku(this.category(), row.sizeLabel) });
  }

  addImageUrl(): void {
    const url = this.imageUrl().trim();
    if (!url) return;
    if (this.images().length >= 6) {
      this.toast.error('A product can have up to 6 images.');
      return;
    }
    this.images.update((list) => [...list, url]);
    this.imageUrl.set('');
  }

  async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).slice(0, 6 - this.images().length);
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        this.images.update((list) => [...list, '']);
        const dataUrl = await this.resize(file);
        this.images.update((list) => [...list.filter((x) => x !== ''), dataUrl]);
      } catch {
        this.images.update((list) => list.filter((x) => x !== ''));
        this.toast.error(`Could not read ${file.name}.`);
      }
    }
    input.value = '';
  }

  removeImage(index: number): void {
    this.images.update((list) => list.filter((_, i) => i !== index));
  }

  makeMain(index: number): void {
    this.images.update((list) => [list[index], ...list.filter((_, i) => i !== index)]);
  }

  save(): void {
    this.error.set('');
    const input: ProductInput = {
      name: this.name(),
      category: this.category(),
      description: this.description(),
      keyBenefits: this.benefits().split('\n').map((s) => s.trim()).filter(Boolean),
      ingredients: this.ingredients(),
      howToUse: this.howToUse(),
      images: this.images().filter(Boolean),
      quiz: { scalp: this.scalp(), needs: this.needs(), step: this.step() },
      allowAutoSubstitute: this.allowSubstitute(),
      status: this.active() ? 'Active' : 'Inactive',
      variants: this.variants()
        .filter((v) => v.enabled)
        .map((v) => ({ id: v.id, sku: v.sku, sizeLabel: v.sizeLabel, volume: v.volume, price: Number(v.price), onHand: Number(v.onHand ?? 0), forSale: v.forSale })),
    };
    try {
      if (this.editing()) {
        this.products.update(this.productId()!, input);
        this.toast.show('Product changes saved.');
      } else {
        this.products.create(input);
        this.toast.show('Product created and published to the storefront.');
      }
      void this.router.navigateByUrl('/admin/products');
    } catch (error) {
      this.error.set(errorMessage(error));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Downscales uploads so they fit comfortably in browser storage. */
  private resize(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
          const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        image.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../../core/data/mock-db.service';
import { PRODUCT_CATEGORIES, defaultVariant, productAvailable, type Product } from '../../../../core/models';
import { CartService } from '../../../../core/services/cart.service';
import { ProductService } from '../../../../core/services/product.service';
import { ReviewService } from '../../../../core/services/review.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ProductMediaComponent } from '../../../../shared/ui/product-media.component';
import { StarsComponent } from '../../../../shared/ui/stars.component';
import { CompactPipe } from '../../../../shared/ui/compact.pipe';
import { UsdPipe } from '../../../../shared/ui/usd.pipe';
import { HeroSceneComponent, type HeroProduct } from './hero-scene.component';

/** One signature product from each of the four houses, one per routine step, shown as an example result next to the quiz call-to-action. */
const SAMPLE_ROUTINE: Array<{ step: string; key: string }> = [
  { step: 'Cleanse', key: 'aromatica-rosemary-scalp-scaling-shampoo' },
  { step: 'Condition', key: 'rahua-classic-conditioner' },
  { step: 'Treat', key: 'davines-oi-hair-butter' },
  { step: 'Style', key: 'perfect-defense-heat-protectant' },
];

/** Signature product of each house standing in the hero scene (catalog keys; cut-outs from scripts/build_hero_cutouts.py). */
const HERO_PICKS: Array<{ brand: string; key: string }> = [
  { brand: 'AROMATICA', key: 'aromatica-rosemary-scalp-scaling-shampoo' },
  { brand: 'MOROCCANOIL', key: 'moroccanoil-treatment-original' },
  { brand: 'RAHUA', key: 'rahua-classic-shampoo' },
  { brand: 'DAVINES', key: 'davines-oi-hair-butter' },
];

/** C01 — Home page. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, UsdPipe, CompactPipe, StarsComponent, ProductMediaComponent, HeroSceneComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly products = inject(ProductService);
  private readonly reviews = inject(ReviewService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);

  /** The four houses of the FOLMARÉ curated edit, with their tile tints from the brand board. */
  readonly brands = [
    { name: 'AROMATICA', logo: '/assets/brand/aromatica-logo.svg', image: '/assets/hero/aromatica-rosemary-scalp-scaling-shampoo.webp', role: 'Scalp care & aromatherapy', background: 'linear-gradient(165deg, #EEF4EF 0%, #C9DCD1 100%)', ink: '#0F3D32', glow: '#FFFFFF' },
    { name: 'RAHUA', logo: '/assets/brand/rahua-logo.svg', image: '/assets/hero/rahua-classic-shampoo.webp', role: 'Amazon botanicals & nourishment', background: 'linear-gradient(165deg, #FBEBE0 0%, #F2B79C 100%)', ink: '#8A4A33', glow: '#FFF5E3' },
    { name: 'DAVINES', logo: '/assets/brand/davines-logo.svg', image: '/assets/hero/davines-oi-oil.webp', role: 'Professional care & sustainable beauty', background: 'linear-gradient(165deg, #F9F8F3 0%, #E6DED1 100%)', ink: '#6E5A43', glow: '#FFFFFF' },
    { name: 'MOROCCANOIL', logo: '/assets/brand/moroccanoil-wordmark.png', image: '/assets/hero/moroccanoil-treatment-original.webp', role: 'Argan oil & hair radiance', background: 'linear-gradient(165deg, #EDF1E6 0%, #B9CBB0 100%)', ink: '#2F5A3E', glow: '#FFE7C2' },
  ];

  /** Brand logos that failed to load fall back to the house name in type (drop the files into public/assets/brand/). */
  readonly failedLogos = signal<ReadonlySet<string>>(new Set());

  logoFailed(name: string): void {
    this.failedLogos.update((set) => new Set(set).add(name));
  }

  readonly quizSteps = [
    { title: 'Scalp', text: 'Balanced, oily, sensitive or flaky' },
    { title: 'Strands', text: 'Condition, texture and thickness' },
    { title: 'Habits', text: 'Washing, colour and heat styling' },
    { title: 'Goal', text: 'Repair, hydrate, define, protect' },
  ];

  readonly pillars = [
    { icon: 'leaf', title: 'Botanical Care', text: 'Formulas inspired by plants, roots and pressed botanical oils.' },
    { icon: 'waves', title: 'Hair Wellness', text: 'Whole-routine nourishment, from a calm scalp to the very ends.' },
    { icon: 'sparkle', title: 'Conscious Beauty', text: 'Houses that care for sustainable sourcing and lasting results.' },
    { icon: 'drop', title: 'Sensory Experience', text: 'Textures and scents that turn haircare into a daily ritual.' },
  ];

  readonly textures = [
    { name: 'Botanical Serum', notes: 'Fresh · Dewy · Lightweight', category: 'Treatment / Oil', image: '/assets/folmare/texture/botanical-serum.png' },
    { name: 'Soft Cream', notes: 'Silky · Rich · Nourishing', category: 'Hair Masks', image: '/assets/folmare/texture/hair-mask-cream.png' },
    { name: 'Golden Oil', notes: 'Glossy · Smooth · Radiant', category: 'Treatment / Oil', image: '/assets/folmare/texture/golden-oil.png' },
  ];

  readonly heroProducts = computed<HeroProduct[]>(() =>
    HERO_PICKS.flatMap(({ brand, key }) => {
      const product = this.products.activeProducts().find((p) => p.key === key);
      return product ? [{ brand, product }] : [];
    }),
  );

  /** Signature products that define each house, interleaved so the carousel never shows one brand in a row. */
  private static readonly SIGNATURES = [
    'moroccanoil-treatment-original',
    'aromatica-rosemary-scalp-scaling-shampoo',
    'rahua-classic-shampoo',
    'davines-oi-oil',
    'intense-hydrating-mask',
    'aromatica-rosemary-root-enhancer',
    'rahua-legendary-amazon-oiltm',
    'davines-oi-shampoo',
  ];

  readonly bestSellers = computed(() =>
    HomeComponent.SIGNATURES.flatMap((key) => {
      const product = this.products.activeProducts().find((p) => p.key === key);
      return product ? [product] : [];
    })
      .map((product) => ({
        product,
        variant: defaultVariant(product),
        inStock: productAvailable(product) > 0,
        stats: this.reviews.statsFor(product.id),
      })),
  );

  /** Category tiles show the product texture (not a single brand's bottle) so no house is favoured. */
  private static readonly CATEGORY_TEXTURES: Record<string, string> = {
    Shampoo: '/assets/folmare/category/shampoo.jpg',
    Conditioner: '/assets/folmare/category/conditioner.jpg',
    'Hair Masks': '/assets/folmare/category/hair-masks.jpg',
    'Treatment / Oil': '/assets/folmare/category/treatment-oil.jpg',
    'Dry Shampoo': '/assets/folmare/category/dry-shampoo.jpg',
    'Styling & Finishing': '/assets/folmare/category/styling-finishing.jpg',
  };

  readonly categoryTiles = computed(() =>
    PRODUCT_CATEGORIES.map((category) => {
      const count = this.products.bestSellers().filter((p) => p.category === category).length;
      return { category, count, image: HomeComponent.CATEGORY_TEXTURES[category] ?? '' };
    }),
  );

  readonly sampleTotal = computed(() => this.sampleRoutine().reduce((sum, item) => sum + item.price, 0));

  readonly sampleRoutine = computed(() =>
    SAMPLE_ROUTINE.map(({ step, key }) => {
      const product = this.products.products().find((p) => p.key === key && p.status === 'Active');
      return product ? { step, product, price: defaultVariant(product)?.price ?? 0 } : null;
    }).filter((item): item is NonNullable<typeof item> => item !== null),
  );

  addToCart(product: Product): void {
    const variant = defaultVariant(product);
    if (!variant) return;
    try {
      this.cart.add(product.id, variant.id, 1);
      this.toast.show(`${product.name} (${variant.sizeLabel}) added to your bag.`);
      this.cart.openDrawer();
    } catch (error) {
      this.toast.error(errorMessage(error));
    }
  }
}

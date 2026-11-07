import { RevealDirective } from '../../../../shared/ui/reveal.directive';
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
import { WishlistHeartComponent } from '../../../../shared/ui/wishlist-heart.component';
import { HeroSceneComponent, type HeroProduct } from './hero-scene.component';

/** Signature product of each house standing in the hero scene (catalog keys; cut-outs from scripts/build_hero_cutouts.py). */
const HERO_PICKS: Array<{ brand: string; key: string }> = [
  { brand: 'AROMATICA', key: 'aromatica-rosemary-scalp-scaling-shampoo' },
  { brand: 'MOROCCANOIL', key: 'moroccanoil-treatment-original' },
  { brand: 'RAHUA', key: 'rahua-classic-shampoo' },
  { brand: 'DAVINES', key: 'davines-oi-hair-butter' },
];

/** C01: Home page. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RevealDirective, UsdPipe, CompactPipe, StarsComponent, ProductMediaComponent, HeroSceneComponent, WishlistHeartComponent],
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
    { name: 'AROMATICA', logo: '/assets/brand/aromatica-logo.svg', logoClass: 'h-6 sm:h-7' },
    { name: 'RAHUA', logo: '/assets/brand/rahua-logo.png', logoClass: 'h-16 sm:h-20' },
    { name: 'DAVINES', logo: '/assets/brand/davines-logo.svg', logoClass: 'h-9 sm:h-11' },
    { name: 'MOROCCANOIL', logo: '/assets/brand/moroccanoil-logo.png', logoClass: 'h-14 sm:h-16' },
  ];

  /** Brand logos that failed to load fall back to the house name in type (drop the files into public/assets/brand/). */
  readonly failedLogos = signal<ReadonlySet<string>>(new Set());

  logoFailed(name: string): void {
    this.failedLogos.update((set) => new Set(set).add(name));
  }

  readonly quizSteps = [
    { title: 'Scalp', text: 'Balanced, oily, sensitive, flaky or thinning' },
    { title: 'Strands', text: 'Texture, thickness and condition' },
    { title: 'Color & Wash', text: 'Color treatments and wash routine' },
    { title: 'Goal', text: 'Repair, hydrate, define, protect, style' },
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

  /** The first four cards, one per house, in this order; all four are in the top ten. */
  private static readonly LEADERS = [
    'moroccanoil-treatment-original',
    'davines-oi-shampoo',
    'rahua-aloe-vera-shampoo',
    'aromatica-rosemary-root-enhancer',
  ];

  /** Exactly the products carrying the "Best Seller" tag: the leaders first, the rest by sales. */
  readonly bestSellers = computed(() => {
    const ids = this.products.bestSellerIds();
    const ranked = this.products.bestSellers().filter((p) => ids.has(p.id));
    const leaders = HomeComponent.LEADERS.flatMap((key) => {
      const top = ranked.find((p) => p.key === key);
      return top ? [top] : [];
    });
    return [...leaders, ...ranked.filter((p) => !leaders.includes(p))]
      .map((product) => ({
        product,
        variant: defaultVariant(product),
        inStock: productAvailable(product) > 0,
        stats: this.reviews.statsFor(product.id),
      }));
  });

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

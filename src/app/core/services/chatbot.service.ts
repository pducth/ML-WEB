import { Injectable, computed, inject, signal } from '@angular/core';
import { buildFaqGroups } from '../data/faq-data';
import { OrderStatus, productAvailable, startingPrice, type Product, type ProductCategory } from '../models';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';
import { ProductService } from './product.service';
import { QuizService } from './quiz.service';
import { SettingsService } from './settings.service';

/** A button under a bot message: moves the shopper to a page. */
export interface ChatAction {
  label: string;
  /** A route inside the store. */
  link?: string;
  query?: Record<string, string | number>;
  /** Or an address outside the app, opened in a new tab. */
  href?: string;
  kind?: 'primary' | 'secondary';
}

/** A small product card inside a bot message. */
export interface ChatCard {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
}

export interface ChatMessage {
  id: number;
  from: 'bot' | 'user';
  text?: string;
  cards?: ChatCard[];
  actions?: ChatAction[];
  /** Quick replies; only the latest bot message shows them. */
  chips?: string[];
}

type Reply = Omit<ChatMessage, 'id' | 'from'>;

interface Ctx {
  /** What the shopper typed, normalised: lower case, no accents, no punctuation. */
  t: string;
  raw: string;
}

interface Intent {
  id: string;
  /** Each pattern that matches adds its weight; the intent with the highest total answers. */
  rules: Array<[RegExp, number]>;
  answer: (ctx: Ctx) => Reply;
}

const STORAGE_KEY = 'folmare.chat.v1';
const MIN_SCORE = 2;

/** The four houses, with the part of the ritual each one stands for (the same words as the About page). */
const BRANDS: Array<{ name: string; key: string; pattern: RegExp; role: string; blurb: string }> = [
  { name: 'AROMATICA', key: 'aromatica', pattern: /aromatica/, role: 'The Ritual', blurb: 'AROMATICA turns daily care into a calm ritual, with aromatherapy for the scalp.' },
  { name: 'Rahua', key: 'rahua', pattern: /rahua/, role: 'The Roots', blurb: 'Rahua brings Amazon botanicals and traditional knowledge, sourced with respect.' },
  { name: 'Davines', key: 'davines', pattern: /davines?/, role: 'The Wisdom', blurb: 'Davines joins Italian science with sustainable beauty.' },
  { name: 'Moroccanoil', key: 'moroccanoil', pattern: /moroccan ?oil|morocco/, role: 'The Glow', blurb: 'Moroccanoil is argan oil care for hair that feels smooth, shiny and pampered.' },
];

const CATEGORY_RULES: Array<{ category: ProductCategory; pattern: RegExp; label: string }> = [
  { category: 'Dry Shampoo', pattern: /dry shampoo|dry shamp/, label: 'dry shampoos' },
  { category: 'Shampoo', pattern: /shampoo|shampoos|cleanser|wash(ing)? hair|goi dau/, label: 'shampoos' },
  { category: 'Conditioner', pattern: /conditioner|conditioners|dau xa/, label: 'conditioners' },
  { category: 'Hair Masks', pattern: /\bmasks?\b|hair mask|u toc/, label: 'hair masks' },
  { category: 'Treatment / Oil', pattern: /treatment|\boils?\b|serum|elixir|leave in|dau duong/, label: 'treatments and oils' },
  { category: 'Styling & Finishing', pattern: /styling|finishing|\bgel\b|mousse|spray|cream|pomade|wax|texturi[sz]er|tao kieu/, label: 'styling products' },
];

/** What a shopper may say about their hair, mapped to the quiz tags the catalogue already carries. */
const CONCERNS: Array<{
  key: string;
  label: string;
  rules: RegExp[];
  /** Search words for the Shop page. */
  q: string;
  advice: string;
  careful?: boolean;
  match: (p: Product) => boolean;
}> = [
  {
    key: 'oily',
    label: 'an oily scalp',
    rules: [/oily|greasy|grease|nhon|bi dau|dau nhieu|get dau/],
    q: 'oily',
    advice: 'For an oily scalp, choose a balancing cleanser and keep conditioner to the lengths and ends.',
    match: (p) => p.quiz.scalp.includes('oily'),
  },
  {
    key: 'flaky',
    label: 'a flaky or itchy scalp',
    rules: [/flak|dandruff|\bitch(y|ing)?\b|scalp irritat|\bgau\b|\bngua\b|\bvay\b/],
    q: 'scalp',
    advice: 'For a flaky or itchy scalp, a gentle scalp-care shampoo is the best place to start.',
    careful: true,
    match: (p) => p.quiz.scalp.includes('flaky'),
  },
  {
    key: 'sensitive',
    label: 'a dry, sensitive scalp',
    rules: [/sensitive scalp|dry scalp|tender scalp|da dau nhay cam/],
    q: 'sensitive',
    advice: 'For a dry or sensitive scalp, look for soothing formulas and avoid washing with very hot water.',
    careful: true,
    match: (p) => p.quiz.scalp.includes('dry_sensitive'),
  },
  {
    key: 'thinning',
    label: 'thinning hair',
    rules: [/thinning|hair loss|losing hair|\bshed(ding|s)?\b|balding|rung toc|thua toc/],
    q: 'thinning',
    advice: 'For thinning hair, scalp-care formulas support the roots and help hair look fuller.',
    careful: true,
    match: (p) => p.quiz.scalp.includes('thinning'),
  },
  {
    key: 'repair',
    label: 'damaged hair',
    rules: [/damag|repair|broken|breakage|split ends|brittle|frizz|hu ton|kho xo|chay toc|gay rung/],
    q: 'repair',
    advice: 'For damaged or frizzy hair, repairing formulas with a mask or treatment once or twice a week make the biggest difference.',
    match: (p) => p.quiz.needs.includes('Repair'),
  },
  {
    key: 'hydration',
    label: 'dry hair',
    rules: [/\bdry\b(?! shamp)|dry hair|dehydrat|thirsty|moistur|hydrat|kho toc|toc kho|cap am/],
    q: 'hydrating',
    advice: 'For dry hair, hydrating formulas bring back softness and shine. These are popular with our customers.',
    match: (p) => p.quiz.needs.includes('Hydration'),
  },
  {
    key: 'volume',
    label: 'volume',
    rules: [/volume|volumi[sz]|flat hair|\blimp\b|fine hair|thin hair|toc mong|toc xep|\bphong\b|bong toc/],
    q: 'volume',
    advice: 'For fine or flat hair, lightweight volumising formulas lift roots without weighing hair down.',
    match: (p) => p.quiz.needs.includes('Volume'),
  },
  {
    key: 'curl',
    label: 'curls and waves',
    rules: [/curl|wavy|waves|\bcoils?\b|\bxoan\b|\bsong\b/],
    q: 'curl',
    advice: 'For curls and waves, define and hydrate with curl-friendly formulas and avoid heavy brushing when dry.',
    match: (p) => p.quiz.needs.includes('Curl'),
  },
  {
    key: 'color',
    label: 'colour-treated hair',
    rules: [/colou?r|\bdy(e|ed)\b|bleach|\bhighlights?\b|nhuom|tay toc/],
    q: 'color',
    advice: 'For colour-treated hair, look for colour-safe formulas that protect tone and shine.',
    match: (p) => p.quiz.needs.includes('Color'),
  },
  {
    key: 'styling',
    label: 'styling and shine',
    rules: [/\bstyle\b|\bshine\b|glossy|smooth finish|\bfinish(ing)?\b|tao kieu|bong muot/],
    q: 'shine',
    advice: 'For a polished finish, choose a styling or finishing product after your wash routine.',
    match: (p) => p.quiz.needs.includes('Styling') || p.category === 'Styling & Finishing',
  },
];

/** The first four best sellers, as on the home page, then the rest by units sold. */
const LEADERS = ['moroccanoil-treatment-original', 'davines-oi-shampoo', 'rahua-aloe-vera-shampoo', 'aromatica-rosemary-root-enhancer'];

const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  [OrderStatus.PaymentPending]: 'is waiting for payment',
  [OrderStatus.Processing]: 'is being prepared',
  [OrderStatus.Shipping]: 'is on its way',
  [OrderStatus.Completed]: 'has been delivered',
  [OrderStatus.Cancelled]: 'was cancelled',
  [OrderStatus.ReturnPending]: 'has a return under review',
  [OrderStatus.Returned]: 'was returned and refunded',
};

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9$.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The store assistant: a rule-based helper, not a language model. Every answer is written for a question shoppers
 * really ask, built from live catalogue, order and settings data, and ends in a button that takes them where they
 * want to go. What it cannot answer it says so and points to the FAQs or to the support team.
 */
@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly products = inject(ProductService);
  private readonly orders = inject(OrderService);
  private readonly auth = inject(AuthService);
  private readonly quiz = inject(QuizService);
  private readonly settings = inject(SettingsService).settings;

  readonly open = signal(false);
  readonly typing = signal(false);
  readonly messages = signal<ChatMessage[]>(this.restore());
  readonly hasStarted = computed(() => this.messages().length > 0);

  private seq = this.messages().reduce((max, m) => Math.max(max, m.id), 0);
  private timer: ReturnType<typeof setTimeout> | null = null;

  // ------------------------------------------------------------------ conversation

  toggle(): void {
    this.setOpen(!this.open());
  }

  setOpen(open: boolean): void {
    this.open.set(open);
    if (open && !this.hasStarted()) this.push({ from: 'bot', ...this.welcome() });
  }

  /** Clears the conversation and starts again with the greeting. */
  reset(): void {
    if (this.timer) clearTimeout(this.timer);
    this.typing.set(false);
    this.messages.set([]);
    this.save();
    this.push({ from: 'bot', ...this.welcome() });
  }

  /** A shopper's message: show it, "type" for a moment, then answer. */
  send(text: string): void {
    const raw = text.trim().slice(0, 300);
    if (!raw || this.typing()) return;
    this.push({ from: 'user', text: raw });
    const reply = this.answer(raw);
    this.typing.set(true);
    const delay = Math.min(1100, 450 + (reply.text?.length ?? 0) * 3);
    this.timer = setTimeout(() => {
      this.typing.set(false);
      this.push({ from: 'bot', ...reply });
    }, delay);
  }

  // ------------------------------------------------------------------ the rules

  private welcome(): Reply {
    const name = this.auth.currentUser()?.fullName.split(' ').filter(Boolean).slice(-1)[0];
    return {
      text: `${name ? `Hi ${name}, ` : 'Hi, '}I am the FOLMARÉ assistant. I can help you choose products, check an order, or answer questions about shipping, payment and returns.`,
      chips: ['Help me choose', 'Best sellers', 'New arrivals', 'Shipping & delivery', 'Track my order', 'Returns & refunds'],
    };
  }

  private readonly intents: Intent[] = [
    {
      id: 'greeting',
      rules: [[/^(hi|hello|hey|hiya|yo|good (morning|afternoon|evening)|xin chao|chao|alo|hola)( there| ban| shop)?$/, 5]],
      answer: () => this.welcome(),
    },
    {
      id: 'thanks',
      rules: [[/\b(thanks?|thank you|thx|cam on|tks|cheers)\b/, 5]],
      answer: () => ({ text: 'You are welcome. Anything else I can help with?', chips: ['Best sellers', 'Help me choose', 'Contact support'] }),
    },
    {
      id: 'bye',
      rules: [[/\b(bye|goodbye|see you|tam biet|that is all|thats all)\b/, 5]],
      answer: () => ({ text: 'Goodbye, and enjoy your ritual. I am here whenever you need me.' }),
    },
    {
      id: 'help',
      rules: [[/\b(help|what can you do|what do you do|menu|options|ho tro|giup)\b/, 3]],
      answer: () => ({
        text: 'Here is what I can help with. Pick one, or type your own question.',
        chips: ['Help me choose', 'Best sellers', 'New arrivals', 'Shop by brand', 'Shipping & delivery', 'Payment methods', 'Discount codes', 'Track my order', 'Returns & refunds', 'Contact support'],
      }),
    },
    {
      id: 'recommend',
      rules: [
        [/(what|which|whats).{0,24}(should|shall|can|to|do you suggest|do you recommend).{0,14}(buy|get|use|try|choose|pick|start)/, 5],
        [/recommend|suggest|advice|advise|tu van|goi y|nen mua|nen dung|nen chon/, 4],
        [/(dont|do not|not) (really )?(know|sure).{0,18}(where|what|which|start|choose|buy)/, 5],
        [/where (do i|should i|to) start|get started|help me (choose|pick|find|decide)|best for me|right for me|my hair type|which (product|one)|find (a |my )?(routine|product)|san pham nao|chon giup|khong biet/, 4],
        [/\b(routine|regimen)\b/, 2],
      ],
      answer: () => {
        const profile = this.quiz.myProfile();
        return {
          text: profile
            ? 'You already have a saved hair profile, so your routine is waiting for you. If your hair has changed, you can retake the Hair Quiz at any time.'
            : 'If you are not sure where to start, take the Hair Quiz. It takes about a minute and builds a four-step routine from products that are in stock.',
          actions: [
            { label: 'Take the Hair Quiz', link: '/quiz', kind: 'primary' },
            ...(profile ? [{ label: 'View my hair profile', link: '/profile', kind: 'secondary' as const }] : [{ label: 'Browse best sellers', link: '/shop', query: { sort: 'best-sellers' }, kind: 'secondary' as const }]),
          ],
          chips: ['My hair is dry', 'My scalp is oily', 'Best sellers'],
        };
      },
    },
    {
      id: 'quiz',
      rules: [[/hair quiz|the quiz|\bquiz\b|hairquiz|bai test|trac nghiem/, 4]],
      answer: (ctx) => {
        if (/private|privacy|data/.test(ctx.t)) {
          return { text: this.faq(/is my quiz data private/) ?? 'Your answers are never shared.', actions: [{ label: 'Take the Hair Quiz', link: '/quiz', kind: 'primary' }] };
        }
        const how = this.faq(/how does the hair quiz work/);
        return {
          text: how ?? 'The Hair Quiz asks a few short questions about your scalp, strands and goals, then builds a routine from products in stock.',
          actions: [{ label: 'Take the Hair Quiz', link: '/quiz', kind: 'primary' }],
          chips: ['Is the quiz a medical diagnosis?', 'Is my quiz data private?'],
        };
      },
    },
    {
      id: 'bestsellers',
      rules: [[/best ?sell|top ?sell|most popular|popular|trending|fan favou?rite|most loved|top rated|ban chay|hot nhat|noi bat|duoc ua chuong/, 5]],
      answer: (ctx) => {
        const scope = this.scope(ctx.t);
        const list = this.bestSellers(scope.filter, 4);
        return {
          text: list.length ? `${scope.prefix}These are our best sellers${scope.label ? ` in ${scope.label}` : ''}, ranked by units sold.` : 'I could not find a best seller for that, but here is the full list.',
          cards: list.map((p) => this.card(p)),
          actions: [{ label: 'See all best sellers', link: '/shop', query: { sort: 'best-sellers', ...scope.query }, kind: 'primary' }, { label: 'Take the Hair Quiz', link: '/quiz', kind: 'secondary' }],
          chips: ['New arrivals', 'Help me choose'],
        };
      },
    },
    {
      id: 'new',
      rules: [[/new (arrival|product|release|launch|in)|whats new|just (landed|launched)|latest|newest|moi ve|hang moi|san pham moi|moi ra/, 5]],
      answer: (ctx) => {
        const scope = this.scope(ctx.t);
        const list = this.products.sortProducts(this.products.activeProducts().filter((p) => productAvailable(p) > 0 && scope.filter(p)), 'newest').slice(0, 4);
        return {
          text: `${scope.prefix}Here are the newest arrivals${scope.label ? ` in ${scope.label}` : ''}.`,
          cards: list.map((p) => this.card(p)),
          actions: [{ label: 'See all new arrivals', link: '/shop', query: { sort: 'newest', ...scope.query }, kind: 'primary' }],
          chips: ['Best sellers', 'Help me choose'],
        };
      },
    },
    {
      id: 'price',
      rules: [
        [/under \$?\d|below \$?\d|less than \$?\d|up to \$?\d|max(imum)? \$?\d|within \$?\d|duoi \$?\d|\$\d+ or (less|under)/, 5],
        [/cheap|cheapest|budget|affordable|low ?cost|inexpensive|lowest price|gia re|re nhat|tiet kiem/, 4],
        [/(how much|price|prices|cost|gia bao nhieu|bao nhieu tien)/, 2],
      ],
      answer: (ctx) => {
        const scope = this.scope(ctx.t);
        const limit = this.amount(ctx.t);
        const pool = this.products.activeProducts().filter((p) => productAvailable(p) > 0 && scope.filter(p));
        if (limit) {
          const list = this.products.sortProducts(pool.filter((p) => startingPrice(p) <= limit), 'best-sellers').slice(0, 4);
          if (!list.length) {
            const lowest = this.products.sortProducts(pool, 'price-asc')[0];
            return {
              text: `I could not find anything${scope.label ? ` in ${scope.label}` : ''} under $${limit}. ${lowest ? `The lowest starting price is $${startingPrice(lowest).toFixed(2)}.` : ''}`,
              actions: [{ label: 'Shop lowest prices first', link: '/shop', query: { sort: 'price-asc', ...scope.query }, kind: 'primary' }],
            };
          }
          return {
            text: `${scope.prefix}Here are popular picks${scope.label ? ` in ${scope.label}` : ''} that start under $${limit}.`,
            cards: list.map((p) => this.card(p)),
            actions: [{ label: `Shop under $${limit}`, link: '/shop', query: { max: limit, sort: 'best-sellers', ...scope.query }, kind: 'primary' }],
          };
        }
        const list = this.products.sortProducts(pool, 'price-asc').slice(0, 4);
        return {
          text: `${scope.prefix}Here are the most affordable options${scope.label ? ` in ${scope.label}` : ''}. Travel sizes are the lowest way in.`,
          cards: list.map((p) => this.card(p)),
          actions: [{ label: 'Shop lowest prices first', link: '/shop', query: { sort: 'price-asc', ...scope.query }, kind: 'primary' }],
          chips: ['Best sellers', 'Discount codes'],
        };
      },
    },
    {
      id: 'brand',
      rules: [
        [/aromatica|rahua|davines?|moroccan ?oil|morocco/, 4],
        [/\b(brands?|houses?|thuong hieu|hang nao)\b/, 3],
      ],
      answer: (ctx) => {
        const brand = BRANDS.find((b) => b.pattern.test(ctx.t));
        if (!brand) {
          return {
            text: 'We carry four houses, each with its own role in your ritual. Which one would you like to see?',
            chips: BRANDS.map((b) => b.name),
            actions: [{ label: 'Our four origins', link: '/about', kind: 'secondary' }],
          };
        }
        const list = this.bestSellers((p) => p.brand.toLowerCase() === brand.key, 3);
        return {
          text: `${brand.blurb} Role in the ritual: ${brand.role}.`,
          cards: list.map((p) => this.card(p)),
          actions: [{ label: `Shop ${brand.name}`, link: '/shop', query: { brand: brand.key }, kind: 'primary' }, { label: 'About the four houses', link: '/about', kind: 'secondary' }],
          chips: BRANDS.filter((b) => b !== brand).map((b) => b.name),
        };
      },
    },
    {
      id: 'category',
      rules: [
        [new RegExp(CATEGORY_RULES.map((c) => c.pattern.source).join('|')), 3],
        [/dry shampoo|dry shamp/, 5],
      ],
      answer: (ctx) => {
        const rule = CATEGORY_RULES.find((c) => c.pattern.test(ctx.t))!;
        const list = this.bestSellers((p) => p.category === rule.category, 3);
        return {
          text: `Here are our most popular ${rule.label}.`,
          cards: list.map((p) => this.card(p)),
          actions: [{ label: `Shop all ${rule.label}`, link: '/shop', query: { category: rule.category }, kind: 'primary' }, { label: 'Take the Hair Quiz', link: '/quiz', kind: 'secondary' }],
          chips: ['Best sellers', 'Help me choose'],
        };
      },
    },
    {
      id: 'concern',
      rules: [[new RegExp(CONCERNS.flatMap((c) => c.rules.map((r) => r.source)).join('|')), 4]],
      answer: (ctx) => {
        const concern = CONCERNS.find((c) => c.rules.some((r) => r.test(ctx.t)))!;
        const scope = this.scope(ctx.t);
        let list = this.bestSellers(scope.filter, 3);
        if (!list.length) list = this.bestSellers(concern.match, 3);
        return {
          text: `${concern.advice}${concern.careful ? ' If it persists, please see a dermatologist, as I can only suggest cosmetic care.' : ''}`,
          cards: list.map((p) => this.card(p)),
          actions: [
            { label: 'Take the Hair Quiz', link: '/quiz', kind: 'primary' },
            { label: `Shop for ${concern.label}`, link: '/shop', query: { q: concern.q, sort: 'best-sellers', ...scope.query }, kind: 'secondary' },
          ],
          chips: ['Best sellers', 'Help me choose'],
        };
      },
    },
    {
      id: 'shipping',
      rules: [[/ship|deliver|delivery|postage|giao hang|van chuyen|phi ship|bao lau|when will (it|my)|arrive|freeship|free shipping/, 4]],
      answer: () => {
        const fee = this.settings().shippingFee.toFixed(2);
        return {
          text: `Shipping is a flat $${fee} per order, and delivery takes about 3 to 5 business days. You can follow every order from your account.`,
          actions: [{ label: 'Track my order', link: '/orders', kind: 'primary' }, { label: 'Shipping policy', link: '/about', query: { tab: 'shipping' }, kind: 'secondary' }],
          chips: ['Payment methods', 'Returns & refunds'],
        };
      },
    },
    {
      id: 'track',
      rules: [
        [/track|tracking|order status|status of (my )?order|where.{0,12}(my )?(order|parcel|package)|my orders?|kiem tra don|don hang cua toi|don cua toi|theo doi don/, 5],
        [/\border\b/, 1],
      ],
      answer: () => {
        if (!this.auth.isLoggedIn()) {
          return {
            text: 'Sign in to see your orders and their latest status.',
            actions: [{ label: 'Sign in', link: '/login', kind: 'primary' }, { label: 'Create an account', link: '/register', kind: 'secondary' }],
          };
        }
        const order = this.orders.myOrders()[0];
        if (!order) {
          return { text: 'You have not placed an order yet. Your first one gets 10% off with WELCOME10.', actions: [{ label: 'Start shopping', link: '/shop', kind: 'primary' }] };
        }
        const when = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          text: `Your latest order #${order.code}, placed ${when}, ${ORDER_STATUS_TEXT[order.status] ?? `is ${order.status}`}. The total was $${order.total.toFixed(2)}.`,
          actions: [{ label: 'View this order', link: `/orders/${order.id}`, kind: 'primary' }, { label: 'All my orders', link: '/orders', kind: 'secondary' }],
          chips: ['Shipping & delivery', 'Returns & refunds'],
        };
      },
    },
    {
      id: 'returns',
      rules: [[/return|refund|exchange|money back|cancel|doi tra|hoan tien|tra hang|huy don|damaged item|wrong item|defective/, 4]],
      answer: (ctx) => {
        const cancel = /cancel|huy/.test(ctx.t);
        const amount = /how much|refunded|how long.{0,12}refund|hoan.{0,8}bao nhieu/.test(ctx.t) && /refund|hoan tien/.test(ctx.t);
        const text = amount ? this.faq(/how much will i be refunded/) : cancel ? this.faq(/can i cancel an order/) : this.faq(/how do returns work/);
        return {
          text: text ?? 'You can cancel an order until it ships, and request a return from your order page after delivery.',
          actions: [{ label: 'My orders', link: '/orders', kind: 'primary' }, { label: 'Returns policy', link: '/about', query: { tab: 'returns' }, kind: 'secondary' }],
          chips: amount ? ['Can I cancel an order?', 'Shipping & delivery'] : cancel ? ['How much will I be refunded?', 'Shipping & delivery'] : ['How much will I be refunded?', 'Can I cancel an order?'],
        };
      },
    },
    {
      id: 'payment',
      rules: [[/\bpay\b|payment|paying|\bcod\b|cash on delivery|bank transfer|transfer|\bqr\b|credit card|visa|momo|thanh toan|chuyen khoan|tien mat/, 4]],
      answer: () => ({
        text: this.faq(/which payment methods/) ?? 'You can pay by cash on delivery, or by bank transfer with a QR code.',
        actions: [{ label: 'Go to my bag', link: '/cart', kind: 'primary' }, { label: 'FAQs', link: '/faq', kind: 'secondary' }],
        chips: ['Discount codes', 'Shipping & delivery'],
      }),
    },
    {
      id: 'discount',
      rules: [[/discount|coupon|voucher|promo|promotion|welcome10|\bcode\b|sale|giam gia|ma giam|khuyen mai|uu dai/, 4]],
      answer: () => ({
        text: 'New customers get 10% off their first order with the code WELCOME10. You can use one code per order, and you enter it in your bag or at checkout.',
        actions: [{ label: 'Go to my bag', link: '/cart', kind: 'primary' }, { label: 'Start shopping', link: '/shop', kind: 'secondary' }],
        chips: ['Payment methods', 'Best sellers'],
      }),
    },
    {
      id: 'account',
      rules: [[/account|sign ?in|log ?in|log ?out|register|sign ?up|password|forgot|dang nhap|dang ky|mat khau|tai khoan/, 4]],
      answer: (ctx) => {
        if (/password|forgot|mat khau/.test(ctx.t)) {
          return {
            text: this.faq(/forgot my password/) ?? 'Choose Forgot password on the sign-in page and we will email you a one-time code.',
            actions: [{ label: 'Reset my password', link: '/forgot-password', kind: 'primary' }],
          };
        }
        return this.auth.isLoggedIn()
          ? { text: 'You are signed in. Your profile, orders, hair profile and wishlist are all in your account.', actions: [{ label: 'My profile', link: '/profile', kind: 'primary' }, { label: 'My orders', link: '/orders', kind: 'secondary' }] }
          : { text: 'Sign in to track orders, save your hair profile and keep a wishlist. It only takes a moment to create an account.', actions: [{ label: 'Sign in', link: '/login', kind: 'primary' }, { label: 'Create an account', link: '/register', kind: 'secondary' }] };
      },
    },
    {
      id: 'wishlist',
      rules: [[/wish ?list|favou?rites?|saved items|save for later|yeu thich|luu san pham/, 4]],
      answer: () => ({
        text: this.faq(/save products for later/) ?? 'Tap the heart on any product to save it to your wishlist.',
        actions: [{ label: 'Open my wishlist', link: '/wishlist', kind: 'primary' }],
      }),
    },
    {
      id: 'reviews',
      rules: [[/review|rating|feedback|danh gia|nhan xet/, 4]],
      answer: () => ({
        text: this.faq(/who can write a review/) ?? 'Only customers with a delivered order can review a product.',
        actions: [{ label: 'My orders', link: '/orders', kind: 'primary' }],
      }),
    },
    {
      id: 'safety',
      rules: [
        [/safe|vegan|cruelty|natural|organic|sulfate|paraben|ingredient|allerg|pregnan|medical|diagnos|an toan|thanh phan|di ung/, 3],
        [/diagnos|medical/, 4],
      ],
      answer: (ctx) => {
        const diagnosis = /diagnos|medical/.test(ctx.t);
        return {
          text: diagnosis
            ? (this.faq(/is the quiz a medical diagnosis/) ?? 'The quiz is cosmetic advice, not a medical diagnosis.')
            : 'Every product page lists its full ingredients, key benefits and how to use it. If you have allergies, a skin condition or are pregnant, please check the ingredients or ask your doctor first.',
          actions: [{ label: 'Browse products', link: '/shop', kind: 'primary' }, { label: 'Contact support', href: this.mail(), kind: 'secondary' }],
        };
      },
    },
    {
      id: 'about',
      rules: [[/about (you|us|folmare|the brand)|who are you|folmare|brand story|your story|ve chung toi|gioi thieu|cua hang/, 3]],
      answer: () => ({
        text: 'FOLMARÉ joins folium, the leaf, and mare, the sea. We are a curated destination for four botanical haircare houses: AROMATICA, Rahua, Davines and Moroccanoil.',
        actions: [{ label: 'Our story', link: '/about', kind: 'primary' }, { label: 'Shop now', link: '/shop', kind: 'secondary' }],
        chips: BRANDS.map((b) => b.name),
      }),
    },
    {
      id: 'contact',
      rules: [[/contact|human|real person|agent|support|customer service|speak to|talk to|call|hotline|e-?mail|phone|address|location|where are you|lien he|nhan vien|dia chi|hotline|cham soc khach/, 4]],
      answer: (ctx) => /address|location|where are you|warehouse|dia chi|o dau/.test(ctx.t)
        ? {
            text: `FOLMARÉ is an online store, and orders ship from our warehouse at ${this.settings().warehouseAddress}. For anything else, write to ${this.settings().supportEmail}.`,
            actions: [{ label: 'Email support', href: this.mail(), kind: 'primary' }, { label: 'Shipping policy', link: '/about', query: { tab: 'shipping' }, kind: 'secondary' }],
          }
        : {
        text: `Our team is happy to help. Write to ${this.settings().supportEmail} and we will get back to you. For quick answers, the FAQs cover most questions.`,
        actions: [{ label: 'Email support', href: this.mail(), kind: 'primary' }, { label: 'Open the FAQs', link: '/faq', kind: 'secondary' }],
      },
    },
  ];

  /** Picks the intent whose patterns score highest; falls back to the FAQs, then to a product search, then to a polite "not sure". */
  private answer(raw: string): Reply {
    const t = normalise(raw);
    const ctx: Ctx = { t, raw };
    let best: { intent: Intent; score: number } | null = null;
    for (const intent of this.intents) {
      const score = intent.rules.reduce((sum, [pattern, weight]) => sum + (pattern.test(t) ? weight : 0), 0);
      if (score >= MIN_SCORE && (!best || score > best.score)) best = { intent, score };
    }
    if (best) return best.intent.answer(ctx);

    const faq = this.faqSearch(t);
    if (faq) {
      return { text: faq.a, actions: [{ label: 'Open the FAQs', link: '/faq', kind: 'secondary' }], chips: ['Help me choose', 'Contact support'] };
    }

    // A product or ingredient name typed on its own.
    const found = t.length >= 3 ? this.products.search(raw).filter((p) => productAvailable(p) > 0) : [];
    if (found.length && found.length <= 12) {
      return {
        text: found.length === 1 ? 'I found this product.' : 'I found these products.',
        cards: found.slice(0, 4).map((p) => this.card(p)),
        actions: [{ label: 'See all results', link: '/shop', query: { q: raw }, kind: 'primary' }],
      };
    }

    return {
      text: 'I am not sure I understood that. I can help with choosing products, best sellers, shipping, payment, discounts, returns and your orders. You can also reach our team directly.',
      chips: ['Help me choose', 'Best sellers', 'Shipping & delivery', 'Returns & refunds'],
      actions: [{ label: 'Email support', href: this.mail(), kind: 'secondary' }],
    };
  }

  // ------------------------------------------------------------------ helpers

  /** The shopper's wording narrowed to a brand and/or a category, as a product filter and as Shop page parameters. */
  private scope(t: string): { filter: (p: Product) => boolean; label: string; prefix: string; query: Record<string, string> } {
    const brand = BRANDS.find((b) => b.pattern.test(t));
    const category = CATEGORY_RULES.find((c) => c.pattern.test(t));
    const concern = CONCERNS.find((c) => c.rules.some((r) => r.test(t)));
    const labels = [brand?.name, category?.label, concern ? concern.label : undefined].filter(Boolean) as string[];
    const query: Record<string, string> = {};
    if (brand) query['brand'] = brand.key;
    if (category) query['category'] = category.category;
    return {
      filter: (p) => (!brand || p.brand.toLowerCase() === brand.key) && (!category || p.category === category.category) && (!concern || concern.match(p)),
      label: labels.join(' · '),
      prefix: '',
      query,
    };
  }

  /** In-stock products by units sold; the four home-page leaders come first when nothing narrows the list. */
  private bestSellers(filter: (p: Product) => boolean, limit: number): Product[] {
    const ranked = this.products.bestSellers().filter((p) => productAvailable(p) > 0 && filter(p));
    const leaders = LEADERS.flatMap((key) => ranked.filter((p) => p.key === key));
    const rest = ranked.filter((p) => !leaders.includes(p));
    return [...leaders, ...rest].slice(0, limit);
  }

  private card(p: Product): ChatCard {
    return { id: p.id, name: p.name, brand: p.brand, image: p.images[0] ?? '', price: startingPrice(p) };
  }

  /** A number in the message: "under $25", "below 30". */
  private amount(t: string): number | null {
    const m = t.match(/\$\s?(\d+(?:\.\d+)?)|(?:under|below|less than|up to|max(?:imum)?|within|duoi)\s+(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:usd|dollars?|\$)/);
    const value = m ? Number(m[1] ?? m[2] ?? m[3]) : NaN;
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private mail(): string {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${this.settings().supportEmail}`;
  }

  /** The answer of the FAQ whose question matches. */
  private faq(question: RegExp): string | null {
    for (const group of buildFaqGroups(this.settings())) {
      for (const item of group.items) if (question.test(item.q.toLowerCase())) return item.a;
    }
    return null;
  }

  /** Best FAQ by shared words, for questions no rule covers. */
  private faqSearch(t: string): { q: string; a: string } | null {
    const stop = new Set(['the', 'a', 'an', 'is', 'are', 'do', 'does', 'i', 'my', 'me', 'you', 'can', 'how', 'what', 'to', 'of', 'in', 'on', 'it', 'for', 'and', 'or', 'we', 'your', 'be']);
    const words = t.split(' ').filter((w) => w.length > 2 && !stop.has(w));
    if (!words.length) return null;
    let best: { q: string; a: string; score: number } | null = null;
    for (const group of buildFaqGroups(this.settings())) {
      for (const item of group.items) {
        const hay = normalise(item.q + ' ' + item.a);
        const score = words.filter((w) => hay.includes(w)).length / words.length;
        if (score >= 0.6 && (!best || score > best.score)) best = { ...item, score };
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ storage

  private push(message: Omit<ChatMessage, 'id'>): void {
    this.messages.update((list) => [...list, { ...message, id: ++this.seq }].slice(-60));
    this.save();
  }

  private save(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages()));
    } catch {
      /* private mode: the chat still works, it just is not remembered */
    }
  }

  private restore(): ChatMessage[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

/**
 * MOROCCANOIL LUXURY E-COMMERCE - FRONTEND SPA CONTROLLER
 * Full Guest Flow, Customer Flow, Admin Dashboard & Testing Floating Bar
 * Language: English (UI) | Currency: USD ($XX.XX) per NFR-05 & NFR-07
 */

// ==========================================
// UTILITY: Currency formatter (USD)
// ==========================================
function formatUSD(cents) {
    // cents is the price in the smallest unit or a whole dollar amount
    return `$${(cents / 100).toFixed(2)}`;
}

function priceUSD(amount) {
    // amount is already in USD dollars (e.g., 34.00)
    return `$${amount.toFixed(2)}`;
}

// ==========================================
// 1. DATA REPOSITORY & MOCK DATABASE
// ==========================================
const STORE_DATA = {
    currentUser: {
        role: 'guest', // 'guest' | 'customer' | 'admin'
        name: 'Phuong Thao Nguyen',
        email: 'phuongthao.nguyen@gmail.com',
        phone: '0908 123 456',
        tier: 'Gold Member',
        points: 1250,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    products: [
        {
            id: 'm-01',
            name: 'Moroccanoil Treatment Original',
            category: 'oil',
            categoryName: 'Treatment / Oil',
            hairType: ['all', 'dry', 'damaged'],
            price: 34.00,
            originalPrice: 38.00,
            rating: 5.0,
            reviewsCount: 542,
            isBestSeller: true,
            isNew: false,
            badge: 'Best Seller',
            image: 'https://images.unsplash.com/photo-1608248597359-543329158fa9?auto=format&fit=crop&w=700&q=80',
            images: [
                'https://images.unsplash.com/photo-1608248597359-543329158fa9?auto=format&fit=crop&w=700&q=80',
                'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80',
                'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=700&q=80',
                'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=700&q=80'
            ],
            shortDesc: 'The foundation for all hairstyling. Rich in antioxidant argan oil and vitamins for instant shine and manageability.',
            sizes: [
                { label: '25ml', price: 16.00 },
                { label: '100ml', price: 34.00, selected: true },
                { label: '200ml', price: 58.00 }
            ],
            stock: 84,
            ingredients: 'Pure Moroccan Argan Oil, Linseed Extract, Natural Vitamin E, Cyclomethicone, Dimethicone, Signature Moroccanoil Fragrance.',
            usage: 'Apply 1-2 pumps to clean, towel-dried hair from mid-length to ends. Blow dry or air dry.'
        },
        {
            id: 'm-02',
            name: 'Moisture Repair Shampoo',
            category: 'shampoo',
            categoryName: 'Shampoo',
            hairType: ['damaged', 'colored', 'dry'],
            price: 27.00,
            originalPrice: 30.00,
            rating: 4.9,
            reviewsCount: 388,
            isBestSeller: true,
            isNew: false,
            badge: 'Best Seller',
            image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=700&q=80',
            images: [
                'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=700&q=80',
                'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=700&q=80'
            ],
            shortDesc: 'Gentle cleansing formula that repairs weak, chemically damaged hair from heat and environmental stressors.',
            sizes: [
                { label: '250ml', price: 27.00, selected: true },
                { label: '500ml', price: 46.00 },
                { label: '1000ml', price: 79.00 }
            ],
            stock: 120,
            ingredients: 'Argan Oil, Hydrolyzed Keratin, Essential Fatty Acids, Chamomile Extract. Sulfate-free, Phosphate-free, Paraben-free.',
            usage: 'Apply evenly to wet hair, gently massage into scalp and roots. Rinse thoroughly with warm water.'
        },
        {
            id: 'm-03',
            name: 'Moisture Repair Conditioner',
            category: 'conditioner',
            categoryName: 'Conditioner',
            hairType: ['damaged', 'dry'],
            price: 29.00,
            originalPrice: 32.00,
            rating: 4.9,
            reviewsCount: 295,
            isBestSeller: false,
            isNew: true,
            badge: 'New Arrival',
            image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=700&q=80',
            images: [
                'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=700&q=80'
            ],
            shortDesc: 'Instantly detangles and locks in moisture, restoring elasticity and vibrant shine to dry, brittle hair.',
            sizes: [
                { label: '250ml', price: 29.00, selected: true },
                { label: '500ml', price: 49.00 }
            ],
            stock: 65,
            ingredients: 'Pure Argan Oil, Natural Keratin, Jojoba Oil, Vitamin B5.',
            usage: 'After shampooing, squeeze excess water from hair. Apply from mid-length to ends, leave 2-3 minutes then rinse.'
        },
        {
            id: 'm-04',
            name: 'Intense Hydrating Mask',
            category: 'mask',
            categoryName: 'Hair Masks',
            hairType: ['dry', 'thick', 'curly'],
            price: 37.00,
            originalPrice: 42.00,
            rating: 5.0,
            reviewsCount: 420,
            isBestSeller: true,
            isNew: false,
            badge: 'Deep Hydration',
            image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=700&q=80',
            images: [
                'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=700&q=80'
            ],
            shortDesc: '5-minute intensive hair treatment that rapidly restores texture and deep moisture to medium-to-thick dry hair.',
            sizes: [
                { label: '250ml', price: 37.00, selected: true },
                { label: '500ml', price: 66.00 }
            ],
            stock: 42,
            ingredients: 'Argan Oil, Wheat Germ Oil, Silk Amino Acids, Seaweed Extract.',
            usage: 'Apply generously to towel-dried hair after shampooing. Comb through and leave 5-7 minutes. Rinse with cool water.'
        },
        {
            id: 'm-05',
            name: 'Perfect Defense Heat Protectant',
            category: 'styling',
            categoryName: 'Styling & Finishing',
            hairType: ['all', 'colored'],
            price: 32.00,
            originalPrice: 34.00,
            rating: 4.8,
            reviewsCount: 180,
            isBestSeller: false,
            isNew: true,
            badge: 'Heat Shield 230°C',
            image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80',
            images: [
                'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80'
            ],
            shortDesc: 'Weightless dry aerosol spray that shields hair from heat styling up to 230°C (450°F) with zero residue.',
            sizes: [
                { label: '225ml', price: 32.00, selected: true }
            ],
            stock: 58,
            ingredients: 'Argan Oil, Panthenol (Pro-Vitamin B5), Polyquaternium for cuticle protection.',
            usage: 'Spray 15-20cm from damp hair before blow-drying, or on dry hair before using curling/flat iron.'
        },
        {
            id: 'm-06',
            name: 'Extra Volume Shampoo',
            category: 'shampoo',
            categoryName: 'Shampoo',
            hairType: ['thin', 'limp'],
            price: 27.00,
            originalPrice: 30.00,
            rating: 4.7,
            reviewsCount: 164,
            isBestSeller: false,
            isNew: false,
            badge: 'Volume Boost',
            image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=700&q=80',
            images: [
                'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=700&q=80'
            ],
            shortDesc: 'Transforms fine, limp hair into full-bodied, voluminous locks that last 24 hours with natural bounce.',
            sizes: [
                { label: '250ml', price: 27.00, selected: true },
                { label: '500ml', price: 46.00 }
            ],
            stock: 39,
            ingredients: 'Linden Bud Extract, Argan Oil, Plant-based Glycerin.',
            usage: 'Apply to wet hair, massage evenly from roots to ends to activate fine volumizing lather.'
        },
        {
            id: 'm-07',
            name: 'Dry Shampoo Light Tones',
            category: 'dry-shampoo',
            categoryName: 'Dry Shampoo',
            hairType: ['all', 'colored'],
            price: 29.00,
            originalPrice: 32.00,
            rating: 4.8,
            reviewsCount: 142,
            isBestSeller: false,
            isNew: true,
            badge: 'UV Filter',
            image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80',
            images: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80'],
            shortDesc: 'Ultra-fine rice starch absorbs oil and odor, infused with subtle violet tones for refreshed blonde hair.',
            sizes: [{ label: '205ml', price: 29.00, selected: true }],
            stock: 45,
            ingredients: 'Rice Starch, Argan Oil, Violet Undertones, Tocopherol.',
            usage: 'Shake well. Spray 20cm away from dry roots. Let dry, then massage through.'
        },
        {
            id: 'm-08',
            name: 'Dry Shampoo Dark Tones',
            category: 'dry-shampoo',
            categoryName: 'Dry Shampoo',
            hairType: ['all', 'colored', 'dry'],
            price: 29.00,
            originalPrice: 32.00,
            rating: 4.9,
            reviewsCount: 198,
            isBestSeller: true,
            isNew: false,
            badge: 'No White Residue',
            image: 'https://images.unsplash.com/photo-1608248597359-543329158fa9?auto=format&fit=crop&w=700&q=80',
            images: ['https://images.unsplash.com/photo-1608248597359-543329158fa9?auto=format&fit=crop&w=700&q=80'],
            shortDesc: 'Absorbs buildup and odor without leaving chalky residue on dark or brunette hair.',
            sizes: [{ label: '205ml', price: 29.00, selected: true }],
            stock: 62,
            ingredients: 'Ultra-fine Rice Starch, Argan Oil, Conditioning Agents.',
            usage: 'Shake well. Spray into dry roots. Wait 1 minute, then brush through.'
        },
        {
            id: 'm-09',
            name: 'Luminous Hairspray Strong',
            category: 'styling',
            categoryName: 'Styling & Finishing',
            hairType: ['all'],
            price: 26.00,
            originalPrice: 28.00,
            rating: 4.9,
            reviewsCount: 210,
            isBestSeller: true,
            isNew: false,
            badge: 'Frizz Defense',
            image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=700&q=80',
            images: ['https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=700&q=80'],
            shortDesc: 'Flexible yet strong hold hairspray infused with argan oil that repels humidity without sticky buildup.',
            sizes: [{ label: '330ml', price: 26.00, selected: true }],
            stock: 77,
            ingredients: 'Argan Oil, Flexible Fixatives, Vitamin E.',
            usage: 'Hold can 25cm away from styled hair and spray in an all-around even motion.'
        },
        {
            id: 'm-10',
            name: 'Restorative Hair Mask',
            category: 'mask',
            categoryName: 'Hair Masks',
            hairType: ['damaged', 'colored'],
            price: 42.00,
            originalPrice: 46.00,
            rating: 5.0,
            reviewsCount: 312,
            isBestSeller: false,
            isNew: true,
            badge: 'Keratin Infusion',
            image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=700&q=80',
            images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=700&q=80'],
            shortDesc: 'Protein-rich restorative treatment that deeply penetrates weak, damaged hair to rebuild elasticity.',
            sizes: [{ label: '250ml', price: 42.00, selected: true }],
            stock: 35,
            ingredients: 'Argan Oil, Reconstructive Shea Butter, Vegetable Protein.',
            usage: 'Apply generously to damp hair after shampooing. Leave on 7-10 minutes, then rinse.'
        },
        {
            id: 'm-11',
            name: 'Extra Volume Conditioner',
            category: 'conditioner',
            categoryName: 'Conditioner',
            hairType: ['thin', 'limp'],
            price: 29.00,
            originalPrice: 32.00,
            rating: 4.8,
            reviewsCount: 154,
            isBestSeller: false,
            isNew: false,
            badge: 'Lightweight Moisture',
            image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=700&q=80',
            images: ['https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=700&q=80'],
            shortDesc: 'Gently detangles and plumps fine strands from within for touchable body and shine.',
            sizes: [{ label: '250ml', price: 29.00, selected: true }],
            stock: 48,
            ingredients: 'Linden Bud Extract, Argan Oil, Revitalizing Nutrients.',
            usage: 'After shampooing, gently work through lengths and ends. Rinse thoroughly.'
        },
        {
            id: 'm-12',
            name: 'Moroccanoil Treatment Light',
            category: 'oil',
            categoryName: 'Treatment / Oil',
            hairType: ['thin', 'colored', 'all'],
            price: 34.00,
            originalPrice: 38.00,
            rating: 5.0,
            reviewsCount: 380,
            isBestSeller: true,
            isNew: false,
            badge: 'Fine & Light Tones',
            image: 'https://images.unsplash.com/photo-1608248597359-543329158fa9?auto=format&fit=crop&w=700&q=80',
            images: ['https://images.unsplash.com/photo-1608248597359-543329158fa9?auto=format&fit=crop&w=700&q=80'],
            shortDesc: 'Specially formulated for fine and light-colored hair, delivering all benefits of the original without weight.',
            sizes: [{ label: '100ml', price: 34.00, selected: true }],
            stock: 52,
            ingredients: 'Moroccan Argan Oil, Linseed Extract, Lightweight Antioxidants.',
            usage: 'Apply 1 pump to clean, towel-dried hair. Style as desired.'
        }
    ],
    cart: [
        {
            productId: 'm-01',
            name: 'Moroccanoil Treatment Original',
            size: '100ml',
            price: 34.00,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1608248597359-543329158fa9?auto=format&fit=crop&w=200&q=80'
        },
        {
            productId: 'm-02',
            name: 'Moisture Repair Shampoo',
            size: '250ml',
            price: 27.00,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=200&q=80'
        }
    ],
    coupons: [
        { code: 'MOROCCO10', discountPercent: 10, minOrder: 20, desc: '10% off your first order' },
        { code: 'VIPARGAN', discountPercent: 15, minOrder: 60, desc: '15% Gold Member discount' },
        { code: 'FREESHIP', discountAmount: 5.00, minOrder: 35, desc: 'Free shipping nationwide' }
    ],
    appliedCoupon: null,
    orders: [
        {
            id: 'MC-202688',
            date: '10/26/2026',
            customerName: 'Phuong Thao Nguyen',
            phone: '0908 123 456',
            address: 'Landmark 81, 720A Dien Bien Phu, Ward 22, Binh Thanh, HCMC',
            paymentMethod: 'Bank Transfer (VietQR)',
            paymentStatus: 'Paid',
            status: 'shipping',
            statusLabel: 'In Transit',
            items: [
                { name: 'Moroccanoil Treatment Original (100ml)', price: 34.00, qty: 1 },
                { name: 'Moisture Repair Shampoo (250ml)', price: 27.00, qty: 1 }
            ],
            discount: 6.10,
            shippingFee: 0,
            total: 54.90,
            trackingSteps: [
                { title: 'Order placed successfully', time: '09:15 - 10/26/2026', done: true },
                { title: 'Packed & dispatched from warehouse', time: '11:30 - 10/26/2026', done: true },
                { title: 'In transit to your address', time: '14:00 - 10/26/2026', done: true },
                { title: 'Estimated delivery', time: '18:00 - 10/27/2026', done: false }
            ]
        },
        {
            id: 'MC-202612',
            date: '10/15/2026',
            customerName: 'Phuong Thao Nguyen',
            phone: '0908 123 456',
            address: 'Landmark 81, 720A Dien Bien Phu, Ward 22, Binh Thanh, HCMC',
            paymentMethod: 'Cash on Delivery (COD)',
            paymentStatus: 'Paid',
            status: 'completed',
            statusLabel: 'Delivered',
            items: [
                { name: 'Intense Hydrating Mask (250ml)', price: 37.00, qty: 1 }
            ],
            discount: 0,
            shippingFee: 0,
            total: 37.00,
            trackingSteps: [
                { title: 'Order placed successfully', time: '10:00 - 10/15/2026', done: true },
                { title: 'Dispatched to carrier', time: '14:20 - 10/15/2026', done: true },
                { title: 'Delivered successfully', time: '16:45 - 10/16/2026', done: true }
            ]
        }
    ],
    adminKPI: {
        revenue: '$7,460.00',
        revenueGrowth: '+18.4%',
        ordersTotal: 432,
        ordersPending: 18,
        customersTotal: 1258,
        conversionRate: '4.8%'
    },
    currentProductPDP: null
};

// ==========================================
// 2. ROUTING & SCREEN CONTROLLER
// ==========================================
const App = {
    currentScreen: 'c01-home',
    activeQuizStep: 1,
    quizAnswers: { hairType: '', concern: '', heatStyling: '' },

    init() {
        // Set default PDP product to first product
        STORE_DATA.currentProductPDP = STORE_DATA.products[0];

        // Bind interactive events
        this.bindEvents();
        this.renderCartUI();
        this.renderShopProducts();
        this.renderPDP();
        this.renderAdminOrders();
        this.renderAdminProducts();
        this.renderUserOrders();
        this.updateRoleUI();
        this.initHeroParallax();

        // Default screen
        this.navigateTo('c01-home');
    },

    // 3D Parallax Mouse & Scroll Tracking Engine
    initHeroParallax() {
        const stage = document.getElementById('hero-parallax-stage');
        if (!stage) return;

        const l1 = document.getElementById('parallax-layer-1');
        const l2 = document.getElementById('parallax-layer-2');
        const l3 = document.getElementById('parallax-layer-3');
        const l4 = document.getElementById('parallax-layer-4');
        const l5 = document.getElementById('parallax-layer-5');

        let scrollY = window.scrollY;
        let mouseX = 0, mouseY = 0;
        let targetX = 0, targetY = 0;

        window.addEventListener('scroll', () => {
            scrollY = window.scrollY;
        }, { passive: true });

        window.addEventListener('mousemove', (e) => {
            targetX = (e.clientX / window.innerWidth) * 2 - 1;
            targetY = (e.clientY / window.innerHeight) * 2 - 1;
        });

        const updateParallax = () => {
            mouseX += (targetX - mouseX) * 0.08;
            mouseY += (targetY - mouseY) * 0.08;

            const tiltX = -mouseY * 3.5;
            const tiltY = mouseX * 4.5;

            stage.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

            const sy = scrollY;
            const l1X = mouseX * -6;
            const l1Y = mouseY * -4 + sy * 0.44;
            const l2X = mouseX * -14;
            const l2Y = mouseY * -9 + sy * 0.47;
            const l3X = mouseX * -24;
            const l3Y = mouseY * -15 + sy * 0.50;
            const l4X = mouseX * -36;
            const l4Y = mouseY * -22 + sy * 0.53;
            const l5X = mouseX * -52;
            const l5Y = mouseY * -30 + sy * 0.56;

            if (l1) l1.style.transform = `translate3d(${l1X}px, ${l1Y}px, -100px) scale(1.22)`;
            if (l2) l2.style.transform = `translate3d(${l2X}px, ${l2Y}px, -50px) scale(1.12)`;
            if (l3) l3.style.transform = `translate3d(${l3X}px, ${l3Y}px, 0px) scale(1.03)`;
            if (l4) l4.style.transform = `translate3d(${l4X}px, ${l4Y}px, 50px) scale(1.04)`;
            if (l5) l5.style.transform = `translate3d(${l5X}px, ${l5Y}px, 100px) scale(1.05)`;

            requestAnimationFrame(updateParallax);
        };

        requestAnimationFrame(updateParallax);
    },

    // Navigation function for SPA section rendering
    navigateTo(screenId, extraData = null) {
        // Enforce login for User Account Dashboard and Order History if Guest
        if ((screenId === 'c12-profile' || screenId === 'c13-orders') && STORE_DATA.currentUser.role === 'guest') {
            this.openAuthModal();
            this.showToast('Please sign in to access your Account Dashboard & Order History.', 'info');
            return;
        }

        if (extraData && screenId === 'c03-pdp') {
            const product = STORE_DATA.products.find(p => p.id === extraData);
            if (product) {
                STORE_DATA.currentProductPDP = product;
                this.renderPDP();
            }
        }

        // Hide all screens
        document.querySelectorAll('.app-screen').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('animate-fadeIn');
        });

        // Show target screen
        const target = document.getElementById(`page-${screenId}`);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('animate-fadeIn');
            this.currentScreen = screenId;
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Update floating quick dropdown
            const quickSelect = document.getElementById('floating-screen-select');
            if (quickSelect) quickSelect.value = screenId;

            // Header state updates
            this.updateHeaderActiveState(screenId);

            // Screen-specific dynamic renderers
            if (screenId === 'c07-checkout') {
                this.renderCheckoutSummary();
            } else if (screenId === 'c02-shop' && !extraData) {
                const cat = document.getElementById('shop-category-filter')?.value || 'all';
                const hair = document.getElementById('shop-hairtype-filter')?.value || 'all';
                const sort = document.getElementById('shop-sort-filter')?.value || 'best-seller';
                this.renderShopProducts(cat, hair, sort);
            }
        } else {
            console.warn(`Screen with id page-${screenId} not found`);
        }
    },

    filterShopByCategory(cat) {
        this.navigateTo('c02-shop', { category: cat });
        const select = document.getElementById('shop-category-filter');
        if (select) {
            select.value = cat;
        }
        const hair = document.getElementById('shop-hairtype-filter')?.value || 'all';
        const sort = document.getElementById('shop-sort-filter')?.value || 'best-seller';
        this.renderShopProducts(cat, hair, sort);
    },

    handleHeaderSearch(query) {
        if (!query || !query.trim()) return;
        this.navigateTo('c02-shop', { search: query });
        const q = query.trim().toLowerCase();
        const grid = document.getElementById('shop-products-grid');
        const countEl = document.getElementById('shop-product-count');
        const filtered = STORE_DATA.products.filter(p => 
            p.name.toLowerCase().includes(q) || 
            (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
            (p.shortDesc && p.shortDesc.toLowerCase().includes(q)) ||
            (p.ingredients && p.ingredients.toLowerCase().includes(q))
        );
        if (countEl) countEl.textContent = `${filtered.length} products found for "${query.trim()}"`;
        if (grid) {
            if (filtered.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full py-16 text-center text-[#6B625B]">
                        <p class="text-base font-semibold text-[#4A2E2B]">No products found matching "${query.trim()}"</p>
                        <p class="text-xs text-[#9B938B] mt-1">Try searching for "shampoo", "oil", "mask", "conditioner", or "styling".</p>
                        <button onclick="App.renderShopProducts('all')" class="mt-4 btn-secondary text-xs px-4 py-2">Show All Products</button>
                    </div>
                `;
            } else {
                grid.innerHTML = filtered.map(product => `
                    <div class="group product-card flex flex-col justify-between">
                        <div class="relative overflow-hidden bg-[#FAF7F2] aspect-square rounded-t-2xl cursor-pointer" onclick="App.navigateTo('c03-pdp', '${product.id}')">
                            <img src="${product.image}" alt="${product.name}" class="card-img w-full h-full object-cover" />
                            <div class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                <button onclick="event.stopPropagation(); App.addToCart('${product.id}')" class="p-3 bg-[#6E473B] text-white rounded-full shadow-lg hover:bg-[#4A2E2B] transition-transform active:scale-95" title="Quick add to cart">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                </button>
                            </div>
                        </div>
                        <div class="p-5 flex-1 flex flex-col justify-between">
                            <div>
                                <div class="flex items-center gap-1.5 mb-2">
                                    <div class="flex text-[#00A3A6]">
                                        ${'★'.repeat(Math.floor(product.rating))}
                                    </div>
                                    <span class="text-xs font-semibold text-[#00A3A6]">${product.rating}</span>
                                    <span class="text-xs text-[#9B938B]">(${product.reviewsCount})</span>
                                </div>
                                <h3 class="font-semibold text-[#4A2E2B] text-base leading-snug line-clamp-2 hover:text-[#6E473B] transition-colors cursor-pointer" onclick="App.navigateTo('c03-pdp', '${product.id}')">
                                    ${product.name}
                                </h3>
                                <p class="text-xs text-[#6B625B] mt-1.5 line-clamp-2">${product.shortDesc}</p>
                            </div>
                            <div class="mt-4 pt-3 border-t border-[#E7E3DC] flex items-center justify-between">
                                <div>
                                    <span class="text-base font-bold text-[#6E473B]">$${product.price.toFixed(2)}</span>
                                    ${product.originalPrice ? `<span class="text-xs text-[#9B938B] line-through ml-2">$${product.originalPrice.toFixed(2)}</span>` : ''}
                                </div>
                                <button onclick="App.addToCart('${product.id}')" class="btn-cta-buy text-xs px-3 py-1.5">
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }
    },

    updateHeaderActiveState(screenId) {
        document.querySelectorAll('.nav-link-item').forEach(link => {
            if (link.dataset.target === screenId) {
                link.classList.add('text-[#6E473B]', 'font-semibold', 'border-b-2', 'border-[#6E473B]');
                link.classList.remove('text-[#4A2E2B]/80');
            } else {
                link.classList.remove('text-[#6E473B]', 'font-semibold', 'border-b-2', 'border-[#6E473B]');
                link.classList.add('text-[#4A2E2B]/80');
            }
        });
    },

    // Switch Role between Guest, Customer, and Admin
    setRole(newRole) {
        STORE_DATA.currentUser.role = newRole;
        this.updateRoleUI();

        let roleName = newRole === 'admin' ? 'Administrator' : (newRole === 'customer' ? 'Customer' : 'Guest');
        this.showToast(`Switched to role: ${roleName}`, 'info');

        if (newRole === 'admin') {
            this.navigateTo('admin-dashboard');
        } else if (newRole === 'customer') {
            this.navigateTo('c12-profile');
        } else {
            this.navigateTo('c01-home');
        }
    },

    updateRoleUI() {
        const role = STORE_DATA.currentUser.role;
        const roleBadge = document.getElementById('floating-role-badge');
        if (roleBadge) {
            roleBadge.textContent = role.toUpperCase();
            if (role === 'admin') {
                roleBadge.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-300';
            } else if (role === 'customer') {
                roleBadge.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-[#805719] border border-amber-300';
            } else {
                roleBadge.className = 'px-2 py-0.5 text-xs font-bold rounded-full bg-gray-100 text-gray-700 border border-gray-300';
            }
        }

        // Header user button text
        const authBtnText = document.getElementById('header-auth-btn-text');
        if (authBtnText) {
            if (role === 'guest') {
                authBtnText.textContent = 'Sign In';
            } else if (role === 'admin') {
                authBtnText.textContent = 'Admin Portal';
            } else {
                authBtnText.textContent = STORE_DATA.currentUser.name;
            }
        }

        // Show/hide admin link in header
        const adminHeaderLink = document.getElementById('header-admin-nav');
        if (adminHeaderLink) {
            if (role === 'admin') {
                adminHeaderLink.classList.remove('hidden');
            } else {
                adminHeaderLink.classList.add('hidden');
            }
        }
    },

    // ==========================================
    // 3. CART CONTROLLER (DRAWER & OPERATIONS)
    // ==========================================
    openCart() {
        const drawer = document.getElementById('drawer-c06-cart');
        const panel = document.getElementById('drawer-cart-panel');
        if (drawer && panel) {
            drawer.classList.remove('pointer-events-none');
            drawer.classList.remove('opacity-0');
            panel.classList.remove('translate-x-full');
            panel.classList.add('translate-x-0');
            document.body.style.overflow = 'hidden';
        }
    },

    closeCart() {
        const drawer = document.getElementById('drawer-c06-cart');
        const panel = document.getElementById('drawer-cart-panel');
        if (drawer && panel) {
            panel.classList.remove('translate-x-0');
            panel.classList.add('translate-x-full');
            drawer.classList.add('opacity-0');
            drawer.classList.add('pointer-events-none');
            document.body.style.overflow = '';
        }
    },

    addToCart(productId, sizeLabel = null, quantity = 1) {
        const product = STORE_DATA.products.find(p => p.id === productId);
        if (!product) return;

        const size = sizeLabel || (product.sizes && product.sizes[0] ? product.sizes[0].label : 'Standard');
        const sizeObj = product.sizes ? product.sizes.find(s => s.label === size) : null;
        const price = sizeObj ? sizeObj.price : product.price;

        const existingItem = STORE_DATA.cart.find(item => item.productId === productId && item.size === size);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            STORE_DATA.cart.push({
                productId: product.id,
                name: product.name,
                size: size,
                price: price,
                quantity: quantity,
                image: product.image
            });
        }

        this.renderCartUI();
        this.showToast(`Added "${product.name}" (${size}) to your cart!`);
        this.openCart();
    },

    updateCartQty(index, delta) {
        if (STORE_DATA.cart[index]) {
            STORE_DATA.cart[index].quantity += delta;
            if (STORE_DATA.cart[index].quantity <= 0) {
                STORE_DATA.cart.splice(index, 1);
                this.showToast('Item removed from cart.');
            }
            this.renderCartUI();
        }
    },

    removeFromCart(index) {
        if (STORE_DATA.cart[index]) {
            STORE_DATA.cart.splice(index, 1);
            this.showToast('Item removed from cart.');
            this.renderCartUI();
        }
    },

    applyCoupon(code) {
        const coupon = STORE_DATA.coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
        if (!coupon) {
            this.showToast('Invalid or expired coupon code!', 'error');
            return;
        }

        const subtotal = STORE_DATA.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (coupon.minOrder && subtotal < coupon.minOrder) {
            this.showToast(`Minimum order of $${coupon.minOrder.toFixed(2)} required for this code.`, 'error');
            return;
        }

        STORE_DATA.appliedCoupon = coupon;
        this.showToast(`Coupon ${coupon.code} applied successfully!`);
        this.renderCartUI();
    },

    renderCartUI() {
        const container = document.getElementById('cart-items-container');
        const badge = document.getElementById('header-cart-badge');
        const drawerCount = document.getElementById('drawer-cart-count');
        const subtotalEl = document.getElementById('cart-subtotal');
        const discountEl = document.getElementById('cart-discount');
        const totalEl = document.getElementById('cart-total');
        const freeShipBar = document.getElementById('cart-freeship-bar');
        const freeShipText = document.getElementById('cart-freeship-text');

        const totalItemsCount = STORE_DATA.cart.reduce((sum, item) => sum + item.quantity, 0);
        if (badge) {
            badge.textContent = totalItemsCount;
            badge.classList.toggle('hidden', totalItemsCount === 0);
        }
        if (drawerCount) drawerCount.textContent = `(${totalItemsCount})`;

        const subtotal = STORE_DATA.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Calculate discount
        let discount = 0;
        if (STORE_DATA.appliedCoupon) {
            if (STORE_DATA.appliedCoupon.discountPercent) {
                discount = Math.round(subtotal * (STORE_DATA.appliedCoupon.discountPercent / 100) * 100) / 100;
            } else if (STORE_DATA.appliedCoupon.discountAmount) {
                discount = STORE_DATA.appliedCoupon.discountAmount;
            }
        }

        const shipping = subtotal >= 35 || subtotal === 0 ? 0 : 5.00;
        const total = Math.max(0, subtotal - discount + shipping);

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (discountEl) discountEl.textContent = `-$${discount.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

        // Free shipping progress bar (Goal: $35)
        const freeShipThreshold = 35;
        if (freeShipBar && freeShipText) {
            if (subtotal >= freeShipThreshold) {
                freeShipBar.style.width = '100%';
                freeShipText.innerHTML = '<span class="text-[#00A3A6] font-semibold">Congratulations! You qualify for free shipping.</span>';
            } else {
                const percent = Math.min(100, Math.round((subtotal / freeShipThreshold) * 100));
                freeShipBar.style.width = `${percent}%`;
                const remaining = (freeShipThreshold - subtotal).toFixed(2);
                freeShipText.innerHTML = `Add <strong class="text-[#6E473B]">$${remaining}</strong> more for free shipping`;
            }
        }

        if (!container) return;

        if (STORE_DATA.cart.length === 0) {
            container.innerHTML = `
                <div class="py-16 text-center text-[#6B625B]">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F7F3EC] flex items-center justify-center text-[#6E473B]">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                    </div>
                    <p class="font-medium text-[#4A2E2B] mb-1">Your cart is empty</p>
                    <p class="text-sm">Discover our collection of pure argan essentials.</p>
                    <button onclick="App.closeCart(); App.navigateTo('c02-shop');" class="mt-4 px-6 py-2.5 rounded-full bg-[#6E473B] text-white text-sm font-semibold hover:bg-[#4A2E2B] transition-all">Explore Products</button>
                </div>
            `;
            return;
        }

        container.innerHTML = STORE_DATA.cart.map((item, index) => `
            <div class="flex gap-4 p-3 bg-white rounded-xl border border-[#E7E3DC] shadow-sm transition-all hover:border-[#8A5B4D]/50">
                <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded-lg flex-shrink-0 bg-[#FDFBF7]" />
                <div class="flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-start justify-between gap-2">
                            <h4 class="text-sm font-semibold text-[#4A2E2B] line-clamp-1">${item.name}</h4>
                            <button onclick="App.removeFromCart(${index})" class="text-[#9B938B] hover:text-red-500 transition-colors p-0.5" title="Remove">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <span class="inline-block text-xs text-[#6B625B] bg-[#F7F3EC] px-2 py-0.5 rounded mt-1">Size: ${item.size}</span>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                        <span class="text-sm font-bold text-[#6E473B]">$${(item.price * item.quantity).toFixed(2)}</span>
                        <div class="flex items-center border border-[#E7E3DC] rounded-lg bg-[#FDFBF7]">
                            <button onclick="App.updateCartQty(${index}, -1)" class="w-7 h-7 flex items-center justify-center text-[#4A2E2B] hover:bg-[#E7E3DC] rounded-l-lg transition-colors font-semibold">-</button>
                            <span class="w-8 text-center text-xs font-semibold text-[#4A2E2B]">${item.quantity}</span>
                            <button onclick="App.updateCartQty(${index}, 1)" class="w-7 h-7 flex items-center justify-center text-[#4A2E2B] hover:bg-[#E7E3DC] rounded-r-lg transition-colors font-semibold">+</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // ==========================================
    // 4. SHOP & PRODUCT FILTER CONTROLLER
    // ==========================================
    renderShopProducts(filterCategory = 'all', filterHairType = 'all', sortBy = 'best-seller') {
        const grid = document.getElementById('shop-products-grid');
        if (!grid) return;

        let filtered = [...STORE_DATA.products];

        if (filterCategory !== 'all') {
            filtered = filtered.filter(p => p.category === filterCategory);
        }

        if (filterHairType !== 'all') {
            filtered = filtered.filter(p => p.hairType.includes(filterHairType) || p.hairType.includes('all'));
        }

        if (sortBy === 'price-low') {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price-high') {
            filtered.sort((a, b) => b.price - a.price);
        } else if (sortBy === 'rating') {
            filtered.sort((a, b) => b.rating - a.rating);
        }

        const countEl = document.getElementById('shop-product-count');
        if (countEl) countEl.textContent = `${filtered.length} products`;

        grid.innerHTML = filtered.map(product => `
            <div class="group product-card flex flex-col justify-between">
                <div class="relative overflow-hidden bg-[#FAF7F2] aspect-square rounded-t-2xl cursor-pointer" onclick="App.navigateTo('c03-pdp', '${product.id}')">
                    <img src="${product.image}" alt="${product.name}" class="card-img w-full h-full object-cover" />

                    <div class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <button onclick="event.stopPropagation(); App.addToCart('${product.id}')" class="p-3 bg-[#6E473B] text-white rounded-full shadow-lg hover:bg-[#4A2E2B] transition-transform active:scale-95" title="Quick add to cart">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                    </div>
                </div>

                <div class="p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center gap-1.5 mb-2">
                            <div class="flex text-[#00A3A6]">
                                ${'★'.repeat(Math.floor(product.rating))}
                            </div>
                            <span class="text-xs font-semibold text-[#00A3A6]">${product.rating}</span>
                            <span class="text-xs text-[#9B938B]">(${product.reviewsCount})</span>
                        </div>
                        <h3 class="font-semibold text-[#4A2E2B] text-base leading-snug line-clamp-2 hover:text-[#6E473B] transition-colors cursor-pointer" onclick="App.navigateTo('c03-pdp', '${product.id}')">
                            ${product.name}
                        </h3>
                        <p class="text-xs text-[#6B625B] mt-1.5 line-clamp-2">${product.shortDesc}</p>
                    </div>

                    <div class="mt-4 pt-3 border-t border-[#E7E3DC] flex items-center justify-between">
                        <div>
                            <span class="text-base font-bold text-[#6E473B]">$${product.price.toFixed(2)}</span>
                            ${product.originalPrice ? `<span class="text-xs text-[#9B938B] line-through ml-2">$${product.originalPrice.toFixed(2)}</span>` : ''}
                        </div>
                        <button onclick="App.addToCart('${product.id}')" class="btn-cta-buy text-xs px-3 py-1.5">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // ==========================================
    // 5. PDP (PRODUCT DETAIL PAGE) CONTROLLER
    // ==========================================
    renderPDP() {
        const product = STORE_DATA.currentProductPDP || STORE_DATA.products[0];

        // Titles & Meta
        const titleEl = document.getElementById('pdp-title');
        const priceEl = document.getElementById('pdp-price');
        const origPriceEl = document.getElementById('pdp-original-price');
        const descEl = document.getElementById('pdp-desc');
        const mainImgEl = document.getElementById('pdp-main-image');
        const thumbsContainer = document.getElementById('pdp-thumbnails');
        const sizesContainer = document.getElementById('pdp-sizes');
        const stockEl = document.getElementById('pdp-stock-status');
        const breadcrumbTitle = document.getElementById('pdp-breadcrumb-title');

        if (titleEl) titleEl.textContent = product.name;
        if (breadcrumbTitle) breadcrumbTitle.textContent = product.name;
        if (descEl) descEl.textContent = product.shortDesc;

        // Selected size state
        let currentSize = product.sizes && product.sizes[0] ? product.sizes[0] : { label: 'Standard', price: product.price };
        if (priceEl) priceEl.textContent = `$${currentSize.price.toFixed(2)}`;
        if (origPriceEl) {
            origPriceEl.textContent = product.originalPrice ? `$${product.originalPrice.toFixed(2)}` : '';
            origPriceEl.classList.toggle('hidden', !product.originalPrice);
        }

        if (mainImgEl) mainImgEl.src = product.image;
        if (stockEl) stockEl.textContent = `In Stock (${product.stock} units ready to ship)`;

        // Thumbnails
        if (thumbsContainer) {
            thumbsContainer.innerHTML = product.images.map((imgUrl, idx) => `
                <button onclick="App.setPDPMainImage('${imgUrl}')" class="pdp-thumb-btn w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${idx === 0 ? 'border-[#6E473B]' : 'border-transparent hover:border-[#8A5B4D]/50'}">
                    <img src="${imgUrl}" class="w-full h-full object-cover" />
                </button>
            `).join('');
        }

        // Capacity Sizes
        if (sizesContainer && product.sizes) {
            sizesContainer.innerHTML = product.sizes.map((s, idx) => `
                <button type="button" onclick="App.selectPDPSize('${s.label}', ${s.price}, this)" class="pdp-size-btn px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${idx === 0 ? 'border-[#6E473B] bg-[#6E473B]/10 text-[#6E473B]' : 'border-[#E7E3DC] text-[#4A2E2B] hover:border-[#6E473B]'}">
                    ${s.label} - $${s.price.toFixed(2)}
                </button>
            `).join('');
        }

        // Ingredients & Usage tabs content
        const ingredientsEl = document.getElementById('pdp-tab-ingredients');
        const usageEl = document.getElementById('pdp-tab-usage');
        if (ingredientsEl) ingredientsEl.textContent = product.ingredients;
        if (usageEl) usageEl.textContent = product.usage;
    },

    setPDPMainImage(url) {
        const mainImg = document.getElementById('pdp-main-image');
        if (mainImg) mainImg.src = url;

        document.querySelectorAll('.pdp-thumb-btn').forEach(btn => {
            const img = btn.querySelector('img');
            if (img && img.src === url) {
                btn.classList.add('border-[#6E473B]');
                btn.classList.remove('border-transparent');
            } else {
                btn.classList.remove('border-[#6E473B]');
                btn.classList.add('border-transparent');
            }
        });
    },

    selectPDPSize(sizeLabel, price, btnElement) {
        const priceEl = document.getElementById('pdp-price');
        if (priceEl) priceEl.textContent = `$${price.toFixed(2)}`;

        document.querySelectorAll('.pdp-size-btn').forEach(b => {
            b.classList.remove('border-[#6E473B]', 'bg-[#6E473B]/10', 'text-[#6E473B]');
            b.classList.add('border-[#E7E3DC]', 'text-[#4A2E2B]');
        });

        if (btnElement) {
            btnElement.classList.add('border-[#6E473B]', 'bg-[#6E473B]/10', 'text-[#6E473B]');
            btnElement.classList.remove('border-[#E7E3DC]');
        }
    },

    addCurrentPDPToCart() {
        const product = STORE_DATA.currentProductPDP || STORE_DATA.products[0];
        const qtyInput = document.getElementById('pdp-qty-input');
        const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

        // Find active size
        const activeSizeBtn = document.querySelector('.pdp-size-btn.border-\\[\\#6E473B\\]');
        let size = '100ml';
        if (activeSizeBtn) {
            size = activeSizeBtn.textContent.split('-')[0].trim();
        }

        this.addToCart(product.id, size, qty);
    },

    // ==========================================
    // 6. HAIR QUIZ & ROUTINE FLOW CONTROLLER
    // ==========================================
    startQuiz() {
        this.activeQuizStep = 1;
        this.quizAnswers = { hairType: '', concern: '', heatStyling: '' };
        this.renderQuizStep();
        this.navigateTo('c04-quiz');
    },

    selectQuizAnswer(stepKey, value) {
        this.quizAnswers[stepKey] = value;
        if (this.activeQuizStep < 3) {
            this.activeQuizStep++;
            this.renderQuizStep();
        } else {
            // Complete quiz and show C05 routine result
            this.showToast('Hair analysis complete! Discover your personalized routine.');
            this.navigateTo('c05-routine');
        }
    },

    renderQuizStep() {
        document.querySelectorAll('.quiz-step-pane').forEach(el => el.classList.add('hidden'));
        const activePane = document.getElementById(`quiz-step-${this.activeQuizStep}`);
        if (activePane) activePane.classList.remove('hidden');

        // Update step indicator
        const stepNum = document.getElementById('quiz-step-number');
        const progressBar = document.getElementById('quiz-progress-bar');
        if (stepNum) stepNum.textContent = `Step ${this.activeQuizStep} / 3`;
        if (progressBar) progressBar.style.width = `${(this.activeQuizStep / 3) * 100}%`;
    },

    addCompleteRoutineToCart() {
        // Add 3 combo items with 15% discount
        this.addToCart('m-02', '250ml', 1);
        this.addToCart('m-04', '250ml', 1);
        this.addToCart('m-01', '100ml', 1);
        this.applyCoupon('VIPARGAN');
        this.showToast('Added complete 3-step Repair Routine with 15% discount!');
    },

    // ==========================================
    // 7. CHECKOUT & ORDER COMPLETION
    // ==========================================
    renderCheckoutSummary() {
        const container = document.getElementById('checkout-items-summary');
        const subtotalEl = document.getElementById('checkout-subtotal');
        const discountEl = document.getElementById('checkout-discount');
        const totalEl = document.getElementById('checkout-total');

        const subtotal = STORE_DATA.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discount = 0;
        if (STORE_DATA.appliedCoupon) {
            if (STORE_DATA.appliedCoupon.discountPercent) {
                discount = Math.round(subtotal * (STORE_DATA.appliedCoupon.discountPercent / 100) * 100) / 100;
            } else if (STORE_DATA.appliedCoupon.discountAmount) {
                discount = STORE_DATA.appliedCoupon.discountAmount;
            }
        }
        const shipping = subtotal >= 35 || subtotal === 0 ? 0 : 5.00;
        const total = Math.max(0, subtotal - discount + shipping);

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (discountEl) discountEl.textContent = `-$${discount.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

        if (container) {
            container.innerHTML = STORE_DATA.cart.map(item => `
                <div class="flex items-center justify-between text-sm py-2 border-b border-[#E7E3DC]">
                    <div class="flex items-center gap-3">
                        <img src="${item.image}" class="w-12 h-12 object-cover rounded-lg border border-[#E7E3DC]" />
                        <div>
                            <p class="font-semibold text-[#4A2E2B] line-clamp-1">${item.name}</p>
                            <span class="text-xs text-[#6B625B]">${item.size} × ${item.quantity}</span>
                        </div>
                    </div>
                    <span class="font-bold text-[#6E473B]">$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('');
        }
    },

    submitCheckout(e) {
        if (e) e.preventDefault();

        if (STORE_DATA.cart.length === 0) {
            this.showToast('Your cart is empty! Please add products before checking out.', 'error');
            this.navigateTo('c02-shop');
            return;
        }

        const nameInput = document.getElementById('checkout-name');
        const phoneInput = document.getElementById('checkout-phone');
        const addressInput = document.getElementById('checkout-address');
        const paymentRadio = document.querySelector('input[name="payment-method"]:checked');

        const newOrderId = `MC-${Math.floor(100000 + Math.random() * 900000)}`;
        const subtotal = STORE_DATA.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let discount = STORE_DATA.appliedCoupon ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
        const total = Math.max(0, subtotal - discount);

        const newOrder = {
            id: newOrderId,
            date: new Date().toLocaleDateString('en-US'),
            customerName: (nameInput && nameInput.value) || STORE_DATA.currentUser.name,
            phone: (phoneInput && phoneInput.value) || STORE_DATA.currentUser.phone,
            address: (addressInput && addressInput.value) || 'Landmark 81, 720A Dien Bien Phu, Binh Thanh, HCMC',
            paymentMethod: paymentRadio ? paymentRadio.value : 'Bank Transfer',
            paymentStatus: paymentRadio && paymentRadio.value.includes('Bank') ? 'Pending Payment' : 'Pending COD Confirmation',
            status: 'pending',
            statusLabel: 'Processing',
            items: [...STORE_DATA.cart],
            discount: discount,
            shippingFee: 0,
            total: total,
            trackingSteps: [
                { title: 'Order placed successfully', time: 'Just now', done: true },
                { title: 'Awaiting warehouse confirmation', time: 'Est. 30 minutes', done: false },
                { title: 'Dispatched to carrier', time: 'Est. today', done: false }
            ]
        };

        STORE_DATA.orders.unshift(newOrder);

        // Populate Success Screen
        const successOrderId = document.getElementById('success-order-id');
        const successTotal = document.getElementById('success-order-total');
        const successMethod = document.getElementById('success-payment-method');
        if (successOrderId) successOrderId.textContent = newOrderId;
        if (successTotal) successTotal.textContent = `$${total.toFixed(2)}`;
        if (successMethod) successMethod.textContent = newOrder.paymentMethod;

        // Clear cart
        STORE_DATA.cart = [];
        STORE_DATA.appliedCoupon = null;
        this.renderCartUI();
        this.renderUserOrders();
        this.renderAdminOrders();

        this.showToast('Order placed successfully! Thank you for choosing Moroccanoil.');
        this.navigateTo('c08-c09-success');
    },

    // ==========================================
    // 8. USER PROFILE & ORDER HISTORY
    // ==========================================
    renderUserOrders() {
        const container = document.getElementById('user-orders-list');
        if (!container) return;

        container.innerHTML = STORE_DATA.orders.map(order => `
            <div class="bg-white rounded-2xl border border-[#E7E3DC] p-5 shadow-sm hover:border-[#8A5B4D] transition-all">
                <div class="flex flex-wrap items-center justify-between pb-4 border-b border-[#E7E3DC] gap-2">
                    <div>
                        <div class="flex items-center gap-3">
                            <span class="font-bold text-[#4A2E2B] text-base">Order #${order.id}</span>
                            <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                order.status === 'shipping' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-[#805719]'
            }">${order.statusLabel}</span>
                        </div>
                        <p class="text-xs text-[#9B938B] mt-0.5">Date: ${order.date} • ${order.paymentMethod}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs text-[#6B625B]">Total:</span>
                        <div class="text-base font-bold text-[#6E473B]">$${order.total.toFixed(2)}</div>
                    </div>
                </div>

                <div class="py-4 space-y-3">
                    ${order.items.map(item => `
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-[#4A2E2B] font-medium">${item.name} <span class="text-xs text-[#9B938B]">(${item.size || '100ml'} × ${item.qty || item.quantity || 1})</span></span>
                            <span class="font-semibold text-[#6E473B]">$${(item.price * (item.qty || item.quantity || 1)).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="pt-3 border-t border-[#E7E3DC] flex items-center justify-between">
                    <span class="text-xs text-[#6B625B] truncate max-w-[280px]">Ship to: ${order.address}</span>
                    <button onclick="App.openOrderDetailModal('${order.id}')" class="text-xs font-bold text-[#6E473B] hover:text-[#4A2E2B] px-4 py-2 rounded-full border border-[#6E473B] hover:bg-[#6E473B]/5 transition-all">
                        View Details & Track
                    </button>
                </div>
            </div>
        `).join('');
    },

    openOrderDetailModal(orderId) {
        const order = STORE_DATA.orders.find(o => o.id === orderId);
        if (!order) return;

        const modal = document.getElementById('modal-c14-order-detail');
        const modalContent = document.getElementById('order-detail-modal-body');
        if (!modal || !modalContent) return;

        modalContent.innerHTML = `
            <div class="space-y-6">
                <div class="flex items-center justify-between pb-4 border-b border-[#E7E3DC]">
                    <div>
                        <h3 class="text-lg font-bold text-[#4A2E2B]">Order Details #${order.id}</h3>
                        <p class="text-xs text-[#9B938B]">Date: ${order.date}</p>
                    </div>
                    <span class="badge-teal">${order.statusLabel}</span>
                </div>

                <!-- Timeline Tracking -->
                <div>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-[#6B625B] mb-3">Shipping Timeline</h4>
                    <div class="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E7E3DC]">
                        ${order.trackingSteps ? order.trackingSteps.map(step => `
                            <div class="flex items-start gap-3 relative">
                                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 ${step.done ? 'bg-[#00A3A6] text-white shadow' : 'bg-gray-200 text-gray-500'}">
                                    ${step.done ? '✓' : '•'}
                                </div>
                                <div>
                                    <p class="text-sm font-semibold text-[#4A2E2B]">${step.title}</p>
                                    <p class="text-xs text-[#9B938B]">${step.time}</p>
                                </div>
                            </div>
                        `).join('') : '<p class="text-xs text-gray-500">Order is being prepared.</p>'}
                    </div>
                </div>

                <!-- Shipping Address -->
                <div class="bg-[#FDFBF7] p-4 rounded-xl border border-[#E7E3DC]">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-[#6B625B] mb-2">Shipping Address</h4>
                    <p class="text-sm font-semibold text-[#4A2E2B]">${order.customerName} - ${order.phone}</p>
                    <p class="text-xs text-[#6B625B] mt-1">${order.address}</p>
                </div>

                <!-- Products Summary -->
                <div>
                    <h4 class="text-xs font-bold uppercase tracking-wider text-[#6B625B] mb-2">Order Items</h4>
                    <div class="space-y-2">
                        ${order.items.map(item => `
                            <div class="flex justify-between text-sm py-1">
                                <span class="text-[#4A2E2B]">${item.name} (${item.size || '100ml'}) × ${item.qty || item.quantity || 1}</span>
                                <span class="font-bold text-[#6E473B]">$${(item.price * (item.qty || item.quantity || 1)).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="pt-3 mt-3 border-t border-[#E7E3DC] flex justify-between text-base font-bold text-[#4A2E2B]">
                        <span>Order Total</span>
                        <span class="text-[#6E473B]">$${order.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        modal.classList.remove('opacity-0');
    },

    closeOrderDetailModal() {
        const modal = document.getElementById('modal-c14-order-detail');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.add('opacity-0');
        }
    },

    // ==========================================
    // 9. ADMIN DASHBOARD CONTROLLER (A01 - A14)
    // ==========================================
    renderAdminOrders() {
        const tableBody = document.getElementById('admin-orders-table');
        if (!tableBody) return;

        tableBody.innerHTML = STORE_DATA.orders.map(order => `
            <tr class="border-b border-[#E7E3DC] hover:bg-[#FDFBF7] transition-colors">
                <td class="p-3 font-semibold text-[#4A2E2B]">#${order.id}</td>
                <td class="p-3">
                    <p class="font-medium text-[#4A2E2B] text-sm">${order.customerName}</p>
                    <p class="text-xs text-[#9B938B]">${order.phone}</p>
                </td>
                <td class="p-3 text-xs text-[#6B625B]">${order.date}</td>
                <td class="p-3 font-bold text-[#6E473B] text-sm">$${order.total.toFixed(2)}</td>
                <td class="p-3">
                    <span class="text-xs px-2.5 py-1 rounded-full font-semibold ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                order.status === 'shipping' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-[#805719]'
            }">${order.statusLabel}</span>
                </td>
                <td class="p-3">
                    <button onclick="App.toggleOrderStatus('${order.id}')" class="text-xs text-[#6E473B] hover:text-[#4A2E2B] font-semibold underline mr-2">
                        Change Status
                    </button>
                    <button onclick="App.openOrderDetailModal('${order.id}')" class="text-xs text-[#00A3A6] hover:underline font-semibold">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    },

    toggleOrderStatus(orderId) {
        const order = STORE_DATA.orders.find(o => o.id === orderId);
        if (!order) return;

        if (order.status === 'pending') {
            order.status = 'shipping';
            order.statusLabel = 'In Transit';
        } else if (order.status === 'shipping') {
            order.status = 'completed';
            order.statusLabel = 'Delivered';
        } else {
            order.status = 'pending';
            order.statusLabel = 'Processing';
        }

        this.renderAdminOrders();
        this.renderUserOrders();
        this.showToast(`Order #${orderId} status updated to: ${order.statusLabel}`);
    },

    renderAdminProducts() {
        const tableBody = document.getElementById('admin-products-table');
        if (!tableBody) return;

        tableBody.innerHTML = STORE_DATA.products.map(p => `
            <tr class="border-b border-[#E7E3DC] hover:bg-[#FDFBF7] transition-colors">
                <td class="p-3">
                    <div class="flex items-center gap-3">
                        <img src="${p.image}" class="w-10 h-10 object-cover rounded-lg border border-[#E7E3DC]" />
                        <span class="font-semibold text-sm text-[#4A2E2B] line-clamp-1">${p.name}</span>
                    </div>
                </td>
                <td class="p-3 text-xs text-[#6B625B]">${p.categoryName}</td>
                <td class="p-3 text-sm font-bold text-[#6E473B]">$${p.price.toFixed(2)}</td>
                <td class="p-3 text-xs font-semibold ${p.stock < 50 ? 'text-amber-600' : 'text-green-600'}">${p.stock} units</td>
                <td class="p-3">
                    <span class="badge-teal">${p.badge || 'Standard'}</span>
                </td>
                <td class="p-3">
                    <button onclick="App.deleteProduct('${p.id}')" class="text-xs text-red-500 hover:text-red-700 font-semibold" title="Delete">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    },

    deleteProduct(id) {
        const idx = STORE_DATA.products.findIndex(p => p.id === id);
        if (idx > -1) {
            const name = STORE_DATA.products[idx].name;
            STORE_DATA.products.splice(idx, 1);
            this.renderAdminProducts();
            this.renderShopProducts();
            this.showToast(`Product deleted: ${name}`, 'info');
        }
    },

    openAddProductModal() {
        const modal = document.getElementById('modal-admin-add-product');
        if (modal) modal.classList.remove('hidden');
    },

    closeAddProductModal() {
        const modal = document.getElementById('modal-admin-add-product');
        if (modal) modal.classList.add('hidden');
    },

    submitNewProduct(e) {
        if (e) e.preventDefault();
        const name = document.getElementById('admin-new-name').value;
        const category = document.getElementById('admin-new-category').value;
        const price = parseFloat(document.getElementById('admin-new-price').value) || 30.00;
        const stock = parseInt(document.getElementById('admin-new-stock').value) || 50;

        const newProd = {
            id: `m-custom-${Date.now()}`,
            name: name,
            category: category,
            categoryName: {
                'styling': 'Styling & Finishing',
                'mask': 'Hair Masks',
                'shampoo': 'Shampoo',
                'conditioner': 'Conditioner',
                'oil': 'Treatment / Oil',
                'dry-shampoo': 'Dry Shampoo'
            }[category] || 'Haircare',
            hairType: ['all'],
            price: price,
            rating: 5.0,
            reviewsCount: 1,
            isBestSeller: false,
            badge: 'New',
            image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80',
            images: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80'],
            shortDesc: 'Genuine Moroccanoil product added to the system inventory.',
            sizes: [{ label: 'Standard', price: price, selected: true }],
            stock: stock,
            ingredients: 'Pure Moroccan Argan Oil, Natural Vitamin E.',
            usage: 'Use as directed by salon professionals.'
        };

        STORE_DATA.products.unshift(newProd);
        this.renderAdminProducts();
        this.renderShopProducts();
        this.closeAddProductModal();
        this.showToast(`Product "${name}" added successfully!`);
    },

    // ==========================================
    // 10. AUTH MODAL (C10/C11)
    // ==========================================
    openAuthModal() {
        const modal = document.getElementById('modal-c10-auth');
        if (modal) modal.classList.remove('hidden');
    },

    closeAuthModal() {
        const modal = document.getElementById('modal-c10-auth');
        if (modal) modal.classList.add('hidden');
    },

    switchAuthTab(tabName) {
        document.querySelectorAll('.auth-tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.auth-tab-btn').forEach(b => {
            b.classList.remove('border-[#6E473B]', 'text-[#6E473B]');
            b.classList.add('border-transparent', 'text-[#6B625B]');
        });

        const activeContent = document.getElementById(`auth-tab-${tabName}`);
        const activeBtn = document.getElementById(`auth-btn-${tabName}`);
        if (activeContent) activeContent.classList.remove('hidden');
        if (activeBtn) {
            activeBtn.classList.add('border-[#6E473B]', 'text-[#6E473B]');
            activeBtn.classList.remove('border-transparent', 'text-[#6B625B]');
        }
    },

    submitLogin(e) {
        if (e) e.preventDefault();
        this.setRole('customer');
        this.closeAuthModal();
        this.showToast('Login successful! Welcome back, ' + STORE_DATA.currentUser.name);
    },

    // ==========================================
    // 11. TOAST NOTIFICATION UTILITY
    // ==========================================
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        if (type === 'error') {
            toast.style.borderLeftColor = '#EF4444';
        } else if (type === 'info') {
            toast.style.borderLeftColor = '#6E473B';
        }

        toast.innerHTML = `
            <div class="w-5 h-5 flex-shrink-0 ${type === 'error' ? 'text-red-500' : (type === 'info' ? 'text-[#6E473B]' : 'text-[#00A3A6]')}">
                ${type === 'error' ?
                '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' :
                '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
            }
            </div>
            <p class="text-sm font-medium text-[#4A2E2B] flex-1">${message}</p>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    },

    // ==========================================
    // 12. EVENT BINDING & LISTENERS
    // ==========================================
    bindEvents() {
        // Floating screen switch selector
        const quickSelect = document.getElementById('floating-screen-select');
        if (quickSelect) {
            quickSelect.addEventListener('change', (e) => {
                this.navigateTo(e.target.value);
            });
        }

        // Shop search and filters
        const categoryFilter = document.getElementById('shop-category-filter');
        const hairTypeFilter = document.getElementById('shop-hairtype-filter');
        const sortFilter = document.getElementById('shop-sort-filter');

        const triggerFilter = () => {
            const cat = categoryFilter ? categoryFilter.value : 'all';
            const hair = hairTypeFilter ? hairTypeFilter.value : 'all';
            const sort = sortFilter ? sortFilter.value : 'best-seller';
            this.renderShopProducts(cat, hair, sort);
        };

        if (categoryFilter) categoryFilter.addEventListener('change', triggerFilter);
        if (hairTypeFilter) hairTypeFilter.addEventListener('change', triggerFilter);
        if (sortFilter) sortFilter.addEventListener('change', triggerFilter);
    }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

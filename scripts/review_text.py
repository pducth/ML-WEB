"""Customer review wording for the simulated storefront reviews (see build_mock_db.build_reviews).

Comments are composed from a main sentence for the category and rating, plus optional clauses about the size
bought, delivery and what the reviewer will do next, so that no two reviews read alike.
"""

from __future__ import annotations

import random

# main sentences per category: positive (4-5 stars), mixed (3 stars), negative (1-2 stars)
MAIN: dict[str, dict[str, list[str]]] = {
    "Shampoo": {
        "pos": [
            "Cleans really well without leaving my hair squeaky or stripped.",
            "Lathers beautifully and a little goes a long way.",
            "My scalp feels fresh for two full days now. Did not expect that.",
            "Hair feels light and clean, and the scent is subtle but gorgeous.",
            "Switched from my old drugstore shampoo and the difference is obvious after a few washes.",
            "Gentle enough for everyday use. My scalp stopped feeling tight.",
            "Rinses out clean and my hair dries softer than before.",
            "Great foam, great smell, and my roots stay fresh longer.",
            "I have a sensitive scalp and this did not irritate it at all.",
            "Exactly what I wanted: clean, soft, no heavy residue.",
            "The texture is lovely and it makes the whole shower feel like a treat.",
            "Noticeably less buildup. My hair has more movement now.",
        ],
        "mid": [
            "Cleans fine and smells nice, but I did not see a big difference from my usual shampoo.",
            "Good shampoo. It dried my ends a little, so I pair it with a heavy conditioner.",
            "Nice lather, though I need two rounds to feel properly clean.",
            "Works, but the scent faded quickly for me.",
        ],
        "neg": [
            "Left my scalp feeling dry and a bit itchy. Not for me.",
            "Too drying on my ends, and my hair felt rough after.",
            "Did not lather much and my hair felt coated afterwards.",
        ],
    },
    "Conditioner": {
        "pos": [
            "Detangles in seconds and my hair feels silky once it dries.",
            "Soft, smooth and never greasy. I leave it in for a few minutes and the difference shows.",
            "My ends finally feel hydrated. Brushing in the shower is so much easier now.",
            "Lightweight but really nourishing. No limp roots.",
            "Smells expensive and leaves my hair shiny.",
            "Frizz is much better, even on humid days.",
            "Creamy texture, spreads easily, and rinses out clean.",
            "My hair air-dries smoother with this than with anything else I have tried.",
            "Makes my colour-treated hair feel healthy again.",
            "A small amount covers my whole length. Excellent value.",
        ],
        "mid": [
            "Nice and creamy, but I wanted a bit more slip on my thick hair.",
            "Decent conditioner. Pleasant scent, results are good rather than amazing.",
            "Hydrates well, although it weighs my fine hair down if I use too much.",
        ],
        "neg": [
            "Made my hair greasy and heavy even with a tiny amount.",
            "Did not detangle much at all. Disappointed for the price.",
        ],
    },
    "Hair Masks": {
        "pos": [
            "Ten minutes in the shower and my hair feels like it just left the salon.",
            "My dry ends are so much softer after one use. Proper repair, not just a coating.",
            "Thick, creamy and a little goes far. Hair is shiny and bouncy afterwards.",
            "Rescued my bleached hair. It feels strong and smooth again.",
            "I use it once a week and my hair has never looked healthier.",
            "Leaves hair hydrated without making it flat or greasy.",
            "The texture is dreamy and the scent lingers in a good way.",
            "Worth every penny. My breakage is down and my hair is glossy.",
            "Deep conditioning that actually works. I notice it for days.",
            "Smooths my frizz and makes styling so much easier.",
        ],
        "mid": [
            "Good mask, but I expected a bigger change in my damaged ends.",
            "Nice and rich. Takes a lot of rinsing though.",
            "Works nicely once I leave it on for longer than the label says.",
        ],
        "neg": [
            "Too heavy for my hair. It felt greasy even after a double rinse.",
            "Did not do much for my dry ends. Overpriced for what it is.",
        ],
    },
    "Treatment / Oil": {
        "pos": [
            "Two drops on damp hair and the shine is unreal. Zero greasiness.",
            "Tames my flyaways and my ends look so much healthier.",
            "A little goes a long way. This bottle is going to last me months.",
            "Absorbs quickly and leaves a soft, glossy finish.",
            "Cut my blow-dry time and the frizz is gone. Love the scent too.",
            "My scalp feels calmer and my hair looks fuller after a few weeks.",
            "Light, silky texture. I use it on dry hair for a finishing touch and it looks polished.",
            "Noticed softer, shinier hair within a week.",
            "Smells wonderful and does exactly what it promises.",
            "Heat-styled hair looks much healthier since I started using this.",
        ],
        "mid": [
            "Nice oil and lovely scent, though I did not see dramatic results yet.",
            "Works as a finishing oil. I expected more from the repair claims.",
            "Good product but easy to overdo. Needs very little.",
        ],
        "neg": [
            "Too oily on my fine hair, even with one drop.",
            "Did not notice any difference after a month. Disappointed.",
        ],
    },
    "Dry Shampoo": {
        "pos": [
            "Instantly refreshes my roots and leaves no white residue at all.",
            "Perfect for busy mornings. Hair looks clean and has some volume.",
            "Absorbs oil really well and the scent is light. Lasts through the day.",
            "Finally a dry shampoo that works on dark hair without the grey cast.",
            "Great for second-day hair, and it does not make my scalp itchy.",
            "Fine mist, easy to brush out. A staple in my gym bag now.",
        ],
        "mid": [
            "Works for a quick refresh but the scent is stronger than I like.",
            "Does the job, though I need a lot of product for thick hair.",
        ],
        "neg": [
            "Left a chalky residue on my hair. Hard to brush out.",
            "Barely absorbed any oil for me.",
        ],
    },
    "Styling & Finishing": {
        "pos": [
            "Gives hold without any crunch. My hair stays soft and touchable.",
            "My curls are defined, bouncy and frizz-free all day.",
            "Works as a heat protectant and leaves my hair shiny, not sticky.",
            "A little goes a long way, and it brushes out easily.",
            "Adds lovely volume at the roots without feeling heavy.",
            "Holds my style through humidity. I have repurchased it twice.",
            "Smells great and smooths flyaways instantly.",
            "Texture and hold are exactly what I wanted. Looks natural, not stiff.",
            "Easy to work through damp hair and my blowouts last longer.",
            "Perfect finishing step. My hair looks polished and healthy.",
        ],
        "mid": [
            "Decent hold, but it faded by the evening on my fine hair.",
            "Nice product. A bit sticky if you use more than a pea size.",
            "Smells lovely, though the hold is lighter than I expected.",
        ],
        "neg": [
            "Left my hair stiff and sticky. Not what I hoped.",
            "Did not hold at all in humid weather.",
        ],
    },
}

SIZE_CLAUSE: dict[str, list[str]] = {
    "Travel": [
        "The travel size is perfect for my gym bag.",
        "Bought the mini first to test it. Now I am ordering the full size.",
        "Great size for trips, and it passes through airport security without a fuss.",
        "Nice to try before committing to the big bottle.",
    ],
    "Full": [
        "The full size lasts about two months for me.",
        "Good value in the standard bottle.",
    ],
    "Half-Liter": [
        "The large bottle is great value and sits on my shower shelf for months.",
        "Bought the big size for the whole family, and it is going fast.",
    ],
    "Liter": [
        "The litre bottle with the pump is brilliant value, and it lasts forever.",
        "Salon-size bottle is so much more economical per wash.",
    ],
}

SERVICE_CLAUSE = [
    "Arrived in three days, well packed.",
    "Fast delivery and the box was perfectly sealed.",
    "Shipping was quick and everything was sealed and authentic.",
    "Packaging was lovely and nothing leaked.",
    "Came earlier than expected.",
    "Great customer service when I asked about sizes.",
]

CLOSER_POS = [
    "Will definitely repurchase.",
    "Highly recommend.",
    "Already recommended it to my sister.",
    "Adding this to my regular routine.",
    "Worth the price.",
    "Five stars from me.",
    "Would buy again.",
    "Really happy with this one.",
]

CLOSER_MID = [
    "Might try a different one next time.",
    "Okay for the price, not a repeat purchase yet.",
    "Still deciding if I will reorder.",
]

CLOSER_NEG = [
    "Would not repurchase.",
    "Returning to my old routine.",
]

SHORT_POS = [
    "Love it!",
    "Amazing.",
    "Great product, great price.",
    "So good.",
    "Exactly as described.",
    "Obsessed with this.",
    "Perfect.",
    "Can't live without it now.",
    "Highly recommend!",
    "Smells divine.",
]

SHORT_NEG = ["Not for me.", "Disappointed.", "Expected more."]


def compose(category: str, rating: int, size_label: str, rng: random.Random, used: set[str]) -> str:
    """One review comment ('' for a star-only review), different from the ones already in `used`."""
    if rng.random() < 0.18:
        return ""  # many shoppers only leave stars
    pools = MAIN.get(category) or MAIN["Shampoo"]
    for _ in range(12):
        if rating >= 4:
            parts = [rng.choice(SHORT_POS)] if rng.random() < 0.14 else [rng.choice(pools["pos"])]
            if parts[0] in SHORT_POS:
                if rng.random() < 0.5:
                    parts.append(rng.choice(SIZE_CLAUSE[size_label]) if rng.random() < 0.5 else rng.choice(SERVICE_CLAUSE))
            else:
                extras = [SIZE_CLAUSE[size_label], SERVICE_CLAUSE, CLOSER_POS]
                for pool in rng.sample(extras, k=rng.choice([0, 1, 1, 2])):
                    parts.append(rng.choice(pool))
        elif rating == 3:
            parts = [rng.choice(pools["mid"])]
            if rng.random() < 0.5:
                parts.append(rng.choice(CLOSER_MID))
        else:
            parts = [rng.choice(SHORT_NEG)] if rng.random() < 0.2 else [rng.choice(pools["neg"])]
            if rng.random() < 0.5:
                parts.append(rng.choice(CLOSER_NEG))
        text = " ".join(parts)
        if text not in used:
            used.add(text)
            return text
    return text

"""Builds the Hair Routine Engine data for the 150 storefront products.

Writes into docs/HairRoutineEngine/:
  product_quiz_catalog.json   the 150 products with their quiz tags (step, needs, scalp types, auto-substitution)
  hair_routine_rules.json     the existing ruleset (questions and IF-THEN rules are kept) with the routine
                              candidates and add-ons rebuilt from ROUTES below

The quiz tags are written by hand (TAGS) from what each product is for, and the routine is a curated list per
label and step (ROUTES): the engine takes the first candidate whose condition matches the shopper's answers, whose
scalp tags fit and that is in stock. Put the most specific candidate first, the safe default last.

Run from the repository root after crawl/build of the storefront dataset:

    python scripts/build_quiz_catalog.py
"""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STOREFRONT = ROOT / "data" / "store" / "product_data" / "storefront" / "products.json"
ENGINE_DIR = ROOT / "docs" / "HairRoutineEngine"
RULESET = ENGINE_DIR / "hair_routine_rules.json"
CATALOG = ENGINE_DIR / "product_quiz_catalog.json"
RULESET_VERSION = "3.0.0"
GOAL_TO_LABEL = {
    "repair": "Repair",
    "scalp_care": "Scalp",
    "color_protect": "Color",
    "define_curls": "Curl",
    "hydrate": "Hydration",
    "volume": "Volume",
    "smooth_style": "Styling",
}

# ------------------------------------------------------------------------------------------ tags
# key: "step | needs | scalp types | flags"
#   step   cleanse, condition, treat, style
#   needs  labels the product answers (first = main purpose): Repair Scalp Color Curl Hydration Volume Styling
#   scalp  all, or n(ormal) o(ily) d(ry_sensitive) f(laky)
#   flags  X = never an automatic substitute (needs a tone, a bleached head, or a hold the shopper must choose)
TAGS: dict[str, str] = {
    # ---- AROMATICA
    "aromatica-quinoa-protein-shampoo": "cleanse|Repair,Hydration|all|",
    "aromatica-rosemary-geranium-scalp-scrub": "treat|Scalp|all|",
    "aromatica-rosemary-salt-scrub-shampoo": "cleanse|Scalp|nof|",
    "aromatica-rosemary-scalp-scaling-shampoo": "cleanse|Scalp|all|",
    "aromatica-rosemary-scalp-scaling-shampoo-bar": "cleanse|Scalp|all|",
    "aromatica-rosemary-scalp-scrub": "treat|Scalp|nof|",
    "aromatica-tea-tree-purifying-shampoo": "cleanse|Scalp|of|",
    "aromatica-rosemary-hair-thickening-conditioner": "condition|Volume,Hydration|all|",
    "aromatica-quinoa-protein-treatment-mask": "treat|Repair|all|",
    "aromatica-rosemary-3-in-1-treatment": "treat|Hydration,Scalp|all|",
    "aromatica-quinoa-protein-hair-ampoule": "treat|Repair|all|",
    "aromatica-replenishing-leave-in-treatment-lavender-patchouli": "treat|Repair,Styling|all|",
    "aromatica-ritual-hair-oil-jasmine-vetiver": "treat|Hydration,Styling|all|",
    "aromatica-ritual-hair-oil-lavender-patchouli": "treat|Hydration,Styling|all|",
    "aromatica-rosemary-pdrn-scalp-serum": "treat|Scalp,Volume|all|",
    "aromatica-rosemary-root-enhancer": "treat|Scalp,Volume|all|",
    "aromatica-rosemary-root-volumizing-scalp-ampoule": "treat|Volume,Scalp|no|",
    "aromatica-tea-tree-purifying-tonic": "treat|Scalp|of|",
    "aromatica-rosemary-dry-shampoo-powder": "style|Volume,Scalp|no|",
    "aromatica-replenishing-hair-mist-jasmine-vetiver": "style|Repair,Hydration|all|",
    # ---- Davines
    "davines-dede-shampoo": "cleanse|Hydration|all|",
    "davines-energizing-shampoo": "cleanse|Scalp,Volume|all|",
    "davines-heart-of-glass-silkening-chelating-shampoo": "cleanse|Color,Repair|all|X",
    "davines-love-curl-co-wash": "cleanse|Curl,Hydration|all|",
    "davines-love-curl-shampoo": "cleanse|Curl,Hydration|all|",
    "davines-love-smoothing-shampoo": "cleanse|Styling,Hydration|all|",
    "davines-melu-shampoo": "cleanse|Repair|all|",
    "davines-minu-shampoo": "cleanse|Color|all|",
    "davines-momo-shampoo": "cleanse|Hydration|all|",
    "davines-nounou-shampoo": "cleanse|Repair,Hydration|all|",
    "davines-nourishing-shampoo": "cleanse|Hydration,Scalp|nd|",
    "davines-oi-shampoo": "cleanse|Hydration,Styling|all|",
    "davines-purifying-shampoo": "cleanse|Scalp|fo|",
    "davines-solu-sea-salt-scrub": "treat|Scalp|nof|",
    "davines-solu-shampoo": "cleanse|Scalp|no|",
    "davines-volu-shampoo": "cleanse|Volume|all|",
    "davines-dede-conditioner": "condition|Hydration|all|",
    "davines-dede-leave-in-conditioner": "condition|Hydration|all|",
    "davines-heart-of-glass-rich-conditioner": "condition|Color,Repair|all|X",
    "davines-love-curl-conditioner": "condition|Curl,Hydration|all|",
    "davines-love-smoothing-conditioner": "condition|Styling,Hydration|all|",
    "davines-melu-conditioner": "condition|Repair|all|",
    "davines-minu-conditioner": "condition|Color|all|",
    "davines-momo-conditioner": "condition|Hydration|all|",
    "davines-nounou-conditioner": "condition|Repair,Hydration|all|",
    "davines-oi-all-in-one-milk": "condition|Hydration,Styling|all|",
    "davines-oi-conditioner": "condition|Hydration,Repair|all|",
    "davines-replumping-conditioner": "condition|Repair,Hydration|all|",
    "davines-volu-conditioner": "condition|Volume|all|",
    "davines-beautiful-things-restoring-leave-in-mask": "treat|Repair,Color|all|",
    "davines-nounou-mask": "treat|Repair,Hydration|all|",
    "davines-oi-hair-butter": "treat|Hydration,Styling|all|",
    "davines-replenishing-butter": "treat|Hydration|all|",
    "davines-energizing-overnight-serum": "treat|Scalp,Volume|all|",
    "davines-heart-of-glass-instant-bonding-glow": "treat|Repair,Color|all|X",
    "davines-nourishing-oil": "treat|Hydration|all|",
    "davines-oi-oil": "treat|Hydration,Styling|all|",
    "davines-oi-souffle": "treat|Styling,Hydration|all|",
    "davines-this-is-an-invisible-dry-shampoo": "style|Volume,Scalp|no|",
    "davines-this-is-a-curl-building-serum": "style|Curl|all|",
    "davines-this-is-a-curl-moisturizing-mousse": "style|Curl,Hydration|all|",
    "davines-this-is-a-dry-texturizer": "style|Styling,Volume|all|X",
    "davines-this-is-a-medium-hairspray": "style|Styling|all|X",
    "davines-this-is-a-sea-salt-spray": "style|Styling,Volume|all|X",
    # ---- Moroccanoil
    "blonde-perfecting-purple-shampoo": "cleanse|Color|all|X",
    "clarifying-shampoo": "cleanse|Scalp,Volume|no|",
    "color-care-shampoo": "cleanse|Color|all|",
    "extra-volume-shampoo": "cleanse|Volume|all|",
    "frizz-control-shampoo": "cleanse|Styling|all|",
    "hydrating-shampoo": "cleanse|Hydration,Curl|all|",
    "moisture-repair-shampoo": "cleanse|Repair|all|",
    "purifying-pre-wash-scalp-scrub": "treat|Scalp|nof|",
    "scalp-balancing-shampoo": "cleanse|Scalp|all|",
    "blonde-perfecting-purple-conditioner": "condition|Color|all|X",
    "color-care-conditioner": "condition|Color|all|",
    "curl-enhancing-conditioner": "condition|Curl|all|",
    "extra-volume-conditioner": "condition|Volume|all|",
    "frizz-control-conditioner": "condition|Styling|all|",
    "hydrating-conditioner": "condition|Hydration,Curl|all|",
    "moisture-repair-conditioner": "condition|Repair|all|",
    "scalp-balancing-conditioner": "condition|Scalp|all|",
    "bordeaux-color-depositing-mask": "treat|Color|all|X",
    "cocoa-color-depositing-mask": "treat|Color|all|X",
    "copper-color-depositing-mask": "treat|Color|all|X",
    "coral-color-depositing-mask": "treat|Color|all|X",
    "platinum-color-depositing-mask": "treat|Color|all|X",
    "rose-gold-color-depositing-mask": "treat|Color|all|X",
    "high-shine-gloss-mask": "treat|Color,Styling|all|X",
    "intense-hydrating-mask": "treat|Hydration,Curl|all|",
    "overnight-leave-in-mask": "treat|Hydration|all|",
    "restorative-hair-mask": "treat|Repair|all|",
    "weightless-hydrating-mask": "treat|Hydration,Volume|all|",
    "moroccanoil-treatment-light": "treat|Repair,Hydration,Styling|all|",
    "moroccanoil-treatment-mist": "treat|Hydration,Styling,Volume|all|",
    "moroccanoil-treatment-original": "treat|Repair,Hydration,Styling|all|",
    "curl-control-mousse": "style|Curl|all|",
    "curl-defining-cream": "style|Curl|all|",
    "dry-shampoo-dark-tones": "style|Styling,Volume|no|X",
    "dry-shampoo-light-tones": "style|Styling,Volume|no|X",
    "dry-texture-spray": "style|Styling,Volume|all|",
    "frizz-shield-spray": "style|Styling|all|",
    "hydrating-styling-cream": "style|Hydration,Styling|all|",
    "intense-curl-cream": "style|Curl|all|",
    "intense-smoothing-serum": "style|Styling|all|",
    "leave-in-conditioner": "style|Hydration,Repair|all|",
    "luminous-hairspray-strong": "style|Styling|all|X",
    "mending-infusion": "style|Repair|all|",
    "molding-cream": "style|Styling|all|X",
    "perfect-defense-heat-protectant": "style|Styling,Repair|all|",
    "root-boost": "style|Volume|all|",
    "sculpting-pomade": "style|Styling|all|X",
    "smoothing-lotion": "style|Styling|all|",
    "texture-clay": "style|Styling,Volume|all|X",
    "texture-volume-hair-powder": "style|Volume|all|",
    "thickening-lotion": "style|Volume|all|",
    "volumizing-mist": "style|Volume|all|",
    "volumizing-mousse": "style|Volume|all|",
    # ---- Rahua
    "rahua-aloe-vera-shampoo": "cleanse|Scalp,Hydration|ndf|",
    "rahua-classic-shampoo": "cleanse|Repair,Hydration|all|",
    "rahua-color-fulltm-shampoo": "cleanse|Color|all|",
    "rahua-enchanted-islandtm-shampoo": "cleanse|Hydration,Styling|all|",
    "rahua-hydration-shampoo": "cleanse|Hydration|all|",
    "rahua-rebalance-shampoo": "cleanse|Scalp|nof|",
    "rahua-scalp-exfoliating-shampoo": "cleanse|Scalp|nof|",
    "rahua-voluminous-shampoo": "cleanse|Volume|all|",
    "rahua-aloe-vera-conditioner": "condition|Scalp,Hydration|ndf|",
    "rahua-classic-conditioner": "condition|Hydration,Repair|all|",
    "rahua-color-fulltm-conditioner": "condition|Color|all|",
    "rahua-enchanted-islandtm-conditioner": "condition|Hydration,Styling|all|",
    "rahua-hydration-conditioner": "condition|Hydration|all|",
    "rahua-rebalance-conditioner": "condition|Scalp|nof|",
    "rahua-voluminous-conditioner": "condition|Volume|all|",
    "rahua-color-fulltm-hair-mask": "treat|Color,Hydration|all|",
    "rahua-hydration-hair-mask": "treat|Hydration|all|",
    "rahua-omega-9-hair-mask": "treat|Repair|all|",
    "rahua-color-fulltm-glossing-oil-mist": "treat|Color,Styling|all|",
    "rahua-elixir": "treat|Repair,Hydration|all|",
    "rahua-founders-blend-scalp-hair-treatment": "treat|Scalp,Repair|all|",
    "rahua-leave-in-treatment": "treat|Repair,Styling|all|",
    "rahua-legendary-amazon-oiltm": "treat|Hydration,Styling|all|",
    "rahua-scalp-skin-toner": "treat|Scalp|all|",
    "rahua-voluminous-dry-shampoo": "style|Volume,Scalp|no|",
    "rahua-aloe-vera-hair-gel": "style|Curl,Styling|all|X",
    "rahua-aloe-vera-hair-mousse": "style|Volume,Styling|all|",
    "rahua-control-cream-curl-styler": "style|Curl|all|",
    "rahua-cream-wax": "style|Styling|all|X",
    "rahua-enchanted-islandtm-vegan-curl-butter": "style|Curl,Hydration|all|",
    "rahua-freestyle-texturizer": "style|Styling|all|X",
    "rahua-hydration-detangler-uv-barrier": "style|Hydration,Styling|all|",
    "rahua-smoothing-hair-balm": "style|Styling,Hydration|all|",
}
SCALP_CODES = {"n": "normal", "o": "oily", "d": "dry_sensitive", "f": "flaky"}
# a thinning scalp is cared for with the products that suit a normal one
THINNING_FROM = "normal"

# ------------------------------------------------------------------------------------------ formula preference
# formula_preference only reorders products that already suit the shopper; it never removes one.
# NEEDS HUMAN REVIEW: derived from brand positioning and the product copy, not from a supplier attribute.
ECO = {
    "aromatica-rosemary-scalp-scaling-shampoo-bar",
    "aromatica-quinoa-protein-shampoo",
    "aromatica-quinoa-protein-treatment-mask",
    "aromatica-rosemary-pdrn-scalp-serum",
    "davines-oi-shampoo",
    "davines-love-smoothing-shampoo",
    "davines-nounou-shampoo",
    "davines-love-curl-shampoo",
    "davines-momo-shampoo",
    "davines-beautiful-things-restoring-leave-in-mask",
    "overnight-leave-in-mask",
    "rahua-color-fulltm-shampoo",
    "rahua-color-fulltm-conditioner",
    "rahua-scalp-exfoliating-shampoo",
    "rahua-enchanted-islandtm-vegan-curl-butter",
}


def formula_tags(key: str) -> list[str]:
    tags = []
    if key.startswith(("aromatica-", "rahua-")):
        tags.append("botanical")
    if key in ECO:
        tags.append("eco")
    if key.startswith(("davines-heart-of-glass", "davines-oi-")) or not key.startswith(("aromatica-", "rahua-", "davines-")):
        tags.append("salon")
    return tags


# ------------------------------------------------------------------------------------------ conditions
Cond = dict


def _q(question: str, op: str, *values: str) -> Cond:
    return {"q": question, "op": op, "value": values[0] if op == "eq" else list(values)}


def tex(*v: str) -> Cond: return _q("hair_texture", "in", *v)
def thick(*v: str) -> Cond: return _q("hair_thickness", "in", *v)
def chem(*v: str) -> Cond: return _q("chemical_history", "contains_any", *v)
def wash(*v: str) -> Cond: return _q("wash_frequency", "in", *v)
def dmg(*v: str) -> Cond: return _q("hair_damage", "in", *v)
def goal(*v: str) -> Cond: return _q("primary_goal", "in", *v)
def scalp(*v: str) -> Cond: return _q("scalp_condition", "in", *v)


def AND(*c: Cond) -> Cond: return {"all": list(c)}
def OR(*c: Cond) -> Cond: return {"any": list(c)}
def NOT(c: Cond) -> Cond: return {"not": c}


FINE = thick("fine")
THICK = thick("thick")
CURLY = tex("curly")
WAVY = tex("wavy")
TEXTURED = tex("wavy", "curly")
STRAIGHT = tex("straight")
BLEACHED = chem("bleached")
PROCESSED = chem("dyed", "bleached", "permed")
DAMAGED = dmg("dry_frizzy", "damaged")

# ------------------------------------------------------------------------------------------ routes
# ROUTES[label][step] = [(product key, condition or None), ...] in priority order.
# A scalp tag that does not fit the shopper removes a candidate automatically; no condition = always eligible.
ROUTES: dict[str, dict[str, list[tuple[str, Cond | None]]]] = {
    "Repair": {
        "cleanse": [
            ("davines-heart-of-glass-silkening-chelating-shampoo", AND(BLEACHED, dmg("damaged"))),
            ("rahua-classic-shampoo", THICK),
            ("aromatica-quinoa-protein-shampoo", AND(dmg("damaged"), TEXTURED)),
            ("davines-nounou-shampoo", AND(PROCESSED, dmg("damaged", "dry_frizzy"))),
            ("davines-melu-shampoo", AND(dmg("damaged"), thick("fine", "medium"))),
            ("davines-oi-shampoo", wash("daily")),
            ("moisture-repair-shampoo", None),
        ],
        "condition": [
            ("davines-heart-of-glass-rich-conditioner", AND(BLEACHED, dmg("damaged"))),
            ("rahua-classic-conditioner", THICK),
            ("davines-replumping-conditioner", AND(dmg("damaged"), TEXTURED)),
            ("davines-nounou-conditioner", AND(PROCESSED, dmg("damaged", "dry_frizzy"))),
            ("davines-melu-conditioner", AND(dmg("damaged"), thick("fine", "medium"))),
            ("davines-oi-conditioner", wash("daily")),
            ("moisture-repair-conditioner", None),
        ],
        "treat": [
            ("davines-heart-of-glass-instant-bonding-glow", AND(BLEACHED, dmg("damaged"))),
            ("davines-beautiful-things-restoring-leave-in-mask", chem("dyed", "bleached")),
            ("aromatica-quinoa-protein-treatment-mask", chem("permed")),
            ("rahua-omega-9-hair-mask", THICK),
            ("rahua-elixir", CURLY),
            ("moroccanoil-treatment-light", FINE),
            ("aromatica-quinoa-protein-hair-ampoule", dmg("damaged")),
            ("restorative-hair-mask", None),
            ("davines-nounou-mask", None),
            ("moroccanoil-treatment-original", None),
            ("rahua-leave-in-treatment", None),
        ],
        "style_protect": [
            ("perfect-defense-heat-protectant", AND(dmg("damaged"), PROCESSED)),
            ("mending-infusion", dmg("damaged")),
            ("aromatica-replenishing-hair-mist-jasmine-vetiver", dmg("dry_frizzy")),
            ("leave-in-conditioner", None),
        ],
    },
    "Scalp": {
        "cleanse": [
            ("davines-energizing-shampoo", scalp("thinning")),
            ("davines-purifying-shampoo", scalp("flaky")),
            ("davines-nourishing-shampoo", AND(scalp("dry_sensitive"), dmg("dry_frizzy", "damaged"))),
            ("rahua-aloe-vera-shampoo", scalp("dry_sensitive")),
            ("aromatica-rosemary-salt-scrub-shampoo", AND(scalp("oily"), wash("daily"))),
            ("davines-solu-shampoo", AND(scalp("oily"), wash("weekly"))),
            ("rahua-scalp-exfoliating-shampoo", AND(scalp("oily"), THICK)),
            ("rahua-rebalance-shampoo", AND(scalp("oily"), FINE)),
            ("aromatica-tea-tree-purifying-shampoo", scalp("oily")),
            ("davines-energizing-shampoo", AND(scalp("normal"), FINE)),
            ("scalp-balancing-shampoo", dmg("healthy")),
            ("aromatica-rosemary-scalp-scaling-shampoo-bar", wash("weekly")),
            ("aromatica-rosemary-scalp-scaling-shampoo", None),
            ("rahua-scalp-exfoliating-shampoo", None),
        ],
        "condition": [
            ("aromatica-rosemary-hair-thickening-conditioner", scalp("thinning")),
            ("rahua-aloe-vera-conditioner", scalp("dry_sensitive")),
            ("rahua-rebalance-conditioner", scalp("oily", "flaky")),
            ("aromatica-rosemary-hair-thickening-conditioner", FINE),
            ("scalp-balancing-conditioner", None),
        ],
        "treat": [
            ("aromatica-rosemary-pdrn-scalp-serum", scalp("thinning")),
            ("rahua-founders-blend-scalp-hair-treatment", scalp("dry_sensitive")),
            ("aromatica-tea-tree-purifying-tonic", scalp("flaky")),
            ("purifying-pre-wash-scalp-scrub", AND(scalp("oily"), wash("weekly", "every_2_3_days"))),
            ("aromatica-rosemary-scalp-scrub", scalp("oily")),
            ("davines-solu-sea-salt-scrub", AND(scalp("normal"), wash("weekly"))),
            ("aromatica-rosemary-geranium-scalp-scrub", AND(scalp("normal"), wash("every_2_3_days"))),
            ("davines-energizing-overnight-serum", FINE),
            ("aromatica-rosemary-root-enhancer", AND(scalp("normal"), dmg("healthy"))),
            ("aromatica-rosemary-pdrn-scalp-serum", None),
            ("rahua-scalp-skin-toner", None),
        ],
        "style_protect": [
            ("perfect-defense-heat-protectant", DAMAGED),
            ("aromatica-rosemary-dry-shampoo-powder", scalp("oily")),
            ("davines-this-is-an-invisible-dry-shampoo", AND(scalp("normal", "thinning"), wash("daily"))),
            ("rahua-hydration-detangler-uv-barrier", None),
        ],
    },
    "Color": {
        "cleanse": [
            ("davines-heart-of-glass-silkening-chelating-shampoo", AND(BLEACHED, dmg("damaged"))),
            ("blonde-perfecting-purple-shampoo", BLEACHED),
            ("rahua-color-fulltm-shampoo", OR(THICK, CURLY)),
            ("color-care-shampoo", wash("daily")),
            ("davines-minu-shampoo", None),
        ],
        "condition": [
            ("davines-heart-of-glass-rich-conditioner", AND(BLEACHED, dmg("damaged"))),
            ("blonde-perfecting-purple-conditioner", BLEACHED),
            ("rahua-color-fulltm-conditioner", OR(THICK, CURLY)),
            ("color-care-conditioner", wash("daily")),
            ("davines-minu-conditioner", None),
        ],
        "treat": [
            ("davines-beautiful-things-restoring-leave-in-mask", AND(BLEACHED, dmg("damaged", "dry_frizzy"))),
            ("davines-heart-of-glass-instant-bonding-glow", BLEACHED),
            ("rahua-color-fulltm-hair-mask", OR(THICK, CURLY)),
            ("high-shine-gloss-mask", dmg("healthy")),
            ("rahua-color-fulltm-glossing-oil-mist", FINE),
            ("davines-beautiful-things-restoring-leave-in-mask", None),
        ],
        "style_protect": [
            ("perfect-defense-heat-protectant", DAMAGED),
            ("rahua-hydration-detangler-uv-barrier", None),
        ],
    },
    "Curl": {
        "cleanse": [
            ("davines-love-curl-co-wash", AND(CURLY, dmg("dry_frizzy"))),
            ("rahua-hydration-shampoo", AND(CURLY, THICK)),
            ("hydrating-shampoo", WAVY),
            ("davines-love-curl-shampoo", None),
        ],
        "condition": [
            ("rahua-hydration-conditioner", AND(CURLY, THICK)),
            ("curl-enhancing-conditioner", WAVY),
            ("davines-love-curl-conditioner", None),
            ("hydrating-conditioner", None),
        ],
        "treat": [
            ("weightless-hydrating-mask", FINE),
            ("rahua-hydration-hair-mask", AND(CURLY, dmg("dry_frizzy"))),
            ("davines-oi-hair-butter", dmg("dry_frizzy")),
            ("intense-hydrating-mask", None),
            ("rahua-elixir", None),
        ],
        "style_protect": [
            ("davines-this-is-a-curl-moisturizing-mousse", FINE),
            ("rahua-enchanted-islandtm-vegan-curl-butter", AND(CURLY, THICK)),
            ("intense-curl-cream", dmg("dry_frizzy")),
            ("curl-control-mousse", CURLY),
            ("davines-this-is-a-curl-building-serum", WAVY),
            ("curl-defining-cream", None),
            ("rahua-control-cream-curl-styler", None),
        ],
    },
    "Hydration": {
        "cleanse": [
            ("rahua-hydration-shampoo", OR(THICK, CURLY)),
            ("davines-dede-shampoo", wash("daily")),
            ("davines-momo-shampoo", dmg("dry_frizzy")),
            ("hydrating-shampoo", None),
            ("davines-oi-shampoo", None),
        ],
        "condition": [
            ("rahua-hydration-conditioner", OR(THICK, CURLY)),
            ("davines-dede-leave-in-conditioner", AND(DAMAGED, wash("daily"))),
            ("davines-dede-conditioner", wash("daily")),
            ("davines-momo-conditioner", dmg("dry_frizzy")),
            ("davines-oi-conditioner", FINE),
            ("hydrating-conditioner", None),
            ("davines-oi-all-in-one-milk", None),
        ],
        "treat": [
            ("weightless-hydrating-mask", FINE),
            ("davines-replenishing-butter", AND(dmg("dry_frizzy"), THICK)),
            ("rahua-hydration-hair-mask", OR(THICK, CURLY)),
            ("davines-oi-hair-butter", dmg("dry_frizzy")),
            ("overnight-leave-in-mask", wash("weekly")),
            ("aromatica-rosemary-3-in-1-treatment", AND(STRAIGHT, dmg("healthy"))),
            ("intense-hydrating-mask", None),
        ],
        "style_protect": [
            ("perfect-defense-heat-protectant", DAMAGED),
            ("leave-in-conditioner", dmg("dry_frizzy")),
            ("hydrating-styling-cream", STRAIGHT),
            ("rahua-hydration-detangler-uv-barrier", None),
        ],
    },
    "Volume": {
        "cleanse": [
            ("davines-volu-shampoo", AND(FINE, wash("every_2_3_days", "weekly"))),
            ("rahua-voluminous-shampoo", FINE),
            ("clarifying-shampoo", scalp("oily")),
            ("extra-volume-shampoo", None),
        ],
        "condition": [
            ("davines-volu-conditioner", AND(FINE, wash("every_2_3_days", "weekly"))),
            ("rahua-voluminous-conditioner", FINE),
            ("aromatica-rosemary-hair-thickening-conditioner", scalp("oily")),
            ("extra-volume-conditioner", None),
        ],
        "treat": [
            ("aromatica-rosemary-root-volumizing-scalp-ampoule", AND(FINE, scalp("oily"))),
            ("aromatica-rosemary-root-enhancer", AND(FINE, scalp("normal"))),
            ("davines-energizing-overnight-serum", AND(FINE, scalp("dry_sensitive", "flaky"))),
            ("moroccanoil-treatment-mist", None),
            ("weightless-hydrating-mask", None),
        ],
        "style_protect": [
            ("rahua-voluminous-dry-shampoo", AND(scalp("oily"), wash("weekly", "every_2_3_days"))),
            ("root-boost", AND(FINE, STRAIGHT)),
            ("volumizing-mist", FINE),
            ("rahua-aloe-vera-hair-mousse", TEXTURED),
            ("volumizing-mousse", thick("medium")),
            ("thickening-lotion", THICK),
            ("root-boost", None),
            ("texture-volume-hair-powder", None),
        ],
    },
    "Styling": {
        "cleanse": [
            ("davines-love-smoothing-shampoo", OR(THICK, TEXTURED)),
            ("davines-oi-shampoo", dmg("damaged")),
            ("rahua-enchanted-islandtm-shampoo", dmg("healthy")),
            ("frizz-control-shampoo", None),
        ],
        "condition": [
            ("davines-love-smoothing-conditioner", OR(THICK, TEXTURED)),
            ("davines-oi-all-in-one-milk", dmg("damaged")),
            ("rahua-enchanted-islandtm-conditioner", dmg("healthy")),
            ("frizz-control-conditioner", None),
        ],
        "treat": [
            ("aromatica-replenishing-leave-in-treatment-lavender-patchouli", dmg("damaged")),
            ("rahua-leave-in-treatment", dmg("dry_frizzy")),
            ("moroccanoil-treatment-light", FINE),
            ("davines-oi-oil", TEXTURED),
            ("rahua-legendary-amazon-oiltm", dmg("dry_frizzy")),
            ("davines-nourishing-oil", chem("permed")),
            ("davines-oi-souffle", thick("medium")),
            ("moroccanoil-treatment-original", None),
            ("aromatica-ritual-hair-oil-jasmine-vetiver", None),
            ("aromatica-ritual-hair-oil-lavender-patchouli", None),
            ("davines-oi-souffle", None),
        ],
        "style_protect": [
            ("dry-shampoo-light-tones", AND(BLEACHED, wash("weekly", "every_2_3_days"))),
            ("dry-shampoo-dark-tones", AND(NOT(BLEACHED), wash("weekly"))),
            ("dry-texture-spray", AND(STRAIGHT, FINE, dmg("healthy"))),
            ("davines-this-is-a-dry-texturizer", AND(STRAIGHT, thick("medium"), dmg("healthy"))),
            ("molding-cream", AND(STRAIGHT, THICK, dmg("healthy"))),
            ("davines-this-is-a-sea-salt-spray", AND(WAVY, FINE, dmg("healthy"))),
            ("texture-clay", AND(WAVY, thick("medium"), dmg("healthy"))),
            ("rahua-freestyle-texturizer", AND(WAVY, THICK, dmg("healthy"))),
            ("luminous-hairspray-strong", AND(CURLY, FINE, dmg("healthy"))),
            ("rahua-cream-wax", AND(CURLY, thick("medium"), dmg("healthy"))),
            ("sculpting-pomade", AND(CURLY, THICK, dmg("healthy"))),
            ("davines-this-is-a-medium-hairspray", AND(FINE, DAMAGED)),
            ("frizz-shield-spray", dmg("damaged")),
            ("intense-smoothing-serum", TEXTURED),
            ("smoothing-lotion", FINE),
            ("rahua-smoothing-hair-balm", THICK),
            ("perfect-defense-heat-protectant", dmg("dry_frizzy")),
            ("hydrating-styling-cream", STRAIGHT),
            ("frizz-shield-spray", None),
        ],
    },
}

# One optional add-on, chosen from the secondary label (never a product already in the routine).
ADDONS: dict[str, list[tuple[str, Cond | None]]] = {
    "Repair": [
        ("rahua-elixir", OR(THICK, CURLY)),
        ("aromatica-quinoa-protein-hair-ampoule", dmg("damaged")),
        ("davines-nounou-mask", PROCESSED),
        ("mending-infusion", dmg("damaged")),
        ("rahua-leave-in-treatment", dmg("dry_frizzy")),
        ("rahua-omega-9-hair-mask", None),
        ("moroccanoil-treatment-original", None),
    ],
    "Scalp": [
        ("aromatica-tea-tree-purifying-tonic", scalp("oily")),
        ("rahua-scalp-skin-toner", scalp("dry_sensitive")),
        ("purifying-pre-wash-scalp-scrub", scalp("flaky")),
        ("aromatica-rosemary-root-enhancer", None),
        ("davines-energizing-overnight-serum", None),
        ("aromatica-rosemary-pdrn-scalp-serum", None),
    ],
    "Color": [
        ("platinum-color-depositing-mask", BLEACHED),
        ("davines-heart-of-glass-instant-bonding-glow", BLEACHED),
        ("rahua-color-fulltm-glossing-oil-mist", None),
        ("high-shine-gloss-mask", None),
    ],
    "Curl": [
        ("davines-this-is-a-curl-building-serum", WAVY),
        ("rahua-enchanted-islandtm-vegan-curl-butter", THICK),
        ("rahua-control-cream-curl-styler", thick("medium")),
        ("curl-defining-cream", None),
        ("rahua-aloe-vera-hair-gel", None),
    ],
    "Hydration": [
        ("rahua-legendary-amazon-oiltm", CURLY),
        ("davines-nourishing-oil", dmg("dry_frizzy")),
        ("moroccanoil-treatment-mist", FINE),
        ("aromatica-ritual-hair-oil-jasmine-vetiver", STRAIGHT),
        ("davines-oi-oil", None),
        ("aromatica-ritual-hair-oil-lavender-patchouli", None),
        ("overnight-leave-in-mask", None),
    ],
    "Volume": [
        ("texture-volume-hair-powder", FINE),
        ("rahua-voluminous-dry-shampoo", AND(scalp("oily"), wash("weekly", "every_2_3_days"))),
        ("aromatica-rosemary-dry-shampoo-powder", scalp("oily")),
        ("davines-this-is-an-invisible-dry-shampoo", scalp("normal")),
        ("thickening-lotion", None),
    ],
}


def candidate(key: str, when: Cond | None) -> dict:
    return {"product": key, **({"when": when} if when else {})}


def main() -> None:
    products = {p["key"]: p for p in json.load(open(STOREFRONT, encoding="utf-8"))}
    missing = sorted(set(products) - set(TAGS))
    extra = sorted(set(TAGS) - set(products))
    if missing or extra:
        raise SystemExit(f"tags missing for {missing}; tags without a storefront product {extra}")

    catalog = []
    steps = {"cleanse", "condition", "treat", "style"}
    for key, p in products.items():
        step, needs, scalps, flags = TAGS[key].split("|")
        assert step in steps, key
        quiz_step = "style_protect" if step == "style" else step
        scalp_types = ["all"] if scalps == "all" else [SCALP_CODES[c] for c in scalps]
        if THINNING_FROM in scalp_types:
            scalp_types.append("thinning")
        catalog.append(
            {
                "product_id": p["product_id"],
                "key": key,
                "active": True,
                "name": p["product_name"],
                "brand": p["brand"],
                "category": p["category"],
                "url": p["product_url"],
                "image_url": p["images"][0] if p["images"] else None,
                "price_usd": p["price_from"],
                "quiz": {"scalp": scalp_types, "needs": needs.split(","), "step": quiz_step, "formula": formula_tags(key)},
                "allow_auto_substitute": "X" not in flags,
                "inventory_available": 1,
                "inventory_note": "Catalog source provides availability boolean, not numeric Available quantity; replace inventory_available with live Product_Variant.available.",
            }
        )
    catalog.sort(key=lambda c: (["cleanse", "condition", "treat", "style_protect"].index(c["quiz"]["step"]), c["brand"], c["key"]))

    by_key = {c["key"]: c for c in catalog}
    routine_steps = ["cleanse", "condition", "treat", "style_protect"]
    by_label: dict[str, dict[str, list[dict]]] = {}
    for label, steps_map in ROUTES.items():
        by_label[label] = {}
        for step in routine_steps:
            cands = steps_map[step]
            for key, _ in cands:
                if by_key[key]["quiz"]["step"] != step:
                    raise SystemExit(f"{label}.{step}: {key} is tagged {by_key[key]['quiz']['step']}")
            by_label[label][step] = [candidate(k, w) for k, w in cands]
    addons = {label: [candidate(k, w) for k, w in cands] for label, cands in ADDONS.items()}

    ruleset = json.load(open(RULESET, encoding="utf-8"))
    ruleset["ruleset_version"] = RULESET_VERSION
    # v2: the shopper's own goal decides the main label when its rule fired; the other labels follow by priority.
    ruleset["labels"]["goal_to_label"] = GOAL_TO_LABEL
    ruleset["messages"]["fallback_vi"] = "Câu trả lời của bạn không khớp luật đặc trị nào, FOLMARÉ gợi ý routine cấp ẩm hằng ngày an toàn cho mọi loại tóc."
    ruleset["routine"]["by_label"] = by_label
    ruleset["routine"]["addons_by_label"] = addons
    json.dump(ruleset, open(RULESET, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump(catalog, open(CATALOG, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    listed = defaultdict(int)
    for label in by_label.values():
        for cands in label.values():
            for c in cands:
                listed[c["product"]] += 1
    for cands in addons.values():
        for c in cands:
            listed[c["product"]] += 1
    unused = sorted(set(by_key) - set(listed))
    print(f"{len(catalog)} products, ruleset {RULESET_VERSION}; not listed in any route or add-on: {len(unused)}")
    for key in unused:
        print("  ", key)


if __name__ == "__main__":
    main()

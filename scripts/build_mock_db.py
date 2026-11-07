"""Build the frontend mock database from the project's real datasets.

Inputs (read-only):
  data/store/product_data/catalog/products.json, .../product_images.csv     - 242 crawled products, 4 brands
  data/store/brand_media/brand_media_manifest.csv                           - product videos & texture visuals
  data/store/product_data/variant_images.json                               - packshot per size (crawl_variant_images.py)
  docs/HairRoutineEngine/product_quiz_catalog.json                          - quiz tags of the 150 products (scripts/build_quiz_catalog.py)
  data/ml/B_Plan/mapped_59_skus/fixed_origin_predictions.csv                - per-category model backtests
  data/ml/A_Plan/results/demo_inventory_recommendations_weekly.csv          - 14-day SKU demand forecast

Outputs:
  public/assets/data/haircare-db.json  - seed loaded by the Angular MockDbService
  public/assets/products/*.jpg         - resized product images (max 800px)
  public/assets/media/hover/*          - hover preview per product: muted 6s clip or texture close-up
  db.json                              - same seed, kept for `npm run mock` (json-server)
  data/store/product_data/storefront/  - the products on the storefront as a dataset (JSON, CSV, XLSX)

The storefront carries a curated 150-product edit balanced across the four brands and six
categories, preferring products with a studio texture clip, then a texture/before-after still, then
more sharp gallery images and more sizes. Clips are re-encoded with ffmpeg (on PATH, or
`pip install imageio-ffmpeg`); without it the product falls back to its texture still.

Customers, orders, reviews and quiz events are simulated deterministically (fixed random seed)
so every run produces the same database. The simulation is shaped like a real shop: demand follows the
reviews each product has on its brand site (so a clear set of best sellers emerges), 14 products launched in
the last weeks and sell nothing before their launch date, and only delivered orders are reviewed, so popular
products collect dozens of reviews while niche and new ones have few or none. Run from the repository root:

    python scripts/build_mock_db.py
"""

from __future__ import annotations

import csv
import json
import random
import re
import shutil
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image

from product_text import clean_text
from review_text import compose

ROOT = Path(__file__).resolve().parents[1]
OUT_SEED = ROOT / "public" / "assets" / "data" / "haircare-db.json"
OUT_IMAGES = ROOT / "public" / "assets" / "products"
OUT_HOVER = ROOT / "public" / "assets" / "media" / "hover"
OUT_JSON_SERVER = ROOT / "db.json"
OUT_CATALOG = ROOT / "data" / "store" / "product_data" / "storefront"

NOW = datetime(2026, 11, 1, 9, 0, tzinfo=timezone.utc)
rng = random.Random(20261031)

# Brand -> SKU prefix. The edit is ~150 products spread over the four houses; AROMATICA only makes 22
# hair products, so the other quotas stay close to each other. Category quotas follow the shape of the range.
BRAND_CODES = {"Moroccanoil": "MO", "AROMATICA": "AR", "Rahua": "RA", "Davines": "DV"}
BRAND_QUOTA = {"Moroccanoil": 53, "Davines": 44, "Rahua": 33, "AROMATICA": 20}
CATEGORY_QUOTA = {"Shampoo": 28, "Conditioner": 24, "Hair Masks": 24, "Treatment / Oil": 28, "Dry Shampoo": 6, "Styling & Finishing": 40}
# Gallery: up to 6 images (the admin form's limit), dropping crawled images too small to look sharp.
GALLERY_MAX = 6
GALLERY_MIN_SIDE = 500
MIN_GALLERY_IMAGES = 3
GALLERY_PIXELS = 1000

# Hover clips must be studio texture demos (a pour into the hand, a swatch, a spray against a backdrop).
# Every product video was reviewed frame by frame: the embedded "_pdp_" videos are creator reviews (Rahua)
# or model tutorials (Davines), and gallery clips longer than a few seconds show the product used on hair.
HOVER_VIDEO_MAX_SECONDS = 8
HOVER_VIDEO_EXTRA = {"elixir_01.mp4"}  # Rahua Elixir: 13 s studio pour, no people
# Creator / model videos whose only usable shot is the product poured or pumped into the hand:
# (video, start s, end s), checked frame by frame so no cut, face, subtitle or hair shot slips in.
# Cuts under 2 s are slowed to half speed (frames interpolated) so they loop calmly on the card.
# The 4:5 card crops the creator watermark at the bottom of the portrait Rahua videos.
HOVER_VIDEO_CUTS = {
    "7467472420951": ("data/store/brand_media/rahua/videos/shampoo/aloe_vera_shampoo_pdp_07.mp4", 0.0, 1.25),
    "7467496702039": ("data/store/brand_media/rahua/videos/shampoo/aloe_vera_shampoo_pdp_07.mp4", 3.75, 4.8),
    "1973877833801": ("data/store/brand_media/rahua/videos/shampoo/classic_shampoo_pdp_02.mp4", 9.3, 11.1),
    "1973877932105": ("data/store/brand_media/rahua/videos/shampoo/classic_shampoo_pdp_01.mp4", 8.0, 9.45),
    "6767979036759": ("data/store/brand_media/rahua/videos/shampoo/enchanted_island_shampoo_pdp_05.mp4", 7.5, 9.15),
    "6768351608919": ("data/store/brand_media/rahua/videos/shampoo/enchanted_island_shampoo_pdp_06.mp4", 19.0, 20.15),
    "1973881634889": ("data/store/brand_media/rahua/videos/shampoo/hydration_shampoo_pdp_04.mp4", 8.45, 9.15),
    "7757080461399": ("data/store/brand_media/rahua/videos/shampoo/rebalance_shampoo_pdp_02.mp4", 5.75, 7.65),
    "7757090979927": ("data/store/brand_media/rahua/videos/shampoo/rebalance_shampoo_pdp_02.mp4", 8.0, 9.7),
    "1973878194249": ("data/store/brand_media/rahua/videos/shampoo/voluminous_shampoo_pdp_07.mp4", 4.55, 5.2),
    "1973878227017": ("data/store/brand_media/rahua/videos/shampoo/voluminous_shampoo_pdp_07.mp4", 10.1, 10.6),
    "4006481264726": ("data/store/brand_media/davines/videos/styling/this_is_a_curl_building_serum_01.mp4", 0.0, 3.4),
    "4006479855702": ("data/store/brand_media/davines/videos/treatment_oil/oi_oil_pdp_01.mp4", 0.0, 3.5),
}
HOVER_CLIP_SECONDS = 6
# Without a clip the card shows a texture or before/after still: the manifest role when it is right,
# otherwise the image picked by eye below (AROMATICA tags none of its texture shots, for example).
HOVER_STILL_ROLES = {"texture": "texture", "swatch": "texture", "before_after": "before_after"}
HOVER_STILL_LABELS = {"texture": "Texture", "before_after": "Before & after"}
HOVER_STILL_OVERRIDES = {
    "8350411817168": ("data/store/product_data/aromatica/images/shampoo/quinoa_protein_shampoo_03.jpg", "texture"),
    "8496395452624": ("data/store/product_data/aromatica/images/shampoo/rosemary_and_geranium_scalp_scrub_04.jpg", "texture"),
    "8350019551440": ("data/store/product_data/aromatica/images/shampoo/rosemary_salt_scrub_shampoo_03.jpg", "texture"),
    "8350020239568": ("data/store/product_data/aromatica/images/shampoo/rosemary_scalp_scaling_shampoo_04.jpg", "texture"),
    "8432230236368": ("data/store/product_data/aromatica/images/shampoo/rosemary_scalp_scaling_shampoo_bar_02.jpg", "texture"),
    "8350019977424": ("data/store/product_data/aromatica/images/shampoo/rosemary_scalp_scrub_04.jpg", "texture"),
    "8350019715280": ("data/store/product_data/aromatica/images/conditioner/rosemary_hair_thickening_conditioner_02.jpg", "texture"),
    "8350411948240": ("data/store/product_data/aromatica/images/masks/quinoa_protein_treatment_mask_03.jpg", "texture"),
    "8350405722320": ("data/store/product_data/aromatica/images/masks/rosemary_3_in_1_treatment_02.jpg", "texture"),
    "8350412046544": ("data/store/product_data/aromatica/images/treatment_oil/quinoa_protein_hair_ampoule_03.jpg", "texture"),
    "8350412210384": ("data/store/product_data/aromatica/images/treatment_oil/replenishing_leave_in_treatment_lavender_and_patchouli_04.jpg", "texture"),
    "8456968175824": ("data/store/product_data/aromatica/images/treatment_oil/rosemary_pdrn_scalp_serum_03.jpg", "texture"),
    "8350019387600": ("data/store/product_data/aromatica/images/treatment_oil/rosemary_root_volumizing_scalp_ampoule_05.jpg", "texture"),
    "8350406115536": ("data/store/product_data/aromatica/images/dry_shampoo/rosemary_dry_shampoo_powder_02.jpg", "texture"),
    "8350412308688": ("data/store/product_data/aromatica/images/styling/replenishing_hair_mist_jasmine_and_vetiver_03.jpg", "texture"),
    "8957916152025": ("data/store/product_data/moroccanoil/images/shampoo/scalp_balancing_shampoo_02.jpg", "texture"),
    "8957917987033": ("data/store/product_data/moroccanoil/images/conditioner/scalp_balancing_conditioner_02.jpg", "texture"),
    "8957889020121": ("data/store/product_data/moroccanoil/images/shampoo/purifying_pre-wash_scalp_scrub_02.jpg", "texture"),
    "8513170997465": ("data/store/product_data/moroccanoil/images/shampoo/frizz_control_shampoo_02.jpg", "before_after"),
    "9820045770969": ("data/store/product_data/moroccanoil/images/masks/overnight_leave-in_mask_03.jpg", "before_after"),
    "8229545836761": ("data/store/product_data/moroccanoil/images/styling/frizz_shield_spray_04.jpg", "before_after"),
    "8161093222617": ("data/store/product_data/moroccanoil/images/styling/molding_cream_02.jpg", "texture"),
    "9719292690649": ("data/store/product_data/moroccanoil/images/styling/sculpting_pomade_02.jpg", "texture"),
    "8161094959321": ("data/store/product_data/moroccanoil/images/styling/texture_clay_02.jpg", "texture"),
    "8659742458035": ("data/store/brand_media/davines/product_visuals/ingredient/energizing_overnight_serum_pdp_02.webp", "texture"),
    "8491860000947": ("data/store/product_data/davines/images/conditioner/volu_conditioner_02.jpg", "before_after"),
    "7757080461399": ("data/store/product_data/rahua/images/shampoo/rebalance_shampoo_05.jpg", "texture"),
    "6549836628055": ("data/store/product_data/rahua/images/shampoo/scalp_exfoliating_shampoo_05.jpg", "texture"),
    "7757090979927": ("data/store/product_data/rahua/images/conditioner/rebalance_conditioner_05.jpg", "texture"),
    "2239459065929": ("data/store/product_data/rahua/images/treatment_oil/founder_s_blend_scalp_and_hair_treatment_04.jpg", "texture"),
    "1973877997641": ("data/store/product_data/rahua/images/treatment_oil/leave_in_treatment_05.jpg", "texture"),
    "7467496702039": ("data/store/product_data/rahua/images/conditioner/aloe_vera_conditioner_05.jpg", "texture"),
    "1973881634889": ("data/store/product_data/rahua/images/shampoo/hydration_shampoo_06.jpg", "texture"),
    "7225469829207": ("data/store/brand_media/rahua/product_visuals/before_after/aloe_vera_hair_mousse_01.jpg", "before_after"),
    "4466761531479": ("data/store/product_data/rahua/images/styling/control_cream_curl_styler_07.jpg", "texture"),
    "7025884856407": ("data/store/product_data/rahua/images/styling/cream_wax_05.jpg", "texture"),
    "6889340403799": ("data/store/product_data/rahua/images/styling/enchanted_island_vegan_curl_butter_05.jpg", "texture"),
    "2154750181449": ("data/store/product_data/rahua/images/styling/hydration_detangler_uv_barrier_08.jpg", "texture"),
    "4006479921238": ("data/store/product_data/davines/images/conditioner/oi_conditioner_03.jpg", "texture"),
    "8173172064473": ("data/store/product_data/moroccanoil/images/masks/high_shine_gloss_mask_02.jpg", "texture"),
    "1973880225865": ("data/store/product_data/rahua/images/shampoo/color_full_shampoo_04.jpg", "texture"),
    "1973880324169": ("data/store/product_data/rahua/images/conditioner/color_full_conditioner_04.jpg", "texture"),
    "1973879406665": ("data/store/product_data/rahua/images/dry_shampoo/voluminous_dry_shampoo_06.jpg", "texture"),
}
# Manifest stills tagged texture/before_after that are really something else (a flat iron on hair).
HOVER_STILL_BLOCKED = {"6852955045975"}
# Products left out of the edit: Rahua Heat Protectant Shield has no texture visual and weak gallery images.
EXCLUDED_PRODUCTS = {"6852955045975", "4006161514582", "7089645781171"}  # + Davines ENERGIZING Superactive, OI Liquid Luster: 3 images, no texture or video

CATEGORY_CODES = {
    "Shampoo": "SH",
    "Conditioner": "CD",
    "Hair Masks": "HM",
    "Treatment / Oil": "TO",
    "Dry Shampoo": "DS",
    "Styling & Finishing": "ST",
}
PLAN_CATEGORY = {
    "shampoo": "Shampoo",
    "conditioner": "Conditioner",
    "hairmask": "Hair Masks",
    "treatment": "Treatment / Oil",
    "dry shampoo": "Dry Shampoo",
    "hairstyling": "Styling & Finishing",
}
MODEL_NAMES = {
    "A_baseline_level_features": "LightGBM · level features",
    "B_tweedie": "LightGBM · Tweedie",
    "C_ratio_to_level": "LightGBM · ratio-to-level",
    "D_ratio_plus_last_year_index": "Ratio + last-year index",
    "E_naive_recent_13w_mean": "Naive 13-week mean",
    "F_average_A_and_C": "Ensemble (level + ratio)",
}
SIZE_ORDER = ["Travel", "Full", "Half-Liter", "Liter"]
SIZE_PRICE_FACTOR = {"Travel": 0.45, "Full": 1.0, "Half-Liter": 1.65, "Liter": 2.6}
# Forecast quantities come from a wholesale dataset; scale them to this store's order volume.
FORECAST_SCALE = 1 / 25


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def money(value: float) -> float:
    return round(value + 1e-9, 2)


# ---------------------------------------------------------------- products


def parse_size(raw: str) -> tuple[str, str]:
    label, _, volume = raw.partition(" - ")
    label = label.strip().replace("Half Liter", "Half-Liter")
    if label not in SIZE_ORDER:
        label = "Full"
    return label, volume.strip()


VOLUME_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(ml|fl\.?\s*oz|oz|gr|g|l)\b", re.I)
UNIT_ML = {"ml": 1.0, "l": 1000.0, "oz": 29.57, "g": 1.0, "gr": 1.0}


def volume_ml(text: str) -> float | None:
    match = VOLUME_RE.search(text or "")
    if not match:
        return None
    unit = re.sub(r"[^a-z]", "", match.group(2).lower()).replace("floz", "oz")
    return float(match.group(1)) * UNIT_ML[unit]


def brand_variants(item: dict) -> list[tuple[str, str, float, bool]]:
    """Maps the crawled sizes of AROMATICA / Rahua / Davines onto the store's size labels.

    The size sold by default is "Full"; smaller sizes become "Travel", bigger ones "Half-Liter" (< 800 ml)
    or "Liter". When several sizes share a label, the one closest to the default size wins. Refills are skipped.
    """
    default = item.get("size") or "Standard"
    rows = [v for v in item.get("variants") or [] if not str(v["size"]).lower().startswith("refill")]
    if not any(v["size"] == default for v in rows):
        rows.append({"size": default, "price": item["price"], "available": item.get("availability", True)})
    base = volume_ml(default)
    best: dict[str, tuple[float, dict]] = {}
    for variant in rows:
        volume = volume_ml(variant["size"])
        if variant["size"] == default or volume is None or not base:
            label, distance = "Full", 0.0 if variant["size"] == default else 1e9
        else:
            label = "Travel" if volume < base else "Half-Liter" if volume < 800 else "Liter"
            distance = abs(volume - base)
        if label not in best or distance < best[label][0]:
            best[label] = (distance, variant)
    return [(label, str(best[label][1]["size"]), float(best[label][1]["price"]), bool(best[label][1].get("available", True))) for label in SIZE_ORDER if label in best]


def split_benefits(text: str) -> list[str]:
    if not text:
        return []
    parts = [p.strip(" •*-\t") for p in re.split(r"\n|•", text)]
    parts = [p for p in parts if len(p) > 3]
    return parts[:6] if len(parts) > 1 else [text.strip()]


def clean_ingredients(text: str) -> str:
    return (text or "").split("\nDisclaimer:")[0].strip()


def slugify(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")


def load_image_paths() -> dict[str, list[tuple[Path, int]]]:
    """Gallery images per product in site order, with their shorter side; images too small to look sharp are dropped."""
    rows = csv.DictReader(open(ROOT / "data/store/product_data/catalog/product_images.csv", encoding="utf-8-sig"))
    by_product: dict[str, list[tuple[int, Path, int]]] = defaultdict(list)
    for row in rows:
        path = ROOT / row["image_local_path"]
        if row["download_status"] != "success" or not path.exists():
            continue
        with Image.open(path) as image:
            side = min(image.size)
        if side >= GALLERY_MIN_SIDE:
            by_product[row["product_id"]].append((int(row["image_index"]), path, side))
    return {pid: [(p, side) for _, p, side in sorted(items)][:GALLERY_MAX] for pid, items in by_product.items()}


def load_media() -> tuple[dict[str, list[Path]], dict[str, tuple[Path, str]]]:
    """Hover media keyed by product_id: the texture clips that qualify, and the best texture or before/after still."""
    videos: dict[str, list[Path]] = defaultdict(list)
    stills: dict[str, tuple[Path, str]] = {}
    for row in csv.DictReader(open(ROOT / "data/store/brand_media/brand_media_manifest.csv", encoding="utf-8-sig")):
        path = ROOT / row["local_path"] if row["local_path"] else None
        pid = row["product_id"]
        if not pid or row["status"] != "success" or not path or not path.exists():
            continue
        if row["asset_type"] == "video":
            short = row["duration_s"] and float(row["duration_s"]) <= HOVER_VIDEO_MAX_SECONDS
            if "_pdp_" not in path.name and (short or path.name in HOVER_VIDEO_EXTRA):
                videos[pid].append(path)
        elif row["asset_type"] == "image" and row["role"] in HOVER_STILL_ROLES and pid not in HOVER_STILL_BLOCKED:
            kind = HOVER_STILL_ROLES[row["role"]]
            # A texture shot beats a before/after; within a kind the first image on the page wins.
            if pid not in stills or (kind == "texture" and stills[pid][1] != "texture"):
                stills[pid] = (path, kind)
    for pid, (path, kind) in HOVER_STILL_OVERRIDES.items():
        stills[pid] = (ROOT / path, kind)
    for pid, (path, *_) in HOVER_VIDEO_CUTS.items():
        videos[pid] = [ROOT / path]
    # Davines also films each formula pouring from its refill pouch (_02); the bottle pour (_01) reads better.
    return {pid: sorted(paths, key=lambda p: p.name) for pid, paths in videos.items()}, stills


def save_jpeg(source: Path, target: Path, pixels: int = GALLERY_PIXELS) -> None:
    with Image.open(source) as image:
        if image.mode in ("RGBA", "LA", "P"):
            image = image.convert("RGBA")
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.getchannel("A"))
            image = background
        else:
            image = image.convert("RGB")
        image.thumbnail((pixels, pixels), Image.LANCZOS)
        image.save(target, "JPEG", quality=84, optimize=True, progressive=True)


def export_images(key: str, sources: list[Path]) -> list[str]:
    OUT_IMAGES.mkdir(parents=True, exist_ok=True)
    urls = []
    for index, source in enumerate(sources, start=1):
        target = OUT_IMAGES / f"{key}-{index}.jpg"
        save_jpeg(source, target)
        urls.append(f"/assets/products/{target.name}")
    return urls


def find_ffmpeg() -> str | None:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return None


def export_hover(key: str, videos: list[Path], still: tuple[Path, str] | None, images: list[str], ffmpeg: str | None,
                 cut: tuple | None = None) -> dict | None:
    """Hover preview for the product card: a muted texture clip, else a texture or before/after still."""
    OUT_HOVER.mkdir(parents=True, exist_ok=True)
    if videos and ffmpeg:
        target = OUT_HOVER / f"{key}.mp4"
        # First seconds of the clip (or the given cut) at its own resolution, shorter side capped at 720px, no audio.
        scale = "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'"
        if cut:
            window = ["-ss", str(cut[0]), "-t", str(cut[1] - cut[0])]
            slow = "setpts=2*PTS," if cut[1] - cut[0] < 2 else ""
            crop = f"crop={cut[2]}," if len(cut) > 2 else ""
            filters = f"{crop}{slow}{scale},minterpolate=fps=30:mi_mode=mci"
        else:
            window = ["-t", str(HOVER_CLIP_SECONDS)]
            filters = f"{scale},fps=24"
        command = [ffmpeg, "-y", "-loglevel", "error", *window, "-i", str(videos[0]), "-an", "-vf", filters,
                   "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(target)]
        subprocess.run(command, check=True)
        return {"type": "video", "src": f"/assets/media/hover/{target.name}", "label": "Texture"}
    if still:
        path, kind = still
        target = OUT_HOVER / f"{key}.jpg"
        save_jpeg(path, target, 1000)
        return {"type": "image", "src": f"/assets/media/hover/{target.name}", "label": HOVER_STILL_LABELS[kind]}
    # Nothing that shows the formula: the second gallery shot still gives the card a hover state.
    if len(images) > 1:
        return {"type": "image", "src": images[1], "label": "A closer look"}
    return None


def product_sizes(item: dict) -> list[tuple[str, str, float, bool]]:
    """Store sizes of a crawled product as (label, volume, price, available)."""
    if item["brand"] != "Moroccanoil":
        return brand_variants(item)
    sizes = item.get("available_sizes") or [item.get("size") or "Full - Standard"]
    parsed = sorted({parse_size(s) for s in sizes}, key=lambda s: SIZE_ORDER.index(s[0]))
    sized: list[tuple[str, str, float, bool]] = []
    for label, volume in parsed:
        if all(label != s[0] for s in sized):
            sized.append((label, volume or "Standard", money(round(item["price"] * SIZE_PRICE_FACTOR[label])), True))
    return sized


def select_products(catalog: list[dict], videos: dict, stills: dict, images: dict) -> list[dict]:
    """Picks the storefront edit within the brand and category quotas.

    Products are ranked by how well they present: a texture clip, else a texture/before-after still, then
    the number of sharp gallery images and sizes on offer.
    """

    def score(item: dict) -> float:
        pid = str(item["product_id"])
        media = 3 if videos.get(pid) else 2 if pid in stills else 0
        gallery = images.get(pid, [])
        sharp = sum(1 for _, side in gallery if side >= 1000)
        return media * 10 + len(gallery) * 1.5 + sharp * 0.5 + len(product_sizes(item)) * 2 + min(item.get("review_count") or 0, 500) / 250

    def has_media(item: dict) -> bool:
        return bool(videos.get(str(item["product_id"]))) or str(item["product_id"]) in stills

    def presentable(item: dict) -> bool:
        # A product with one or two gallery images only makes the edit when it has a hover video.
        pid = str(item["product_id"])
        return len(images.get(pid, [])) >= MIN_GALLERY_IMAGES or bool(videos.get(pid))

    ranked = sorted((i for i in catalog if presentable(i) and str(i["product_id"]) not in EXCLUDED_PRODUCTS), key=lambda i: (-score(i), i["product_name"]))
    # The whole catalog has only six dry shampoos: all with more than one image are kept.
    chosen = [i for i in ranked if i["category"] == "Dry Shampoo"]
    brands = Counter(i["brand"] for i in chosen)
    categories = Counter(i["category"] for i in chosen)

    def take(item: dict) -> None:
        chosen.append(item)
        brands[item["brand"]] += 1
        categories[item["category"]] += 1

    def candidates(category: str, media_only: bool):
        return (i for i in ranked if i not in chosen and brands[i["brand"]] < BRAND_QUOTA[i["brand"]]
                and i["category"] == category and (has_media(i) or not media_only))

    # Repeatedly give the category furthest below its quota its best remaining product. First only products
    # with hover media and within the category quotas; then over quota (a brand whose range cannot fill a
    # category takes the next most under-filled one); products without hover media only as a last resort.
    for media_only, capped in ((True, True), (True, False), (False, False)):
        while True:
            open_categories = sorted((c for c in CATEGORY_QUOTA if not capped or categories[c] < CATEGORY_QUOTA[c]), key=lambda c: categories[c] / CATEGORY_QUOTA[c])
            item = next((i for c in open_categories for i in candidates(c, media_only)), None)
            if not item:
                break
            take(item)
    return chosen


STEP_BY_CATEGORY = {"Shampoo": "cleanse", "Conditioner": "condition", "Hair Masks": "treat", "Treatment / Oil": "treat", "Dry Shampoo": "style_protect", "Styling & Finishing": "style_protect"}


def build_products() -> list[dict]:
    catalog = json.load(open(ROOT / "data/store/product_data/catalog/products.json", encoding="utf-8"))
    quiz_catalog = json.load(open(ROOT / "docs/HairRoutineEngine/product_quiz_catalog.json", encoding="utf-8"))
    quiz_by_id = {str(p["product_id"]): p for p in (quiz_catalog["products"] if isinstance(quiz_catalog, dict) else quiz_catalog)}
    images = load_image_paths()
    videos, stills = load_media()
    variant_file = ROOT / "data/store/product_data/variant_images.json"
    variant_images = json.load(open(variant_file, encoding="utf-8")) if variant_file.exists() else {}
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        print("ffmpeg not found: products with texture clips fall back to texture images")
    counters: dict[tuple[str, str], int] = defaultdict(int)
    keys: set[str] = set()
    products = []

    edit = select_products(catalog, videos, stills, images)
    launches = pick_new_arrivals(edit, images)
    for item in edit:
        pid = str(item["product_id"])
        brand = item["brand"]
        brand_code = BRAND_CODES[brand]
        category = item["category"]
        code = CATEGORY_CODES[category]
        counters[(brand_code, code)] += 1
        n = counters[(brand_code, code)]
        quiz = quiz_by_id.get(pid)  # None only for a product that is new since the quiz catalog was last built
        key = quiz["key"] if quiz else slugify(f"{brand} {item['product_name']}")
        while key in keys:
            key += "-2"
        keys.add(key)

        # New arrivals launched within the last weeks (and sold nothing before that); the rest are established lines.
        created = NOW - timedelta(days=launches.get(pid, rng.randint(70, 720)), hours=rng.randint(0, 8))
        POPULARITY[pid] = popularity(item, brand) * (2.5 if pid in launches else 1)  # launch buzz
        variants = []
        for label, volume, price, available in product_sizes(item):
            on_hand = rng.choice([0, 6, 9, 12, 14] if rng.random() < 0.18 else list(range(18, 96))) if available else 0
            variants.append(
                {
                    "id": f"{pid}-{label.lower()}",
                    "sku": f"{brand_code}-{code}-{n:02d}-{label[0]}",
                    "sizeLabel": label,
                    "volume": volume,
                    "price": money(price),
                    "onHand": on_hand,
                    "reserved": 0,
                    "incoming": rng.choice([0, 0, 0, 0, 24, 36]),
                    "forSale": True,
                    "createdAt": iso(created),
                }
            )
        image_urls = export_images(key, [path for path, _ in images.get(pid, [])])
        for variant in variants:
            source = variant_images.get(pid, {}).get(variant["sizeLabel"])
            if source:
                target = OUT_IMAGES / f"{key}-{variant['sizeLabel'].lower()}.jpg"
                save_jpeg(ROOT / source["local_path"], target)
                variant["image"] = f"/assets/products/{target.name}"
        cut = HOVER_VIDEO_CUTS.get(pid)
        hover_source = videos[pid][0] if videos.get(pid) and ffmpeg else stills[pid][0] if pid in stills else None
        SOURCES[pid] = {
            "item": item,
            "images": [path for path, _ in images.get(pid, [])],
            "hover": hover_source,
            "hover_window": list(cut[1:3]) if cut else None,
        }
        products.append(
            {
                "id": pid,
                "key": key,
                "name": item["product_name"],
                "brand": brand,
                "category": category,
                **clean_text(item),  # description, keyBenefits, howToUse
                "ingredients": clean_ingredients(item.get("ingredients") or ""),
                "images": image_urls,
                "hover": export_hover(key, videos.get(pid, []), stills.get(pid), image_urls, ffmpeg, cut[1:] if cut else None),
                "sourceRating": item.get("rating") or 0,
                "sourceReviewCount": item.get("review_count") or 0,
                "status": "Active" if (quiz or {}).get("active", True) else "Inactive",
                # Quiz tags come from the Hair Routine Engine catalog; an untagged product stays out of the quiz.
                "quiz": quiz["quiz"] if quiz else {"scalp": ["all"], "needs": [], "step": STEP_BY_CATEGORY[category]},
                "allowAutoSubstitute": quiz.get("allow_auto_substitute", True) if quiz else False,
                "variants": variants,
                "createdAt": iso(created),
                "updatedAt": iso(created),
            }
        )
    newest = sorted(launches, key=launches.get)[:NEWEST_UNSOLD]
    slowest = sorted((p["id"] for p in products if p["id"] not in launches), key=lambda pid: POPULARITY[pid])[:SLOWEST_UNSOLD]
    ZERO_SALES.update(newest + slowest)
    for pid in ZERO_SALES:
        POPULARITY[pid] = 0.0  # never ordered, so never reviewed either
    remove_unused_media(products)
    return products


# Crawled record and source media of every product in the edit, for the storefront catalog export.
SOURCES: dict[str, dict] = {}
# How strongly each product sells in the simulated orders; the best sellers on the web come out of this.
POPULARITY: dict[str, float] = {}
NEW_ARRIVALS = 14
BRAND_DEMAND = {"Moroccanoil": 1.0, "Davines": 1.7, "Rahua": 2.1, "AROMATICA": 1.8}


def popularity(item: dict, brand: str) -> float:
    """Demand for a product: driven by how many reviews its brand site has, with some noise."""
    return (30 + (item.get("review_count") or 0)) ** 0.55 * BRAND_DEMAND[brand] * rng.lognormvariate(0, 0.35)


def pick_new_arrivals(edit: list[dict], images: dict) -> dict[str, int]:
    """Product id -> days since launch for the products that count as new: spread over brands and categories."""
    pool = [i for i in edit if len(images.get(str(i["product_id"]), [])) >= 4]
    rng.shuffle(pool)
    per_brand, per_category, picked = Counter(), Counter(), []
    for item in pool:
        if per_brand[item["brand"]] >= 5 or per_category[item["category"]] >= 4:
            continue
        picked.append(item)
        per_brand[item["brand"]] += 1
        per_category[item["category"]] += 1
        if len(picked) == NEW_ARRIVALS:
            break
    days = sorted(rng.sample(range(4, 52), len(picked)))
    return {str(item["product_id"]): d for item, d in zip(picked, days)}


def rel(path: Path | None) -> str:
    return path.relative_to(ROOT).as_posix() if path else ""


def export_storefront_catalog(products: list[dict], reviews: list[dict]) -> None:
    """Writes the 150 products shown on the storefront as a standalone dataset (JSON, CSV, XLSX)."""
    import pandas as pd

    rows = []
    for p in products:
        stars = [0] * 5
        for i, c in enumerate(p["ratingBase"]):
            stars[i] += c
        written = [r for r in reviews if r["productId"] == p["id"] and r["status"] == "Visible"]
        for r in written:
            stars[5 - r["rating"]] += 1
        rating_count = sum(stars)
        src = SOURCES[p["id"]]
        item = src["item"]
        hover = p["hover"] or {}
        rows.append(
            {
                "product_id": p["id"],
                "key": p["key"],
                "product_name": p["name"],
                "brand": p["brand"],
                "category": p["category"],
                "price_from": min(v["price"] for v in p["variants"]),
                "variants": [{"sku": v["sku"], "size_label": v["sizeLabel"], "volume": v["volume"], "price": v["price"], "image": v.get("image", "")} for v in p["variants"]],
                "description": p["description"],
                "key_benefits": p["keyBenefits"],
                "ingredients": p["ingredients"],
                "how_to_use": p["howToUse"],
                "units_sold": p["soldTotal"],
                "rating_count": rating_count,
                "rating_average": round(sum(c * (5 - i) for i, c in enumerate(stars)) / rating_count, 1) if rating_count else None,
                "written_reviews": len(written),
                "source_rating": p["sourceRating"] or None,
                "source_review_count": p["sourceReviewCount"],
                "product_url": item.get("product_url") or "",
                "images": p["images"],
                "image_sources": [rel(path) for path in src["images"]],
                "hover_type": hover.get("type", ""),
                "hover_src": hover.get("src", ""),
                "hover_source": rel(src["hover"]),
                "hover_source_window_s": src["hover_window"],
            }
        )
    OUT_CATALOG.mkdir(parents=True, exist_ok=True)
    (OUT_CATALOG / "products.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    flat = pd.DataFrame(rows)
    flat["variants"] = flat["variants"].map(lambda vs: json.dumps(vs, ensure_ascii=False))
    for column in ("key_benefits", "images", "image_sources"):
        flat[column] = flat[column].map("; ".join)
    flat["hover_source_window_s"] = flat["hover_source_window_s"].map(lambda w: f"{w[0]}-{w[1]}" if w else "")
    flat.to_csv(OUT_CATALOG / "products.csv", index=False, encoding="utf-8-sig")
    flat.to_excel(OUT_CATALOG / "products.xlsx", index=False)


def remove_unused_media(products: list[dict]) -> None:
    """Deletes generated images/clips of products that left the edit, so public/ only ships what is used."""
    used = {Path(url).name for p in products for url in p["images"] + ([p["hover"]["src"]] if p["hover"] else []) + [v["image"] for v in p["variants"] if v.get("image")]}
    for folder in (OUT_IMAGES, OUT_HOVER):
        for file in folder.glob("*"):
            if file.is_file() and file.name not in used:
                file.unlink()


# ---------------------------------------------------------------- people

CUSTOMERS = [
    ("Nguyễn Phương Thảo", "phuongthao.nguyen@gmail.com", "0908 123 456"),
    ("Nguyễn Minh Anh", "anh.nm@mail.com", "0903 123 457"),
    ("Trần Hoài Thu", "thu.th@mail.com", "0912 888 090"),
    ("Lê Quốc Bảo", "bao.lq@mail.com", "0977 555 321"),
    ("Phạm Ngọc Hân", "han.pn@mail.com", "0938 222 615"),
    ("Võ Thanh Tâm", "tam.vt@mail.com", "0905 761 230"),
    ("Đặng Gia Hân", "giahan.dang@mail.com", "0919 404 882"),
    ("Bùi Khánh Linh", "linh.bk@mail.com", "0986 310 774"),
    ("Hoàng Mai Chi", "chi.hm@mail.com", "0932 118 459"),
    ("Đỗ Tuấn Kiệt", "kiet.dt@mail.com", "0967 902 113"),
    ("Ngô Bảo Ngọc", "ngoc.nb@mail.com", "0948 557 031"),
    ("Trương Mỹ Duyên", "duyen.tm@mail.com", "0901 664 285"),
    ("Huỳnh Thu Hà", "ha.ht@mail.com", "0937 441 802"),
    ("Phan Quỳnh Như", "nhu.pq@mail.com", "0906 128 733"),
    ("Vũ Hải Đăng", "dang.vh@mail.com", "0978 330 561"),
    ("Dương Bích Ngọc", "bichngoc.duong@mail.com", "0914 782 306"),
    ("Lý Gia Bảo", "bao.lg@mail.com", "0903 556 912"),
    ("Đinh Thảo Vy", "vy.dt@mail.com", "0989 214 770"),
    ("Emily Carter", "emily.carter@mail.com", "0932 660 148"),
    ("Tô Minh Châu", "chau.tm@mail.com", "0908 997 215"),
    ("Mai Anh Thư", "thu.ma@mail.com", "0966 304 827"),
    ("Lâm Khánh Vân", "van.lk@mail.com", "0945 118 603"),
    ("Daniel Nguyen", "daniel.nguyen@mail.com", "0919 507 342"),
    ("Nguyễn Thuỳ Dương", "duong.nt@mail.com", "0902 771 456"),
    ("Trần Bảo Châu", "chau.tb@mail.com", "0936 825 190"),
    ("Sophie Tran", "sophie.tran@mail.com", "0987 402 661"),
    ("Lê Hồng Nhung", "nhung.lh@mail.com", "0904 619 238"),
    ("Phạm Gia Hưng", "hung.pg@mail.com", "0977 842 305"),
    ("Võ Ngọc Diệp", "diep.vn@mail.com", "0913 205 774"),
    ("Hannah Le", "hannah.le@mail.com", "0938 551 029"),
    ("Đặng Minh Thư", "thu.dm@mail.com", "0969 718 342"),
    ("Bùi Phương Linh", "plinh.bui@mail.com", "0907 336 981"),
    ("Hoàng Yến Nhi", "nhi.hy@mail.com", "0948 120 667"),
    ("Michael Pham", "michael.pham@mail.com", "0912 874 530"),
    ("Đỗ Thanh Trúc", "truc.dt@mail.com", "0935 409 122"),
    ("Ngô Khánh Ly", "ly.nk@mail.com", "0986 255 704"),
    ("Trương Bảo Anh", "anh.tb@mail.com", "0901 937 418"),
    ("Chloe Vo", "chloe.vo@mail.com", "0974 603 285"),
    ("Huỳnh Mỹ Linh", "mylinh.huynh@mail.com", "0918 442 069"),
    ("Phan Thanh Hằng", "hang.pt@mail.com", "0939 726 154"),
    ("Vũ Diệu Linh", "dieulinh.vu@mail.com", "0903 182 947"),
    ("Dương Quốc Huy", "huy.dq@mail.com", "0967 550 318"),
    ("Isabella Dang", "isabella.dang@mail.com", "0944 871 206"),
    ("Lý Thanh Mai", "mai.lt@mail.com", "0909 365 782"),
    ("Đinh Ngọc Trâm", "tram.dn@mail.com", "0932 704 561"),
    ("Tô Hoài An", "an.th@mail.com", "0981 238 449"),
    ("Mai Phương Trinh", "trinh.mp@mail.com", "0915 692 037"),
    ("Lâm Bảo Trân", "tran.lb@mail.com", "0902 458 316"),
    ("Olivia Bui", "olivia.bui@mail.com", "0976 133 920"),
    ("Nguyễn Hà My", "my.nh@mail.com", "0934 807 255"),
    ("Trần Khánh Huyền", "huyen.tk@mail.com", "0908 521 774"),
    ("Lê Thảo Nguyên", "nguyen.lt@mail.com", "0963 247 108"),
    ("Phạm Minh Khôi", "khoi.pm@mail.com", "0917 904 336"),
    ("Võ Hồng Anh", "honganh.vo@mail.com", "0948 366 721"),
    ("Đặng Thuỳ Trang", "trang.dt@mail.com", "0937 619 480"),
    ("Bùi Quỳnh Chi", "chi.bq@mail.com", "0905 842 193"),
    ("Hoàng Gia Hân", "han.hg@mail.com", "0972 330 645"),
    ("Đỗ Phương Anh", "anh.dp@mail.com", "0911 276 508"),
]
VN_SURNAMES = {"Nguyễn", "Trần", "Lê", "Phạm", "Võ", "Đặng", "Bùi", "Hoàng", "Đỗ", "Ngô", "Trương", "Huỳnh", "Phan", "Vũ", "Dương", "Lý", "Đinh", "Tô", "Mai", "Lâm"}


def display_name(full_name: str) -> str:
    """Shopper name as shown under a review: "Thảo N." (given name + surname initial)."""
    first, *_, last = full_name.split()
    return f"{last} {first[0]}." if first in VN_SURNAMES else f"{first} {last[0]}."
STREETS = [
    ("Landmark 81, 720A Điện Biên Phủ", "Phường 22", "Bình Thạnh", "TP. Hồ Chí Minh"),
    ("12 Lê Lợi", "Bến Nghé", "Quận 1", "TP. Hồ Chí Minh"),
    ("45 Nguyễn Huệ", "Bến Nghé", "Quận 1", "TP. Hồ Chí Minh"),
    ("88 Trần Duy Hưng", "Trung Hòa", "Cầu Giấy", "Hà Nội"),
    ("21 Bạch Đằng", "Hải Châu 1", "Hải Châu", "Đà Nẵng"),
    ("156 Võ Văn Tần", "Phường 6", "Quận 3", "TP. Hồ Chí Minh"),
    ("9 Hàng Bài", "Tràng Tiền", "Hoàn Kiếm", "Hà Nội"),
]


def build_people() -> tuple[list[dict], list[dict], list[dict]]:
    users, addresses = [], []
    for index, (name, email, phone) in enumerate(CUSTOMERS):
        uid = "user-demo" if index == 0 else f"user-{index:03d}"
        created = NOW - timedelta(days=rng.randint(3, 300) if index else 240)
        users.append(
            {
                "id": uid,
                "fullName": name,
                "email": email,
                "phone": phone,
                "password": "Customer@123",
                "role": "Customer",
                "status": "Active",
                "lockReason": None,
                "failedAttempts": 0,
                "lockedUntil": None,
                "createdAt": iso(created),
                "updatedAt": iso(created),
            }
        )
        street = STREETS[index % len(STREETS)]
        addresses.append(
            {
                "id": f"addr-{index:03d}-1",
                "userId": uid,
                "label": "Home",
                "recipientName": name,
                "phone": phone,
                "street": street[0],
                "ward": street[1],
                "district": street[2],
                "city": street[3],
                "isDefault": True,
            }
        )
    addresses.append(
        {
            "id": "addr-000-2",
            "userId": "user-demo",
            "label": "Office",
            "recipientName": "Nguyễn Phương Thảo",
            "phone": "0908 123 456",
            "street": "45 Nguyễn Huệ",
            "ward": "Bến Nghé",
            "district": "Quận 1",
            "city": "TP. Hồ Chí Minh",
            "isDefault": False,
        }
    )
    users[3]["status"] = "Locked"
    users[3]["lockReason"] = "Fraud"
    admins = [
        {
            "id": "admin-001",
            "fullName": "Store Administrator",
            "email": "admin@haircare.vn",
            "password": "admin123",
            "role": "Admin",
        }
    ]
    return users, admins, addresses


# ---------------------------------------------------------------- orders


def address_snapshot(address: dict) -> dict:
    return {
        "recipientName": address["recipientName"],
        "phone": address["phone"],
        "addressLine": f'{address["street"]}, {address["ward"]}, {address["district"]}, {address["city"]}',
        "note": "",
    }


def build_orders(products: list[dict], users: list[dict], addresses: list[dict]) -> list[dict]:
    variant_pool = [(p, v) for p in products for v in p["variants"]]
    size_demand = {"Travel": 0.55, "Full": 1.0, "Half-Liter": 0.3, "Liter": 0.18}
    weights = [POPULARITY[p["id"]] * size_demand[v["sizeLabel"]] for p, v in variant_pool]
    launched = {p["id"]: datetime.fromisoformat(p["createdAt"].replace("Z", "+00:00")) for p in products}
    address_by_user = {a["userId"]: a for a in addresses if a["isDefault"]}
    shipping_fee = 5.0
    orders = []
    per_day: dict[str, int] = defaultdict(int)

    def make_order(user: dict, placed: datetime, status: str, method: str) -> dict:
        lines = []
        # A product only sells after its launch date.
        on_sale = [(i, w) for i, ((p, _), w) in enumerate(zip(variant_pool, weights)) if launched[p["id"]] <= placed and w > 0]
        for _ in range(rng.choice([1, 1, 2, 2, 3])):
            product, variant = variant_pool[rng.choices([i for i, _ in on_sale], weights=[w for _, w in on_sale])[0]]
            if any(line["variantId"] == variant["id"] for line in lines):
                continue
            qty = rng.choice([1, 1, 1, 2])
            lines.append(
                {
                    "productId": product["id"],
                    "variantId": variant["id"],
                    "sku": variant["sku"],
                    "productName": product["name"],
                    "category": product["category"],
                    "sizeLabel": variant["sizeLabel"],
                    "volume": variant["volume"],
                    "imageUrl": product["images"][0] if product["images"] else "",
                    "unitPrice": variant["price"],
                    "quantity": qty,
                    "lineTotal": money(variant["price"] * qty),
                }
            )
        subtotal = money(sum(line["lineTotal"] for line in lines))
        voucher = None
        discount = 0.0
        if subtotal >= 30 and rng.random() < 0.18:
            voucher = "WELCOME10"
            discount = money(min(subtotal * 0.1, 15))
        day = placed.strftime("%Y%m%d")
        per_day[day] += 1
        timeline = [{"status": "Payment Pending" if method == "BANK_TRANSFER" else "Processing", "at": iso(placed), "note": "Order placed"}]
        if method == "BANK_TRANSFER":
            timeline.append({"status": "Processing", "at": iso(placed + timedelta(minutes=rng.randint(2, 25))), "note": "Payment received"})
        flow = ["Shipping", "Completed"]
        completed_at = None
        cursor = placed + timedelta(hours=rng.randint(4, 30))
        terminal = status
        if status in ("Shipping", "Completed", "Return Pending", "Returned"):
            for step in flow:
                timeline.append({"status": step, "at": iso(cursor), "note": "" if step == "Shipping" else "Delivered"})
                if step == "Completed":
                    completed_at = cursor
                if step == status:
                    break
                cursor += timedelta(days=rng.randint(2, 4))
        if status in ("Return Pending", "Returned"):
            requested = (completed_at or cursor) + timedelta(days=rng.randint(1, 4))
            timeline.append({"status": "Return Pending", "at": iso(requested), "note": "Customer requested a return"})
            if status == "Returned":
                timeline.append({"status": "Returned", "at": iso(requested + timedelta(days=2)), "note": "Return approved & refunded"})
        if status == "Cancelled":
            timeline.append({"status": "Cancelled", "at": iso(placed + timedelta(hours=3)), "note": "Changed my mind"})
        paid = method == "BANK_TRANSFER" or terminal in ("Completed", "Return Pending", "Returned")
        payment_status = "Paid" if paid else "Unpaid"
        if terminal == "Returned" or (terminal == "Cancelled" and method == "BANK_TRANSFER"):
            payment_status = "Refunded"
        total = money(subtotal - discount + shipping_fee)
        order = {
            "id": f"ord-{len(orders) + 1:04d}",
            "code": f"HCI-{day}-{per_day[day]:04d}",
            "userId": user["id"],
            "customerName": user["fullName"],
            "customerPhone": user["phone"],
            "status": terminal,
            "paymentMethod": method,
            "paymentStatus": payment_status,
            "paymentRef": f"PAY-HCI-{rng.randint(10000, 99999)}" if method == "BANK_TRANSFER" else None,
            "paymentDeadline": None,
            "shipping": address_snapshot(address_by_user[user["id"]]),
            "items": lines,
            "subtotal": subtotal,
            "discount": discount,
            "voucherCode": voucher,
            "shippingFee": shipping_fee,
            "total": total,
            "timeline": timeline,
            "cancelReason": "Changed my mind" if terminal == "Cancelled" else None,
            "returnRequest": None,
            "refundAmount": money(total - shipping_fee) if payment_status == "Refunded" and terminal == "Returned" else (total if payment_status == "Refunded" else 0),
            "completedAt": iso(completed_at) if completed_at else None,
            "createdAt": iso(placed),
            "updatedAt": timeline[-1]["at"],
        }
        if terminal in ("Return Pending", "Returned"):
            order["returnRequest"] = {
                "reason": rng.choice(["Product does not suit my hair", "Received the wrong item", "Changed my mind"]),
                "sealIntact": True,
                "storeFault": False,
                "requestedAt": next(t["at"] for t in timeline if t["status"] == "Return Pending"),
                "rejectReason": None,
            }
        orders.append(order)
        return order

    shoppers = [u for u in users if u["status"] == "Active"]
    for days_ago in range(120, 0, -1):
        for _ in range(rng.choice([3, 5, 6, 7, 8, 9, 10, 12])):
            placed = NOW - timedelta(days=days_ago, hours=rng.randint(0, 12), minutes=rng.randint(0, 59))
            if days_ago > 10:
                status = rng.choices(["Completed", "Returned", "Cancelled"], weights=[86, 5, 9])[0]
            elif days_ago > 5:
                status = rng.choices(["Completed", "Shipping", "Return Pending"], weights=[70, 22, 8])[0]
            else:
                status = rng.choices(["Processing", "Shipping", "Completed"], weights=[55, 35, 10])[0]
            make_order(rng.choice(shoppers[1:]), placed, status, rng.choice(["COD", "BANK_TRANSFER"]))

    demo = users[0]
    for days_ago, status, method in [(64, "Completed", "COD"), (33, "Completed", "BANK_TRANSFER"), (4, "Completed", "COD"), (2, "Shipping", "BANK_TRANSFER"), (1, "Processing", "COD")]:
        make_order(demo, NOW - timedelta(days=days_ago, hours=2), status, method)
    # A return requested by the demo customer earlier, waiting for admin review.
    make_order(demo, NOW - timedelta(days=9), "Return Pending", "BANK_TRANSFER")

    orders.sort(key=lambda o: o["createdAt"])
    return orders


def apply_reservations(products: list[dict], orders: list[dict]) -> None:
    variants = {v["id"]: v for p in products for v in p["variants"]}
    for order in orders:
        if order["status"] == "Processing":
            for line in order["items"]:
                variant = variants[line["variantId"]]
                variant["onHand"] = max(variant["onHand"], variant["reserved"] + line["quantity"])
                variant["reserved"] += line["quantity"]


# ---------------------------------------------------------------- reviews, vouchers, quiz

# Products nobody has bought yet: the newest launches and the least wanted lines.
ZERO_SALES: set[str] = set()
NEWEST_UNSOLD = 3
SLOWEST_UNSOLD = 3
SLOW_MOVERS = 6  # products that sold only a handful of units


BEST_SELLER_QUOTA = {"Moroccanoil": 4, "Davines": 2, "Rahua": 2, "AROMATICA": 2}
FORCED_BEST_SELLERS = ["aromatica-rosemary-root-enhancer"]


def assign_sales_and_ratings(products: list[dict], reviews: list[dict]) -> None:
    """Lifetime units sold (shown as "1.2K sold") and the star ratings that shoppers left without a written review.

    Ten best sellers sell 1,100-1,900 units (spread over the four houses), established products 40-1,000, and new
    arrivals a few dozen to a few hundred. About a third of buyers rate a product, and only some of them write.
    """
    new_ids = {p["id"] for p in products if NOW - datetime.fromisoformat(p["createdAt"].replace("Z", "+00:00")) <= timedelta(days=45)}
    established = sorted((p for p in products if p["id"] not in new_ids), key=lambda p: -POPULARITY[p["id"]])
    best: list[dict] = []
    quota = dict(BEST_SELLER_QUOTA)
    for p in [q for key in FORCED_BEST_SELLERS for q in established if q["key"] == key] + established:
        if p not in best and quota[p["brand"]] > 0:
            best.append(p)
            quota[p["brand"]] -= 1
    best.sort(key=lambda p: -POPULARITY[p["id"]])
    sold: dict[str, int] = {p["id"]: 1900 - i * 85 + rng.randint(-25, 25) for i, p in enumerate(best)}
    rest = [p for p in established if p not in best][::-1]  # least popular first
    for rank, p in enumerate(rest):
        sold[p["id"]] = int(40 + 1040 * (rank / max(1, len(rest) - 1)) ** 1.8 * rng.uniform(0.94, 1.06))
    for p in rest[:SLOW_MOVERS + SLOWEST_UNSOLD]:
        if p["id"] not in ZERO_SALES:
            sold[p["id"]] = rng.randint(2, 18)
    for p in products:
        if p["id"] in new_ids:
            age = (NOW - datetime.fromisoformat(p["createdAt"].replace("Z", "+00:00"))).days
            sold[p["id"]] = int(age * rng.uniform(2, 6)) + rng.randint(5, 25)
    for pid in ZERO_SALES:
        sold[pid] = 0

    written: dict[str, list[int]] = defaultdict(lambda: [0] * 5)
    for r in reviews:
        if r["status"] == "Visible":
            written[r["productId"]][5 - r["rating"]] += 1
    for p in products:
        pid = p["id"]
        units = sold[pid]
        total = 0 if units < 20 else rng.choice([0, 0, 0, 1, 2, 3]) if units < 90 else round(units * rng.uniform(0.25, 0.42))
        total = max(total, sum(written[pid]))
        weights = star_weights(QUALITY[pid])
        counts = [int(total * w) for w in weights]
        for i in sorted(range(5), key=lambda i: -(total * weights[i] - counts[i]))[: total - sum(counts)]:
            counts[i] += 1
        p["soldTotal"] = units
        p["ratingBase"] = [max(0, c - w) for c, w in zip(counts, written[pid])]


# Share of 5, 4, 3, 2, 1 stars for a product rated 4.9 and one rated 3.9; other products sit in between.
STAR_SHARE_HIGH = [0.88, 0.09, 0.02, 0.005, 0.005]
STAR_SHARE_LOW = [0.38, 0.27, 0.20, 0.09, 0.06]


def star_weights(mean: float) -> list[float]:
    t = min(1.0, max(0.0, (mean - 3.9) / 1.0))
    return [lo + (hi - lo) * t for hi, lo in zip(STAR_SHARE_HIGH, STAR_SHARE_LOW)]


# How well each product is rated (set by build_reviews, used again for the star-only ratings).
QUALITY: dict[str, float] = {}


def review_media(product: dict) -> list[dict]:
    """Photos and sometimes a clip attached to a review: the product's own photos and its texture clip."""
    photos = product["images"][1:]
    roll = rng.random()
    video = product["hover"] if product["hover"] and product["hover"]["type"] == "video" else None
    if video and roll < 0.07:
        return [{"type": "video", "src": video["src"], "poster": product["images"][0]}]
    if photos and roll < 0.30:
        return [{"type": "image", "src": src} for src in rng.sample(photos, k=min(len(photos), rng.choice([1, 1, 1, 2, 3])))]
    return []


def build_reviews(orders: list[dict], products: list[dict]) -> list[dict]:
    """Verified-purchase reviews: only Completed orders are reviewed, so well-selling products collect many
    reviews, rarely sold and new products few or none, and quality differs a little from product to product."""
    by_id = {p["id"]: p for p in products}
    quality = QUALITY
    for p in products:
        base = 0.5 * p["sourceRating"] + 0.5 * 4.4 if p["sourceRating"] else rng.uniform(4.2, 4.6)
        quality[p["id"]] = min(4.9, max(3.9, base + rng.gauss(0, 0.15)))
    for pid in rng.sample(sorted(quality), 5):  # a few polarising products
        quality[pid] = rng.uniform(3.9, 4.15)
    used: dict[str, set[str]] = defaultdict(set)
    reviewed: set[tuple[str, str]] = set()
    # The demo customer's latest delivered order stays unreviewed, so "Write a review" can be tried.
    demo_orders = [o for o in orders if o["userId"] == "user-demo" and o["status"] == "Completed"]
    keep_open = demo_orders[-1]["id"] if demo_orders else None
    reviews = []
    for order in orders:
        if order["status"] != "Completed" or order["id"] == keep_open:
            continue
        completed = datetime.fromisoformat(order["completedAt"].replace("Z", "+00:00"))
        for line in order["items"]:
            product = by_id[line["productId"]]
            key = (order["userId"], product["id"])
            fresh = NOW - datetime.fromisoformat(product["createdAt"].replace("Z", "+00:00")) < timedelta(days=60)
            if key in reviewed or rng.random() > (0.65 if fresh else 0.55):
                continue
            created = completed + timedelta(days=min(14, 1 + int(rng.expovariate(1 / 3))), hours=rng.randint(0, 20))
            if created > NOW:
                continue
            rating = rng.choices([5, 4, 3, 2, 1], weights=star_weights(quality[product["id"]]))[0]
            reviewed.add(key)
            reviews.append(
                {
                    "id": "",
                    "productId": product["id"],
                    "orderId": order["id"],
                    "userId": order["userId"],
                    "authorName": display_name(order["customerName"]),
                    "rating": rating,
                    "comment": compose(product["category"], rating, line["sizeLabel"], rng, used[product["id"]]),
                    "media": [],
                    "status": "Visible",
                    "hiddenReason": None,
                    "createdAt": iso(created),
                    "updatedAt": iso(created),
                }
            )
    reviews.sort(key=lambda r: r["createdAt"])
    for index, review in enumerate(reviews, start=1):
        review["id"] = f"rev-{index:04d}"
        if review["comment"]:
            review["media"] = review_media(by_id[review["productId"]])
    if len(reviews) > 3:
        reviews[3]["status"] = "Hidden"
        reviews[3]["hiddenReason"] = "Spam"
        reviews[3]["comment"] = "Buy cheap copies at my shop, link in bio!!!"
        reviews[3]["rating"] = 1
    return reviews


def build_vouchers(orders: list[dict]) -> tuple[list[dict], list[dict]]:
    vouchers = [
        {"id": "vch-001", "code": "WELCOME10", "description": "10% off your order", "type": "percent", "value": 10, "maxDiscount": 15, "minOrder": 30, "startsAt": "2026-01-01T00:00:00Z", "endsAt": "2026-12-31T23:59:59Z", "totalQuota": 500, "usedCount": 0, "perUserLimit": 1, "active": True},
        {"id": "vch-002", "code": "SHIP5", "description": "$5 off orders from $50", "type": "fixed", "value": 5, "maxDiscount": None, "minOrder": 50, "startsAt": "2026-10-01T00:00:00Z", "endsAt": "2026-11-30T23:59:59Z", "totalQuota": 200, "usedCount": 0, "perUserLimit": 2, "active": True},
        {"id": "vch-003", "code": "HAIRDAY", "description": "15% off hair masks day", "type": "percent", "value": 15, "maxDiscount": 20, "minOrder": 0, "startsAt": "2026-08-01T00:00:00Z", "endsAt": "2026-09-30T23:59:59Z", "totalQuota": 100, "usedCount": 0, "perUserLimit": 1, "active": True},
        {"id": "vch-004", "code": "VIP20", "description": "20% off for VIP clients", "type": "percent", "value": 20, "maxDiscount": 25, "minOrder": 80, "startsAt": "2026-10-01T00:00:00Z", "endsAt": "2026-12-31T23:59:59Z", "totalQuota": 50, "usedCount": 0, "perUserLimit": 1, "active": False},
    ]
    usages = []
    for order in orders:
        if order["voucherCode"] and order["status"] != "Cancelled":
            vouchers[0]["usedCount"] += 1
            usages.append({"id": f"vu-{len(usages) + 1:04d}", "voucherId": "vch-001", "userId": order["userId"], "orderId": order["id"], "at": order["createdAt"]})
    return vouchers, usages


def build_quiz_events() -> list[dict]:
    labels = ["Repair", "Scalp", "Color", "Curl", "Hydration", "Volume", "Styling"]
    weights = [24, 12, 18, 8, 30, 6, 2]
    events = []
    for index in range(420):
        at = NOW - timedelta(days=rng.randint(0, 120), minutes=rng.randint(0, 1440))
        primary = rng.choices(labels, weights=weights)[0]
        secondary = rng.choice([None] + [label for label in labels if label != primary])
        events.append({"id": f"qe-{index + 1:04d}", "at": iso(at), "primaryLabel": primary, "secondaryLabel": secondary, "rulesetVersion": "3.0.0", "addedRoutineToCart": rng.random() < 0.34})
    return sorted(events, key=lambda e: e["at"])


def build_hair_profiles(products: list[dict]) -> list[dict]:
    """The demo customer's saved quiz result, produced by the Hair Routine Engine so it always matches the ruleset."""
    sys.path.insert(0, str(ROOT / "docs" / "HairRoutineEngine"))
    from hair_routine_engine import HairRoutineEngine

    engine = HairRoutineEngine.from_files()
    by_key = {p["key"]: p for p in products}
    answers = {"scalp_condition": "normal", "hair_damage": "damaged", "hair_texture": "wavy", "hair_thickness": "medium", "wash_frequency": "every_2_3_days", "chemical_history": ["dyed"], "primary_goal": "repair"}
    stock = {str(p["product_id"]): {"active": True, "available": 10} for p in engine.products}
    result = engine.infer(answers, stock)
    routine = [(item["step_id"], item["product"]["key"] if item["product"] else None) for item in result["routine"]]
    addon = result["addon"]["product"]["key"] if result["addon"] else None
    return [
        {
            "id": "hp-001",
            "userId": "user-demo",
            "answers": answers,
            "primaryLabel": result["primary_label"],
            "secondaryLabel": result["secondary_label"],
            "routine": [{"step": step, "productId": by_key[key]["id"] if key in by_key else None, "productName": by_key[key]["name"] if key in by_key else None} for step, key in routine],
            "addonProductId": by_key[addon]["id"] if addon in by_key else None,
            "rulesetVersion": result["ruleset_version"],
            "savedAt": iso(NOW - timedelta(days=40)),
        }
    ]


# ---------------------------------------------------------------- forecast


def build_forecast(products: list[dict]) -> dict:
    rows = [r for r in csv.DictReader(open(ROOT / "data/ml/B_Plan/mapped_59_skus/fixed_origin_predictions.csv", encoding="utf-8-sig")) if r["target"] == "quantity" and r["h"] == "1"]
    weeks = sorted({r["wk"] for r in rows})
    sums: dict[tuple[str, str, str], list[float]] = defaultdict(lambda: [0.0, 0.0])
    actual: dict[tuple[str, str], float] = defaultdict(float)
    for row in rows:
        category = PLAN_CATEGORY[row["category"]]
        a = float(row["actual"])
        actual[(category, row["wk"])] += a
        for model in MODEL_NAMES:
            p = float(row[model])
            entry = sums[(category, row["wk"], model)]
            entry[0] += abs(a - p)
            entry[1] += a
    categories = []
    for category in CATEGORY_CODES:
        per_model = {}
        for model in MODEL_NAMES:
            weekly = [sums[(category, wk, model)] for wk in weeks]
            per_model[model] = [w[0] / w[1] * 100 if w[1] else 0 for w in weekly]
        candidates = {m: sum(v) / len(v) for m, v in per_model.items()}
        best = min(candidates, key=candidates.get)
        predicted_totals = defaultdict(float)
        for row in rows:
            if PLAN_CATEGORY[row["category"]] == category:
                predicted_totals[row["wk"]] += float(row[best])
        categories.append(
            {
                "category": category,
                "selectedModel": MODEL_NAMES[best],
                "candidates": [{"model": MODEL_NAMES[m], "wape": round(v, 1)} for m, v in sorted(candidates.items(), key=lambda kv: kv[1])],
                "weeklyWape": [round(v, 1) for v in per_model[best]],
                "history": [{"week": f"W-{len(weeks) - i}", "actual": round(actual[(category, wk)] * FORECAST_SCALE), "predicted": round(predicted_totals[wk] * FORECAST_SCALE)} for i, wk in enumerate(weeks)],
            }
        )

    by_category_forecast: dict[str, float] = defaultdict(float)
    product_category = {p["id"]: p["category"] for p in products}
    for row in csv.DictReader(open(ROOT / "data/ml/A_Plan/results/demo_inventory_recommendations_weekly.csv", encoding="utf-8-sig")):
        if row["product_id"] in product_category:
            by_category_forecast[product_category[row["product_id"]]] += float(row["forecast_quantity"]) * FORECAST_SCALE
    for entry in categories:
        entry["forecast14d"] = round(by_category_forecast[entry["category"]])

    return {
        "generatedAt": iso(NOW - timedelta(days=2)),
        "lastTrainedAt": iso(NOW - timedelta(days=2)),
        "horizonDays": 14,
        "source": "Plan B backtests (Online Retail II mapped to 59 SKUs) · 14-day demand from Plan A weekly model · quantities scaled to store volume",
        "metric": "WAPE (%) · one-week-ahead backtest per category",
        "categories": categories,
    }


# ---------------------------------------------------------------- main


def main() -> None:
    products = build_products()
    users, admins, addresses = build_people()
    orders = build_orders(products, users, addresses)
    apply_reservations(products, orders)
    vouchers, usages = build_vouchers(orders)
    reviews = build_reviews(orders, products)
    assign_sales_and_ratings(products, reviews)
    export_storefront_catalog(products, reviews)
    db = {
        "version": 2,
        # Build time, so browsers drop the localStorage copy of an older seed (MockDbService compares it).
        "generatedAt": iso(datetime.now(timezone.utc)),
        "settings": {
            "storeName": "FOLMARÉ",
            "supportEmail": "hello@folmare.vn",
            "warehouseAddress": "123 Lê Lợi, Bến Nghé, Quận 1, TP. Hồ Chí Minh",
            "currency": "USD",
            "shippingFee": 5.0,
            "paymentTimeoutMinutes": 15,
            "bank": {"bankName": "Techcombank", "accountNumber": "1903 8888 6868", "accountName": "FOLMARÉ VIETNAM CO., LTD."},
            "paymentSimulation": True,
            "lowStockThreshold": 15,
            "safetyStock": 15,
            "leadTimeDays": 7,
            "reviewPeriodDays": 7,
            "wapeThreshold": 20,
            "returnWindowDays": 7,
        },
        "products": products,
        "users": users,
        "admins": admins,
        "addresses": addresses,
        "carts": [
            {"id": "cart-user-demo", "userId": "user-demo", "items": [{"variantId": products[0]["variants"][0]["id"], "productId": products[0]["id"], "quantity": 1}]},
        ],
        "orders": orders,
        "reviews": reviews,
        "vouchers": vouchers,
        "voucherUsages": usages,
        "quizEvents": build_quiz_events(),
        "hairProfiles": build_hair_profiles(products),
        "inventoryAdjustments": [],
        "otpRequests": [],
        "forecast": build_forecast(products),
    }
    OUT_SEED.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(db, ensure_ascii=False, indent=1)
    OUT_SEED.write_text(text, encoding="utf-8")
    OUT_JSON_SERVER.write_text(text, encoding="utf-8")
    print(f"products={len(products)} variants={sum(len(p['variants']) for p in products)} orders={len(orders)} reviews={len(db['reviews'])} quizEvents={len(db['quizEvents'])}")
    print(f"seed -> {OUT_SEED.relative_to(ROOT)} ({OUT_SEED.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()

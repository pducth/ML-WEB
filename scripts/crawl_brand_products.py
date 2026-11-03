"""Crawl AROMATICA, Rahua and Davines haircare products into data/store/product_data/<brand>/.

Mirrors the existing Moroccanoil crawl (data/store/product_data/moroccanoil): same 6 categories, same
25-column product schema, USD prices, images grouped by category folder. All three brands run on
Shopify, so product lists come from /collections/<handle>/products.json and the detail sections
(description, key benefits, ingredients, how to use, rating) are parsed from each product page.

Requests go through curl (Python requests gets HTTP 429 from these stores) with an on-disk cache,
so a re-run only fetches what is missing.

Outputs per brand:
  products.json / products.csv / products.xlsx  - one row per product (sizes merged into one product)
  product_images.csv                            - one row per image with its local path
  images/<category>/<slug>_NN.jpg               - product images (JPEG, max 1600px)
  crawl_summary.txt / crawl_errors.log          - what was kept, filtered out, and any failures

Afterwards the combined catalog of every brand folder (Moroccanoil included) is written to
data/store/product_data/catalog/. Run from the repository root:

    python scripts/crawl_brand_products.py                 # all three brands + catalog
    python scripts/crawl_brand_products.py --brand rahua   # one brand + catalog
    python scripts/crawl_brand_products.py --catalog-only  # rebuild catalog/ only
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import io
import json
import re
import subprocess
import sys
import tempfile
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "store" / "product_data"
CATALOG_DIR = DATA_DIR / "catalog"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
MAX_IMAGES = 10
IMAGE_MAX_PX = 1600

CATEGORIES = ["Shampoo", "Conditioner", "Hair Masks", "Treatment / Oil", "Dry Shampoo", "Styling & Finishing"]
CATEGORY_FOLDERS = {
    "Shampoo": "shampoo",
    "Conditioner": "conditioner",
    "Hair Masks": "masks",
    "Treatment / Oil": "treatment_oil",
    "Dry Shampoo": "dry_shampoo",
    "Styling & Finishing": "styling",
}
COLUMNS = [
    "product_id", "product_name", "brand", "category", "categories", "product_url", "price", "currency",
    "original_price", "discount", "product_description", "key_benefits", "ingredients", "how_to_use", "size",
    "available_sizes", "availability", "rating", "review_count", "image_url", "image_urls", "image_local_path",
    "scraped_at", "source_url", "tags",
]

# Collections per brand, mapped to the category they feed. A product listed in several collections is
# classified by classify() below, which uses the collection only as a fallback.
BRANDS = {
    "aromatica": {
        "brand": "AROMATICA",
        "host": "global.aromatica.co",
        "collections": {
            "shampoo": "Shampoo",
            "conditioner": "Conditioner",
            "hair-mask-oil": "Treatment / Oil",
            "hair-treatment": "Treatment / Oil",
            "scalp-treatments": "Treatment / Oil",
            "leave-in-treatment": "Treatment / Oil",
            "hair-mist": "Styling & Finishing",
            "dry-shampoo": "Dry Shampoo",
        },
    },
    "rahua": {
        "brand": "Rahua",
        "host": "www.rahua.com",
        "collections": {
            "shampoo": "Shampoo",
            "conditioner": "Conditioner",
            "hair-masks-for-your-strands": "Hair Masks",
            "hair-treatments-1": "Treatment / Oil",
            "oils": "Treatment / Oil",
            "stylers": "Styling & Finishing",
            "voluminous-dry-shampoo": "Dry Shampoo",
        },
    },
    "davines": {
        "brand": "Davines",
        "host": "us.davines.com",
        "collections": {
            "shampoo": "Shampoo",
            "conditioner": "Conditioner",
            "hair-masks": "Hair Masks",
            "hair-treatments": "Treatment / Oil",
            "hair-serums-and-oils": "Treatment / Oil",
            "dry-shampoo": "Dry Shampoo",
            "styling-products": "Styling & Finishing",
        },
    },
}

EXCLUDED_TYPES = {"banner", "set", "kit", "sets", "promogift", "merchandising", "tool", "hair care"}
BUNDLE_RE = re.compile(
    r"\b(set|kit|duo|trio|bundle|routine|pack|discovery|sampling|sample|gift|essentials|rituals)\b|&\s*refill|\bx\d\b",
    re.I,
)
TOOL_RE = re.compile(r"\b(brush|comb|towel|pochette|cap)\b", re.I)
NON_HAIR_RE = re.compile(r"body oil|body wash|& body|beard|hand cream|quiz|award|gift guide", re.I)
SIZE_SUFFIX_RE = re.compile(r"\s+(\d+(?:[.,]\d+)?\s?(?:ml|g|gr|l|oz|fl\.? ?oz))\b\.?$", re.I)

errors: list[str] = []


# ---------------------------------------------------------------- fetching


class Fetcher:
    def __init__(self, cache: Path):
        self.cache = cache
        self.cache.mkdir(parents=True, exist_ok=True)

    def get(self, url: str, binary: bool = False, delay: float = 1.5) -> bytes | None:
        target = self.cache / hashlib.md5(url.encode()).hexdigest()
        if target.exists():
            return target.read_bytes()
        for attempt in range(8):
            result = subprocess.run(
                ["curl", "-s", "-L", "-A", UA, "--max-time", "90", "-w", "\n%{http_code}", url], capture_output=True
            )
            body, _, code = result.stdout.rpartition(b"\n")
            if code == b"200" and (binary or body.strip()):
                target.write_bytes(body)
                time.sleep(delay)
                return body
            if code in (b"404", b"410"):
                break
            time.sleep(min(90, 10 * (attempt + 1)))
        errors.append(f"FETCH FAILED {url}")
        return None

    def text(self, url: str) -> str:
        body = self.get(url)
        return body.decode("utf-8", "replace") if body else ""


def collection_products(fetch: Fetcher, host: str, handle: str) -> list[dict]:
    items, page = [], 1
    while True:
        raw = fetch.text(f"https://{host}/collections/{handle}/products.json?limit=250&page={page}")
        batch = json.loads(raw).get("products", []) if raw else []
        items += batch
        if len(batch) < 250:
            return items
        page += 1


# ---------------------------------------------------------------- text helpers


def clean(text: str | None) -> str:
    text = html.unescape(text or "").replace("\xa0", " ").replace("⠀", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\s*\n\s*", "\n", text).strip()


def html_text(fragment: str | None) -> str:
    return clean(BeautifulSoup(fragment or "", "html.parser").get_text("\n")) if fragment else ""


def strip_heading(text: str, heading: str) -> str:
    return re.sub(rf"^\s*{re.escape(heading)}\s*", "", text, flags=re.I).strip()


def slugify(name: str) -> str:
    name = re.sub(r"[™®©]", "", name.lower()).replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "_", name).strip("_")


def base_name(title: str) -> tuple[str, str]:
    """'Rosemary Scalp Scaling Shampoo Refill 500ml' -> ('Rosemary Scalp Scaling Shampoo', 'Refill - 500ml')."""
    name = clean(title)
    size = ""
    match = SIZE_SUFFIX_RE.search(name)
    if match:
        size = match.group(1).replace(" ", "")
        name = name[: match.start()].strip()
    refill = re.search(r"\s+refill$", name, re.I)
    if refill:
        name = name[: refill.start()].strip()
        size = f"Refill - {size}" if size else "Refill"
    return name, size


def name_key(name: str) -> str:
    return slugify(name)


# ---------------------------------------------------------------- classification


def exclusion_reason(product: dict) -> str | None:
    title = clean(product["title"])
    ptype = html.unescape(product.get("product_type") or "").strip().lower()
    prices = [float(v["price"]) for v in product["variants"]]
    if ptype in EXCLUDED_TYPES and not re.search(r"refill", title, re.I):
        return "Tool" if ptype == "tool" else "Bundle/Set" if ptype not in {"banner", "merchandising"} else "Banner/Non-product"
    if ptype.startswith("shampoo & conditioner") or ptype == "sets":
        return "Bundle/Set"
    if max(prices) <= 0 or not title.strip():
        return "Banner/Non-product"
    if BUNDLE_RE.search(title):
        return "Bundle/Set"
    if TOOL_RE.search(title):
        return "Tool"
    if NON_HAIR_RE.search(title) or ptype.startswith("skin care"):
        return "Non-hair"
    return None


def classify(brand_key: str, product: dict, collections: list[str]) -> str:
    title = clean(product["title"]).lower()
    ptype = html.unescape(product.get("product_type") or "").lower()
    by_collection = BRANDS[brand_key]["collections"]
    in_category = {by_collection[c] for c in collections}

    if re.search(r"dry shampoo|hair refresher|shampoo powder", title) or "Dry Shampoo" in in_category:
        return "Dry Shampoo"
    if brand_key == "davines" and ptype in {"more inside", "pasta & love"}:
        return "Styling & Finishing"
    if brand_key == "rahua" and "styling" in ptype:
        return "Styling & Finishing"
    if re.search(r"\bmask\b|masque|hair butter|circle$|building pak|replenishing butter|intense treatment|3-in-1 treatment", title):
        return "Hair Masks"
    if "Hair Masks" in in_category:
        return "Hair Masks"
    if re.search(r"shampoo|co-wash|cleansing nectar|\bscrub\b", title):
        return "Shampoo"
    if re.search(r"conditioner|conditioning|moisturizing balm|all in one milk", title):
        return "Conditioner"
    # Davines NATURALTECH is the scalp-care line, so its "gel" is a scalp treatment, not a styler.
    if ptype == "naturaltech" or re.search(r"\boil\b|elixir|tonic|serum|ampoule|enhancer|superactive|sealer|toner|treatment", title):
        return "Treatment / Oil"
    if re.search(r"heat protect|detangler|spray|mist|mousse|\bgel\b|wax|paste|pomade|clay|texturi|hairspray|styler|curl", title):
        return "Styling & Finishing"
    for category in ["Shampoo", "Conditioner", "Treatment / Oil", "Styling & Finishing"]:
        if category in in_category:
            return category
    return "Styling & Finishing"


# ---------------------------------------------------------------- product page parsing


def json_ld_rating(soup: BeautifulSoup) -> tuple[float | None, int | None]:
    # A page can carry several Product blocks (Shopify's own plus the review app's); the review app's
    # block is the one with the real count, so keep the largest.
    best: tuple[float | None, int | None] = (None, None)
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        for item in data if isinstance(data, list) else [data]:
            rating = isinstance(item, dict) and item.get("aggregateRating")
            if rating and rating.get("ratingValue") not in (None, ""):
                count = int(rating.get("reviewCount") or rating.get("ratingCount") or 0)
                if best[1] is None or count > best[1]:
                    best = (round(float(rating["ratingValue"]), 2), count)
    return best


def regex_rating(page: str, product_id: int) -> tuple[float | None, int | None]:
    # judge.me badge of this product (pages also show badges of recommended products)
    judgeme = re.search(
        rf"data-id=['\"]{product_id}['\"][^>]*>\s*<div[^>]*data-average-rating=['\"]([\d.]+)['\"][^>]*data-number-of-reviews=['\"](\d+)",
        page,
    )
    if judgeme:
        return round(float(judgeme.group(1)), 2), int(judgeme.group(2))
    okendo = re.search(r'"reviewAverageValue"\s*:\s*"?([\d.]+)"?\s*,\s*"reviewCount"\s*:\s*(\d+)', page)
    if okendo:
        return round(float(okendo.group(1)), 2), int(okendo.group(2))
    return None, None


def parse_aromatica(soup: BeautifulSoup) -> dict:
    sections = {}
    for block in soup.select(".meta-collapsible-tab.accordion"):
        key = next((c for c in block.get("class", []) if c in {"description", "ingredients", "how-to-use"}), None)
        if key and key not in sections:
            heading = {"description": "Description", "ingredients": "Ingredients", "how-to-use": "How to Use"}[key]
            sections[key] = strip_heading(clean(block.get_text("\n")), heading)
    description = sections.get("description", "")
    benefits = ""
    match = re.search(r"(?is)key benefits?\s*:?\s*\n(.+?)(?:\n(?:key ingredients|how to use|ingredients)\b|$)", description)
    if match:
        benefits = match.group(1).strip()
    return {
        "product_description": description,
        "key_benefits": benefits,
        "ingredients": sections.get("ingredients", ""),
        "how_to_use": sections.get("how-to-use", ""),
    }


def parse_rahua(soup: BeautifulSoup) -> dict:
    sections = {}
    for header in soup.select(".product__accordion-header-wrapper"):
        heading = clean(header.get_text(" "))
        if heading in sections:
            continue
        box = header.parent
        text = clean(box.get_text("\n"))
        sections[heading] = strip_heading(text, heading)
    # Accordion boxes can nest the following accordions, so cut at the next heading.
    benefits = re.split(r"\n(?:Key Ingredients|Full ingredient list)\b", sections.get("Key Benefits", ""))[0].strip()
    how_to = ""
    heading = soup.find(["h2", "h3"], string=re.compile(r"^\s*How to use\s*$", re.I))
    if heading:
        column = heading.find_parent("div", class_="column-block") or heading.parent
        how_to = strip_heading(clean(column.get_text("\n")), "How to use")
    # "Product details" repeats the description once per size variant.
    description = "\n".join(dict.fromkeys(sections.get("Product details", "").split("\n")))
    return {
        "product_description": description,
        "key_benefits": benefits,
        "ingredients": sections.get("Full ingredient list", ""),
        "how_to_use": how_to,
    }


def parse_davines(soup: BeautifulSoup) -> dict:
    sections = {}
    for item in soup.select("div.faq-box__item"):
        title = item.select_one(".faq-box__item-title")
        if not title:
            continue
        heading = clean(title.get_text(" "))
        if heading not in sections:
            sections[heading] = strip_heading(clean(item.get_text("\n")), heading)
    benefits, _, about = sections.get("Benefits", "").partition("ABOUT THE PRODUCT")
    how_to = sections.get("How to use", "")
    how_to = re.sub(r"\n?watch the video\s*$", "", how_to, flags=re.I).strip()
    ingredients = re.sub(r"\n?Glossary\s*$", "", sections.get("Ingredients", "")).strip()
    return {
        "product_description": about.strip(),
        "key_benefits": benefits.strip(),
        "ingredients": ingredients,
        "how_to_use": how_to,
    }


PARSERS = {"aromatica": parse_aromatica, "rahua": parse_rahua, "davines": parse_davines}


def product_details(brand_key: str, page: str, product_id: int) -> dict:
    soup = BeautifulSoup(page, "html.parser")
    details = PARSERS[brand_key](soup)
    rating, count = regex_rating(page, product_id)
    if rating is None:
        rating, count = json_ld_rating(soup)
    details["rating"] = rating if count else None
    details["review_count"] = count or 0
    return details


# ---------------------------------------------------------------- images


def save_image(fetch: Fetcher, url: str, target: Path) -> bool:
    sized = url + ("&" if "?" in url else "?") + "width=1600"
    body = fetch.get(sized, binary=True, delay=0.2) or fetch.get(url, binary=True, delay=0.2)
    if not body:
        return False
    try:
        with Image.open(io.BytesIO(body)) as image:
            if image.mode in ("RGBA", "LA", "P"):
                image = image.convert("RGBA")
                canvas = Image.new("RGB", image.size, (255, 255, 255))
                canvas.paste(image, mask=image.split()[-1])
                image = canvas
            image = image.convert("RGB")
            image.thumbnail((IMAGE_MAX_PX, IMAGE_MAX_PX))
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target, "JPEG", quality=88, optimize=True)
        return True
    except OSError as exc:
        errors.append(f"IMAGE DECODE FAILED {url}: {exc}")
        return False


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


# ---------------------------------------------------------------- crawl one brand


def crawl_brand(brand_key: str, fetch: Fetcher) -> None:
    config = BRANDS[brand_key]
    host, brand = config["host"], config["brand"]
    out_dir = DATA_DIR / brand_key
    started = datetime.now(timezone.utc)
    errors.clear()
    print(f"\n=== {brand} ({host})")

    # 1. Gather every product across the category collections, remembering which collections list it.
    raw: dict[int, dict] = {}
    seen_in: dict[int, list[str]] = defaultdict(list)
    collection_counts = {}
    for handle in config["collections"]:
        items = collection_products(fetch, host, handle)
        collection_counts[handle] = len(items)
        for item in items:
            raw.setdefault(item["id"], item)
            seen_in[item["id"]].append(handle)
    print(f"  raw products: {len(raw)} from {len(config['collections'])} collections")

    # 2. Filter bundles, tools and non-hair items; set refills aside to merge into their base product.
    filtered: dict[str, list[str]] = defaultdict(list)
    kept: list[dict] = []
    refills: list[dict] = []
    for pid, item in raw.items():
        reason = exclusion_reason(item)
        title = clean(item["title"])
        if re.search(r"\brefill\b", title, re.I) and reason in (None, "Bundle/Set"):
            if not BUNDLE_RE.search(title):
                refills.append(item)
                continue
        if reason:
            filtered[reason].append(title)
        else:
            kept.append(item)

    # 3. Group size siblings ("... 400ml", "... 750ml", "... Refill 500ml") into one product.
    groups: dict[str, list[dict]] = {}
    for item in kept:
        groups.setdefault(name_key(base_name(item["title"])[0]), []).append(item)
    merged_refills = []
    for item in refills:
        key = name_key(base_name(item["title"])[0])
        if key in groups:
            groups[key].append(item)
            merged_refills.append(clean(item["title"]))
        else:
            filtered["Refill without base product"].append(clean(item["title"]))

    # 4. Build records.
    records, image_rows = [], []
    scraped_at = datetime.now(timezone.utc).isoformat()
    for key, members in groups.items():
        main = next((m for m in members if not re.search(r"refill", m["title"], re.I)), members[0])
        name, _ = base_name(main["title"])
        category = classify(brand_key, main, seen_in[main["id"]])
        variants = []
        for member in members:
            _, suffix = base_name(member["title"])
            for variant in member["variants"]:
                label = clean(variant["title"])
                if label.lower() == "default title":
                    label = suffix or "Standard"
                elif suffix.startswith("Refill"):
                    label = f"Refill - {label}"
                variants.append(
                    {
                        "size": label,
                        "price": float(variant["price"]),
                        "compare_at_price": float(variant["compare_at_price"]) if variant.get("compare_at_price") else None,
                        "available": bool(variant.get("available")),
                        "sku": variant.get("sku") or None,
                        "variant_id": variant["id"],
                        "shopify_product_id": member["id"],
                    }
                )
        sizes = list(dict.fromkeys(v["size"] for v in variants))
        first = next(v for v in variants if v["shopify_product_id"] == main["id"])
        price = first["price"]
        original = first["compare_at_price"] if first["compare_at_price"] and first["compare_at_price"] > price else None
        discount = round((1 - price / original) * 100, 1) if original else None

        url = f"https://{host}/products/{main['handle']}"
        page = fetch.text(url)
        if not page:
            errors.append(f"PRODUCT PAGE MISSING {name}: {url}")
        details = product_details(brand_key, page, main["id"]) if page else {}
        summary = html_text(main.get("body_html"))
        if summary.lower() == name.lower():
            summary = ""
        description = details.get("product_description") or ""
        if description.lower() == name.lower():
            description = ""
        if len(description) < 40 and len(summary) > len(description):
            description = summary
        # AROMATICA has no benefits section; its body_html is a short tagline summary instead.
        benefits = details.get("key_benefits") or (summary if summary and summary != description else description)

        folder = out_dir / "images" / CATEGORY_FOLDERS[category]
        slug = slugify(name)
        image_urls, local_paths = [], []
        for index, image in enumerate(main.get("images", [])[:MAX_IMAGES], start=1):
            src = image["src"]
            target = folder / f"{slug}_{index:02d}.jpg"
            ok = target.exists() or save_image(fetch, src, target)
            image_urls.append(src)
            if ok:
                local_paths.append(rel(target))
            else:
                errors.append(f"IMAGE FAILED {name}: {src}")
            image_rows.append(
                {
                    "product_id": main["id"],
                    "product_name": name,
                    "category": category,
                    "image_url": src,
                    "image_local_path": rel(target),
                    "image_index": index,
                    "download_status": "success" if ok else "failed",
                }
            )
        if not image_urls:
            errors.append(f"NO IMAGES {name}")

        source_handle = next(
            (h for h in seen_in[main["id"]] if config["collections"][h] == category), seen_in[main["id"]][0]
        )
        tags = sorted({t.strip().lower() for t in main.get("tags", []) if t.strip()})
        records.append(
            {
                "product_id": main["id"],
                "product_name": name,
                "brand": brand,
                "category": category,
                "categories": sorted({config["collections"][h] for h in seen_in[main["id"]]} | {category}),
                "product_url": url,
                "price": price,
                "currency": "USD",
                "original_price": original,
                "discount": discount,
                "product_description": description,
                "key_benefits": benefits,
                "ingredients": details.get("ingredients", ""),
                "how_to_use": details.get("how_to_use", ""),
                "size": first["size"],
                "available_sizes": sizes,
                "availability": any(v["available"] for v in variants),
                "rating": details.get("rating"),
                "review_count": details.get("review_count", 0),
                "image_url": image_urls[0] if image_urls else None,
                "image_urls": image_urls,
                "image_local_path": local_paths[0] if local_paths else None,
                "scraped_at": scraped_at,
                "source_url": f"https://{host}/collections/{source_handle}",
                "tags": tags,
                "variants": variants,
            }
        )
        print(f"  [{category[:14]:14}] {name}  ({len(sizes)} sizes, {len(local_paths)} images, rating={details.get('rating')})")

    records.sort(key=lambda r: (CATEGORIES.index(r["category"]), r["product_name"]))
    write_brand(out_dir, brand, records, image_rows)
    write_summary(out_dir, brand, host, started, raw, collection_counts, filtered, merged_refills, records, image_rows)
    (out_dir / "crawl_errors.log").write_text("\n".join(errors) + ("\n" if errors else ""), encoding="utf-8")


# ---------------------------------------------------------------- writers


def flat(record: dict) -> dict:
    row = {}
    for key, value in record.items():
        if key == "variants":
            row[key] = json.dumps(value, ensure_ascii=False) if value else ""
        elif isinstance(value, list):
            row[key] = "; ".join(str(v) for v in value)
        else:
            row[key] = value
    return row


def write_tables(out_dir: Path, records: list[dict], image_rows: list[dict], stem: str = "products") -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{stem}.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    columns = COLUMNS + (["variants"] if any("variants" in r for r in records) else [])
    frame = pd.DataFrame([flat(r) for r in records]).reindex(columns=columns)
    frame.to_csv(out_dir / f"{stem}.csv", index=False, encoding="utf-8-sig")
    excel = frame.copy()
    for column in excel.columns:
        excel[column] = excel[column].map(lambda v: v[:32000] if isinstance(v, str) else v)
    excel.to_excel(out_dir / f"{stem}.xlsx", index=False)
    with open(out_dir / "product_images.csv", "w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["product_id", "product_name", "category", "image_url", "image_local_path", "image_index", "download_status"],
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(image_rows)


def write_brand(out_dir: Path, brand: str, records: list[dict], image_rows: list[dict]) -> None:
    write_tables(out_dir, records, image_rows)
    print(f"  -> {len(records)} products written to {rel(out_dir)}")


def coverage(records: list[dict]) -> list[str]:
    lines = []
    for field in ["product_id", "product_name", "price", "currency", "product_description", "ingredients",
                  "how_to_use", "key_benefits", "size", "available_sizes", "rating", "review_count", "image_url",
                  "image_local_path"]:
        filled = sum(1 for r in records if r.get(field) not in (None, "", []))
        lines.append(f"  {field:26} {filled:3}/{len(records)} ({filled / max(1, len(records)) * 100:5.1f}%)")
    return lines


def write_summary(out_dir, brand, host, started, raw, collection_counts, filtered, merged_refills, records, image_rows):
    finished = datetime.now(timezone.utc)
    counts = Counter(r["category"] for r in records)
    ok = sum(1 for r in image_rows if r["download_status"] == "success")
    lines = [
        "=" * 70,
        f"{brand.upper()} HAIRCARE PRODUCT CRAWL SUMMARY",
        "=" * 70,
        f"Source:         https://{host} (Shopify, USD)",
        f"Crawl Date/Time: {finished.isoformat()}",
        f"Duration:       {finished - started}",
        "",
        "-" * 50,
        "COLLECTIONS CRAWLED",
        "-" * 50,
        *[f"  /collections/{h:32} {n:4} items -> {BRANDS_BY_NAME[brand]['collections'][h]}" for h, n in collection_counts.items()],
        "",
        "-" * 50,
        "CATEGORY BREAKDOWN",
        "-" * 50,
        *[f"  {c:28} {counts.get(c, 0):4}" for c in CATEGORIES],
        f"  {'TOTAL':28} {len(records):4}",
        "",
        "-" * 50,
        "PROCESSING STATISTICS",
        "-" * 50,
        f"Raw unique items fetched:          {len(raw)}",
        *[f"{reason + ' removed:':35}{len(names)}" for reason, names in sorted(filtered.items())],
        f"Refills merged as size variants:   {len(merged_refills)}",
        f"Final unique products:             {len(records)}",
    ]
    for reason, names in sorted(filtered.items()):
        lines += ["", "-" * 50, f"{reason.upper()} FILTERED OUT", "-" * 50, *[f"  - {n}" for n in sorted(names)]]
    if merged_refills:
        lines += ["", "-" * 50, "REFILLS MERGED INTO BASE PRODUCT (as a size)", "-" * 50, *[f"  - {n}" for n in sorted(merged_refills)]]
    lines += [
        "",
        "-" * 50,
        "IMAGE DOWNLOAD STATISTICS",
        "-" * 50,
        f"Images downloaded successfully:    {ok}",
        f"Images failed:                     {len(image_rows) - ok}",
        "",
        "-" * 50,
        "DATA COVERAGE",
        "-" * 50,
        *coverage(records),
        "",
        f"Errors logged: {len(errors)} (see crawl_errors.log)",
        "=" * 70,
        "END OF REPORT",
        "=" * 70,
    ]
    (out_dir / "crawl_summary.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


BRANDS_BY_NAME = {config["brand"]: config for config in BRANDS.values()}


# ---------------------------------------------------------------- combined catalog


def build_catalog() -> None:
    records, image_rows = [], []
    brand_dirs = sorted(p for p in DATA_DIR.iterdir() if p.is_dir() and (p / "products.json").exists() and p != CATALOG_DIR)
    for brand_dir in brand_dirs:
        brand_records = json.loads((brand_dir / "products.json").read_text(encoding="utf-8"))
        for record in brand_records:
            record.setdefault("variants", None)
        records += brand_records
        with open(brand_dir / "product_images.csv", encoding="utf-8-sig") as handle:
            for row in csv.DictReader(handle):
                row["brand"] = next((r["brand"] for r in brand_records if str(r["product_id"]) == row["product_id"]), "")
                image_rows.append(row)
    records.sort(key=lambda r: (r["brand"], CATEGORIES.index(r["category"]), r["product_name"]))
    write_tables(CATALOG_DIR, records, image_rows)
    # product_images.csv in the catalog carries the brand column too
    with open(CATALOG_DIR / "product_images.csv", "w", newline="", encoding="utf-8-sig") as handle:
        fields = ["brand", "product_id", "product_name", "category", "image_url", "image_local_path", "image_index", "download_status"]
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(image_rows)

    matrix = defaultdict(Counter)
    for r in records:
        matrix[r["brand"]][r["category"]] += 1
    prices = defaultdict(list)
    for r in records:
        prices[r["brand"]].append(r["price"])
    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_products": len(records),
        "total_images": sum(1 for r in image_rows if r["download_status"] == "success"),
        "currency": "USD",
        "categories": CATEGORIES,
        "brands": {
            brand: {
                "folder": next(d.name for d in brand_dirs if json.loads((d / "products.json").read_text(encoding="utf-8"))[0]["brand"] == brand),
                "products": sum(matrix[brand].values()),
                "by_category": {c: matrix[brand].get(c, 0) for c in CATEGORIES},
                "price_min": min(prices[brand]),
                "price_max": max(prices[brand]),
                "price_median": float(pd.Series(prices[brand]).median()),
            }
            for brand in sorted(matrix)
        },
        "by_category": {c: sum(matrix[b].get(c, 0) for b in matrix) for c in CATEGORIES},
    }
    (CATALOG_DIR / "catalog_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nCatalog: {len(records)} products from {len(brand_dirs)} brands -> {rel(CATALOG_DIR)}")
    header = f"{'Brand':12}" + "".join(f"{c[:11]:>13}" for c in CATEGORIES) + f"{'Total':>8}"
    print(header)
    for brand in sorted(matrix):
        print(f"{brand:12}" + "".join(f"{matrix[brand].get(c, 0):>13}" for c in CATEGORIES) + f"{sum(matrix[brand].values()):>8}")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--brand", choices=sorted(BRANDS), action="append", help="brand(s) to crawl (default: all)")
    parser.add_argument("--catalog-only", action="store_true", help="only rebuild data/store/product_data/catalog")
    parser.add_argument("--cache", type=Path, default=Path(tempfile.gettempdir()) / "haircare_crawl_cache")
    args = parser.parse_args()
    if not args.catalog_only:
        fetch = Fetcher(args.cache)
        for brand_key in args.brand or list(BRANDS):
            crawl_brand(brand_key, fetch)
    build_catalog()


if __name__ == "__main__":
    main()

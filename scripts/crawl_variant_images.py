"""Download the packshot of every size of the storefront products, so the product page can switch images per size.

The brand stores are Shopify: /products.json lists every product with its variants and the image linked to each
variant. AROMATICA sells each size as a separate listing (merged into one product by crawl_brand_products.py), so
there the packshot of a size is the main image of that listing.

Inputs:
  data/store/product_data/catalog/products.json       - crawled products (variant ids, listing ids)
  public/assets/data/haircare-db.json                 - storefront products and the sizes they sell
Outputs:
  data/store/product_data/<brand>/images/variants/<product>_<size>.jpg
  data/store/product_data/variant_images.json          - product_id -> {size label: {source_url, local_path}}

Run from the repository root, then rebuild the storefront:

    python scripts/crawl_variant_images.py
    python scripts/build_mock_db.py
"""

from __future__ import annotations

import io
import json
import re
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_mock_db import brand_variants, slugify  # noqa: E402
from crawl_brand_products import Fetcher  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "store" / "product_data"
OUT_MAP = DATA_DIR / "variant_images.json"
HOSTS = {"Moroccanoil": "www.moroccanoil.com", "Davines": "us.davines.com", "Rahua": "www.rahua.com", "AROMATICA": "global.aromatica.co"}


def store_products(fetch: Fetcher, host: str) -> dict[str, dict]:
    products, page = {}, 1
    while True:
        raw = fetch.text(f"https://{host}/products.json?limit=250&page={page}")
        batch = json.loads(raw)["products"] if raw.startswith("{") else []
        products.update({str(p["id"]): p for p in batch})
        if len(batch) < 250:
            return products
        page += 1


def variant_image(product: dict, variant: dict) -> str | None:
    if variant.get("featured_image"):
        return variant["featured_image"]["src"]
    return next((image["src"] for image in product.get("images", []) if variant["id"] in image.get("variant_ids", [])), None)


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9.]+", " ", text.lower()).strip()


def moroccanoil_variant(product: dict, label: str, volume: str) -> dict | None:
    """Moroccanoil titles its variants "Travel 2.5 fl oz", "Half Liter 16.9 fl oz", "Liter 33.8 fl oz"."""
    wanted = norm(label.replace("-", " "))
    for variant in product["variants"]:
        title = norm(variant["title"])
        if title.startswith(wanted) and not (wanted == "liter" and title.startswith("half")):
            return variant
    return next((v for v in product["variants"] if volume and norm(volume) in norm(v["title"])), None)


def main() -> None:
    fetch = Fetcher(Path(tempfile.gettempdir()) / "haircare_crawl_cache")
    catalog = {str(c["product_id"]): c for c in json.load(open(DATA_DIR / "catalog" / "products.json", encoding="utf-8"))}
    storefront = json.load(open(ROOT / "public" / "assets" / "data" / "haircare-db.json", encoding="utf-8"))["products"]
    shops = {brand: store_products(fetch, host) for brand, host in HOSTS.items()}
    folders = {"Moroccanoil": "moroccanoil", "Davines": "davines", "Rahua": "rahua", "AROMATICA": "aromatica"}

    mapping: dict[str, dict] = {}
    for product in storefront:
        if len(product["variants"]) < 2:
            continue
        item, shop = catalog[product["id"]], shops[product["brand"]]
        urls: dict[str, str] = {}
        if product["brand"] == "Moroccanoil":
            listing = shop.get(product["id"])
            for size in product["variants"]:
                variant = moroccanoil_variant(listing, size["sizeLabel"], size["volume"]) if listing else None
                if variant and variant_image(listing, variant):
                    urls[size["sizeLabel"]] = variant_image(listing, variant)
        else:
            # brand_variants() chose one crawled variant per size label; find that variant (and its listing) again.
            chosen = {label: size for label, size, _, _ in brand_variants(item)}
            for size in product["variants"]:
                crawled = next((v for v in item.get("variants") or [] if v["size"] == chosen.get(size["sizeLabel"])), None)
                listing = shop.get(str(crawled.get("shopify_product_id") or product["id"])) if crawled else None
                if not listing:
                    continue
                variant = next((v for v in listing["variants"] if str(v["id"]) == str(crawled.get("variant_id"))), None)
                url = variant_image(listing, variant) if variant else None
                if not url and str(listing["id"]) != product["id"] and listing["images"]:
                    url = listing["images"][0]["src"]  # a separate listing for this size: its main image
                if url:
                    urls[size["sizeLabel"]] = url
        # Only worth switching when the sizes really look different.
        if len({u.split("?")[0] for u in urls.values()}) < 2:
            continue
        entry = {}
        for label, url in urls.items():
            target = DATA_DIR / folders[product["brand"]] / "images" / "variants" / f"{slugify(product['name']).replace('-', '_')}_{label.lower()}.jpg"
            if not target.exists():
                body = fetch.get(url.split("?")[0] if url.startswith("http") else "https:" + url.split("?")[0], binary=True)
                if not body:
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                with Image.open(io.BytesIO(body)) as image:
                    if image.mode in ("RGBA", "LA", "P"):
                        image = image.convert("RGBA")
                        flat = Image.new("RGB", image.size, (255, 255, 255))
                        flat.paste(image, mask=image.getchannel("A"))
                        image = flat
                    image.convert("RGB").save(target, "JPEG", quality=92)
            entry[label] = {"source_url": url, "local_path": target.relative_to(ROOT).as_posix()}
        if len(entry) > 1:
            mapping[product["id"]] = entry
    OUT_MAP.write_text(json.dumps(mapping, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(mapping)} products with a packshot per size -> {OUT_MAP.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

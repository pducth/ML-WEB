"""Crawl brand media (product demo videos, model / texture / before-after shots, campaign banners).

Complements the product crawl in data/store/product_data/<brand> with the visual assets the storefront
needs for hover previews, hero banners and hair-result imagery. Supported brands: Moroccanoil,
AROMATICA, Rahua, Davines (all Shopify stores).

Inputs (read-only):
  data/store/product_data/<brand>/products.json  - crawled products (product_id, product_url, category, image_urls)

Sources crawled per brand:
  https://<store>/products/<handle>.js      - Shopify product media (gallery images + MP4 videos)
  https://<store>/products/<handle>         - PDP sections (embedded videos, texture / ingredient /
                                              before-after images, ingredient icons)
  https://<store>/products.json             - every product image of the store, so recommendation
                                              carousels and product cards are not taken as brand media
  homepage, haircare collections and pages  - campaign banners and campaign videos

Outputs (data/store/brand_media/<brand>/):
  videos/<category>/<slug>_NN.mp4         - product demo videos (720p when available)
  videos/<category>/<slug>_NN_poster.jpg  - poster frame for each video
  product_visuals/<role>/<slug>_NN.<ext>  - non-packshot images grouped by role
                                            (before_after, model, how_to, texture/swatch, ingredient, ...)
  ingredient_icons/<name>.png             - ingredient icons shown on product pages
  campaign/images/<page>/<file>           - hero / banner / campaign images (non-hair lines excluded)
  campaign/videos/<page>/<file>.mp4       - campaign videos; videos embedded on many product pages
                                            are brand videos and go to campaign/videos/product_pages
  brand_media_manifest.json / .csv        - one row per asset, linked to product_id when known
  crawl_media_errors.log
and data/store/brand_media/brand_media_manifest.csv - all brands combined (brand column added).

Re-running skips files already on disk. Run from the repository root:

    python scripts/crawl_brand_media.py --brand aromatica --brand rahua --brand davines
    python scripts/crawl_brand_media.py --brand moroccanoil --video-quality 1080p --skip-campaign
    python scripts/crawl_brand_media.py --combine-only
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import subprocess
import tempfile
import time
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PRODUCT_DATA = ROOT / "data" / "store" / "product_data"
MEDIA_ROOT = ROOT / "data" / "store" / "brand_media"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
REQUEST_DELAY = 1.5
IMAGE_WIDTH = 2000
MAX_VIDEO_BYTES = 80 * 1024 * 1024
# A video embedded on this many product pages is a brand video, not a product demo.
SHARED_VIDEO_PAGES = 3

CATEGORY_DIRS = {
    "Shampoo": "shampoo",
    "Conditioner": "conditioner",
    "Hair Masks": "masks",
    "Treatment / Oil": "treatment_oil",
    "Dry Shampoo": "dry_shampoo",
    "Styling & Finishing": "styling",
}

SKIP_KEYWORDS = ("logo", "icon", "payment", "favicon", "badge_", "placeholder", "spinner", "track.png")

# ---------------------------------------------------------------------------------- Moroccanoil rules
# Moroccanoil names its files descriptively, so roles come from the file name alone.

MOROCCANOIL_CAMPAIGN_PAGES = [
    "/",
    "/collections/shop-all-haircare",
    "/collections/shampoos",
    "/collections/conditioners",
    "/collections/masks",
    "/collections/color-depositing-masks",
    "/collections/treatment",
    "/collections/styling-finishing",
    "/collections/style",
    "/collections/finish",
    "/collections/hairsprays",
    "/collections/protectants",
    "/collections/dry-shampoo",
    "/collections/hydration",
    "/collections/repair",
    "/collections/volume",
    "/collections/frizz-control",
    "/collections/frizz-control-collection",
    "/collections/curl",
    "/collections/color-care",
    "/collections/scalp-balance",
    "/collections/texture",
    "/collections/fine",
    "/collections/medium",
    "/collections/thick-coarse",
    "/collections/wavy-curly",
    "/collections/best-sellers",
    "/collections/new-arrivals",
    "/pages/argan-oil",
    "/pages/our-story",
    "/pages/our-products",
    "/pages/overnight-leave-in-mask",
    "/pages/proarginine-arganid%C2%AE-system",
    "/pages/hair-quiz",
]

# Campaign assets for non-haircare lines (fragrance, body, lips, tools, gifting) are not used by the app.
MOROCCANOIL_NON_HAIR = (
    "fragrance", "edp", "parfum", "lip_balm", "lip-balm", "lipbalm", "body", "hand_cream", "handcream",
    "shower", "candle", "shimmering", "dahlia", "ldj", "lumiere", "flanker", "originale", "brush",
    "dryer", "tools", "comb", "holiday", "gift", "eblast", "bundle", "kits", "spa_du_maroc",
)

# Order matters: the first matching role wins.
ROLE_RULES = [
    ("before_after", r"(^|[_\-.])b_?as?([_\-.]|$)|before|_ba_"),
    ("how_to", r"how_?-?to|routine|pro-tips|usage"),
    ("model", r"model|aryna|lifestyle|socialshoot|impressions|new_?look|hero"),
    ("ingredient", r"ingredient"),
    ("in_hand", r"20\d\d-\d\d_\d{4}"),
    ("swatch", r"swatch|_\d{4}_1300x1660|layer|_full_screen|_full_\d|bulk_\d|_\d{4,5}_v\d"),
    ("infographic", r"claim|benefit|infographic|call_?-?out|badge|size_?comparison|bulk|shineinfo|find_treatment|bdb"),
    ("collection", r"collection|duo"),
]
PACKSHOT_RE = re.compile(r"^\d+_[A-Z]|packshot|_v\d+(_\d)?\.(jpg|png|webp)$|crop|srgb190|_\d+ml", re.IGNORECASE)

# ---------------------------------------------------------------------------------- other brands
# AROMATICA, Rahua and Davines use hashed or SKU file names, so roles come from alt text + file name.

DESCRIPTIVE_ROLE_RULES = [
    ("before_after", r"before|after|b&a|[_\-]ba[_\-.]|result"),
    ("how_to", r"how.?to|lather|applying|apply |spraying|brushing|combing|massag|step|routine|usage|in use"),
    ("texture", r"texture|swatch|swipe|drops? of|droplet|smear|cream on|consistency|foam"),
    ("ingredient", r"ingredient|extract|botanical|leaf|seed|flower|fruit|spices?\b|star anise"),
    ("in_hand", r"holding|in.?hand|hands?\b"),
    ("model", r"model|woman|women|\bman\b|person|people|girl|smiling|portrait"),
    # Davines "situational" shots are styled product scenes without people.
    ("lifestyle", r"lifestyle|situational|hero|styled|scene"),
    ("infographic", r"detail image|benefit|claim|infographic|clinical|%|award|comparison|which-duo|chart|how it works"),
    ("collection", r"\bduo\b|range|groupage|collection|family|bottles|routine set|lineup"),
]
DESCRIPTIVE_PACKSHOT_RE = re.compile(r"packshot|_pdp_1\b|^a_|pouch|refill|^davines-\d{5}", re.IGNORECASE)

# Page sections that hold someone else's content (menus, carousels of other products, reviews).
NOISE_SECTION_RE = re.compile(
    r"header|footer|menu|drawer|cart|recommend|related|upsell|cross-sell|complementary|you-may|"
    r"jdgm|judge|okendo|oke-|review|yotpo|loox|klaviyo|popup|newsletter|announcement",
    re.IGNORECASE,
)
REVIEW_HOSTS = ("judgeme.com", "okendo.io", "yotpo", "loox.io", "stamped")


@dataclass
class Brand:
    key: str
    name: str
    base_url: str
    campaign_pages: list[str]
    non_hair: tuple[str, ...] = ()
    descriptive: bool = True        # hashed / SKU file names (False = Moroccanoil file-name rules)
    alt_roles: bool = True          # alt text describes the image (Davines repeats one SEO text on all)
    pdp_media: bool = True          # also harvest images / videos embedded in the product page
    ingredient_section: str | None = None   # CSS selector of the PDP block holding ingredient icons
    cdn_prefix: str = ""            # https://cdn.shopify.com/s/files/1/xxxx/xxxx/xxxx/ (set at runtime)
    out_dir: Path = field(init=False)

    def __post_init__(self) -> None:
        self.out_dir = MEDIA_ROOT / self.key

    @property
    def domain(self) -> str:
        return urlparse(self.base_url).netloc.removeprefix("www.")


BRANDS = {
    "moroccanoil": Brand(
        key="moroccanoil",
        name="Moroccanoil",
        base_url="https://www.moroccanoil.com",
        campaign_pages=MOROCCANOIL_CAMPAIGN_PAGES,
        non_hair=MOROCCANOIL_NON_HAIR,
        descriptive=False,
        pdp_media=False,
    ),
    "aromatica": Brand(
        key="aromatica",
        name="AROMATICA",
        base_url="https://global.aromatica.co",
        # The homepage and shop-all pages are mostly skin and body care, so only haircare pages are used.
        campaign_pages=[
            "/collections/hair-care",
            "/collections/shampoo",
            "/collections/conditioner",
            "/collections/hair-treatment",
            "/collections/scalp-treatments",
            "/collections/hair-mask-oil",
            "/collections/dry-shampoo",
            "/collections/rosemary-hair-routine",
            "/pages/rosemary",
            "/pages/about-us",
        ],
        non_hair=("body", "skin", "face", "facial", "hand", "lotion", "cleanser", "feminine", "deodorant",
                  "dish", "home", "aloe", "toner", "cream", "essence", "frankincense", "orange", "neroli",
                  "serene", "tea-tree-spot", "gift", "holiday", "set_"),
    ),
    "rahua": Brand(
        key="rahua",
        name="Rahua",
        base_url="https://www.rahua.com",
        campaign_pages=[
            "/",
            "/collections/hair",
            "/collections/shampoo",
            "/collections/conditioner",
            "/collections/hair-treatments-1",
            "/collections/hair-masks-for-your-strands",
            "/collections/oils",
            "/collections/stylers",
            "/collections/balance-scalp",
            "/collections/color-full-hair-collection",
            "/collections/curl-edit",
            "/pages/about-us",
            "/pages/our-story",
            "/pages/ingredients",
        ],
        non_hair=("body", "skin", "gift", "holiday", "giftcard", "candle"),
        ingredient_section="section.product-ingredients",
    ),
    "davines": Brand(
        key="davines",
        name="Davines",
        base_url="https://us.davines.com",
        campaign_pages=[
            "/",
            "/collections/shampoo",
            "/collections/conditioner",
            "/collections/hair-masks",
            "/collections/hair-treatments",
            "/collections/hair-serums-and-oils",
            "/collections/styling-products",
            "/collections/dry-shampoo",
            "/collections/essential-haircare-love-curl",
            "/collections/essential-haircare-minu",
            "/collections/essential-haircare-nounou",
            "/collections/essential-haircare-momo",
            "/collections/curly-hair",
            "/collections/damaged-hair",
            "/collections/hair-loss",
            "/pages/about-us",
            "/pages/sustainability",
        ],
        non_hair=("body", "skin", "hand", "gift", "holiday", "box", "salon", "nav_menu", "collab", "circular",
                  "once_forever", "for_a_good_life", "pasta"),
        alt_roles=False,
    ),
}

MEDIA_URL_RE = re.compile(
    r"""(?:https?:)?//[^\s"'(),\\]+?\.(?:mp4|webm|gif|jpe?g|png|webp)(?:\?[^\s"'(),\\]*)?""",
    re.IGNORECASE,
)
VIDEO_URL_RE = re.compile(r"""(?:https?:)?//[^\s"'<>()\\]+?\.mp4""", re.IGNORECASE)

session = requests.Session()
session.headers.update(HEADERS)
error_lines: list[str] = []
cache_dir: Path | None = None


def log_error(message: str) -> None:
    print(f"  [error] {message}")
    error_lines.append(f"{datetime.now().isoformat(timespec='seconds')} {message}")


def fetch(url: str, *, retries: int = 4) -> str | None:
    """GET a store page with curl (stores answer python-requests with 429); returns the body text."""
    cached = cache_dir / hashlib.md5(url.encode()).hexdigest() if cache_dir else None
    if cached and cached.exists():
        return cached.read_text(encoding="utf-8", errors="replace")
    for attempt in range(1, retries + 1):
        result = subprocess.run(
            ["curl", "-sL", "--compressed", "--max-time", "60", "-A", HEADERS["User-Agent"],
             "-H", f"Accept-Language: {HEADERS['Accept-Language']}",
             "-D", "-", "-o", "-", "-w", "\n%{http_code}", url],
            capture_output=True,
        )
        output = result.stdout.decode("utf-8", errors="replace")
        body, _, status = output.rpartition("\n")
        status = int(status) if status.isdigit() else 0
        # -D - prints the headers of every hop before the body; keep only the final body.
        headers, body = split_headers(body)
        if status == 404:
            return None
        if status == 429 and attempt < retries:
            # Honour the store's rate limit instead of hammering it.
            match = re.search(r"(?im)^retry-after:\s*(\d+)", headers)
            wait = int(match.group(1)) if match else 60
            print(f"  [rate limited] waiting {wait}s")
            time.sleep(wait)
            continue
        if status == 200:
            if cached:
                cached.parent.mkdir(parents=True, exist_ok=True)
                cached.write_text(body, encoding="utf-8")
            time.sleep(REQUEST_DELAY)
            return body
        if attempt == retries:
            log_error(f"GET {url} failed: HTTP {status} {result.stderr.decode(errors='replace').strip()}")
            return None
        time.sleep(2 * attempt)
    return None


def split_headers(raw: str) -> tuple[str, str]:
    headers = ""
    while raw.startswith("HTTP/"):
        block, sep, rest = raw.partition("\r\n\r\n")
        if not sep:
            break
        headers, raw = block, rest
    return headers, raw


def to_cdn(brand: Brand, url: str) -> str:
    """Serve files from cdn.shopify.com rather than the rate-limited store domain."""
    url = ("https:" + url) if url.startswith("//") else url
    store = rf"https?://(?:www\.)?{re.escape(brand.domain)}/cdn/shop/"
    url = re.sub(store + "videos/", "https://cdn.shopify.com/videos/", url)
    return re.sub(store, brand.cdn_prefix, url) if brand.cdn_prefix else url


def download(url: str, dest: Path, max_bytes: int | None = None) -> bool:
    if dest.exists() and dest.stat().st_size > 0:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    for attempt in range(1, 4):
        try:
            with session.get(url, timeout=120, stream=True) as response:
                if response.status_code in (403, 404):
                    return False
                response.raise_for_status()
                size = int(response.headers.get("Content-Length") or 0)
                if max_bytes and size > max_bytes:
                    log_error(f"skipped {url}: {size / 1e6:.0f} MB is over the {max_bytes / 1e6:.0f} MB limit")
                    return False
                with open(tmp, "wb") as fh:
                    for chunk in response.iter_content(chunk_size=1 << 16):
                        fh.write(chunk)
            tmp.replace(dest)
            time.sleep(0.3)
            return True
        except requests.RequestException as exc:
            if attempt == 3:
                log_error(f"download {url} failed: {exc}")
            time.sleep(2 * attempt)
    tmp.unlink(missing_ok=True)
    return False


def slugify(text: str) -> str:
    text = re.sub(r"[™®©]", "", text)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = text.lower().replace("&", "and")
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


def file_name(url: str) -> str:
    return urlparse(url).path.rsplit("/", 1)[-1]


def canonical_image_url(brand: Brand, url: str) -> str:
    """Strip Shopify size suffixes / query so one source image maps to one URL, then request a large width."""
    url = ("https:" + url) if url.startswith("//") else url
    url = url.split("?", 1)[0]
    url = re.sub(r"_(\d+x\d*|\d*x\d+|small|medium|large|grande|compact|pico|icon|thumb|master)(\.\w+)$", r"\2", url)
    return to_cdn(brand, url)


def image_key(url: str) -> str:
    """File name without Shopify's upload-uuid suffix, so re-uploads of one image compare equal."""
    name = file_name(url).lower()
    return re.sub(r"_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.\w+$)", "", name)


def classify_role(name: str) -> str:
    stem = name.rsplit(".", 1)[0].lower()
    for role, pattern in ROLE_RULES:
        if re.search(pattern, stem):
            return role
    if PACKSHOT_RE.search(name):
        return "packshot"
    return "other"


def classify_descriptive(name: str, alt: str, product_name: str) -> str:
    """Role for brands with hashed / SKU file names: alt text and file name together."""
    # Rahua appends "|variant:33-oz" to alts of size-variant images.
    alt = re.sub(r"\s+", " ", (alt or "").split("|", 1)[0]).strip()
    stem = name.rsplit(".", 1)[0].lower()
    text = f"{alt.lower()} {stem} {stem.replace('_', ' ').replace('-', ' ')}"
    for role, pattern in DESCRIPTIVE_ROLE_RULES:
        if re.search(pattern, text):
            return role
    if DESCRIPTIVE_PACKSHOT_RE.search(name):
        return "packshot"
    # An alt that only repeats the product name (AROMATICA, Davines) marks another packshot or size.
    bare = re.sub(r"(?i)aromatica|davines|rahua|\d+\s?(ml|g|oz)|[^a-z ]", " ", alt.lower()).split()
    if not alt or set(bare) <= set(slugify(product_name).split("_")) | {"the", "and"}:
        return "packshot"
    return "other"


def image_size(path: Path) -> tuple[int | None, int | None]:
    try:
        with Image.open(path) as img:
            return img.size
    except Exception:
        return None, None


def pick_video_source(sources: list[dict], quality: str) -> dict | None:
    mp4 = [s for s in sources if s.get("format") == "mp4" or s.get("url", "").endswith(".mp4")]
    if not mp4:
        return None
    exact = [s for s in mp4 if quality in s.get("url", "")]
    if exact:
        return exact[0]
    # Fall back to the closest rendition by height.
    target = int(quality.rstrip("p"))
    return min(mp4, key=lambda s: abs((s.get("height") or 0) - target))


def video_id(url: str) -> str:
    """Shopify video id: the folder of /videos/c/vp/<id>/<id>.HD-...mp4 or the name of /videos/c/o/v/<id>.mp4."""
    match = re.search(r"/videos/c/vp/([0-9a-f]{32})/", url) or re.search(r"/([0-9a-f]{32})\.mp4", url)
    return match.group(1) if match else file_name(url).split(".", 1)[0]


def video_candidates(url: str, quality: str) -> list[str]:
    url = url.split("?", 1)[0]
    match = re.search(r"(https://cdn\.shopify\.com/videos/c/vp/([0-9a-f]{32})/)", url)
    if match:
        # The HLS master playlist names every rendition, e.g. "<id>.HD-720p.3.0Mbps.hls.60841409_.m3u8",
        # whose MP4 twin is "<id>.HD-720p-3.0Mbps-60841409.mp4". Bitrates differ per video, so read them.
        folder, vid = match.groups()
        try:
            playlist = session.get(f"{folder}{vid}.m3u8", timeout=30).text
        except requests.RequestException:
            playlist = ""
        renditions = {
            int(height): f"{folder}{vid}.{kind}-{height}p-{rate}Mbps-{num}.mp4"
            for kind, height, rate, num in re.findall(r"(HD|SD)-(\d+)p\.([\d.]+)Mbps\.hls\.(\d+)_", playlist)
        }
        if renditions:
            target = int(quality.rstrip("p"))
            ordered = sorted(renditions, key=lambda h: (abs(h - target), -h))
            return [renditions[h] for h in ordered] + [url]
    # Fallback guess: renditions share the trailing numeric id: <id>.HD-1080p-7.2Mbps-NNN.mp4 -> <id>.HD-720p-4.5Mbps-NNN.mp4
    candidates = [url]
    if quality == "720p":
        candidates.insert(0, re.sub(r"HD-1080p-[\d.]+Mbps", "HD-720p-4.5Mbps", url))
    elif quality == "480p":
        candidates.insert(0, re.sub(r"HD-1080p-[\d.]+Mbps", "SD-480p-1.5Mbps", url))
    return list(dict.fromkeys(candidates))


def poster_url(brand: Brand, vid: str) -> str:
    return f"{brand.base_url}/cdn/shop/files/preview_images/{vid}.thumbnail.0000000000.jpg?width=1280"


def prune(soup: BeautifulSoup) -> BeautifulSoup:
    """Drop menus, footers, review widgets and carousels of other products from a parsed page."""
    for tag in soup(["header", "nav", "footer", "script", "style", "noscript", "template"]):
        tag.decompose()
    for tag in soup.find_all(True):
        if getattr(tag, "decomposed", False):
            continue
        attrs = getattr(tag, "attrs", None)
        if not attrs:
            continue
        marker = " ".join([str(attrs.get("id", ""))] + list(attrs.get("class", [])))
        if marker.strip() and NOISE_SECTION_RE.search(marker) and tag.name not in ("html", "body", "main"):
            tag.decompose()
    return soup


def img_src(tag) -> str:
    src = tag.get("src") or tag.get("data-src") or ""
    if not src and tag.get("srcset"):
        src = tag["srcset"].split(",")[0].split()[0]
    return src


# --------------------------------------------------------------------------------------------- products

@dataclass
class Context:
    brand: Brand
    args: argparse.Namespace
    manifest: list[dict] = field(default_factory=list)
    seen: set[str] = field(default_factory=set)
    store_images: dict[str, set[int]] = field(default_factory=dict)   # image_key -> product ids using it
    pdp_videos: dict[str, dict] = field(default_factory=dict)          # video id -> {url, products}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def compact_png(path: Path) -> Path:
    """Re-encode an opaque PNG photo as JPEG (Rahua serves 3-15 MB PNG photos); keep real transparency."""
    jpg = path.with_suffix(".jpg")
    if jpg.exists() and jpg != path:
        path.unlink(missing_ok=True)
        return jpg
    if path.suffix.lower() != ".png" or not path.exists() or path.stat().st_size < 400_000:
        return path
    with Image.open(path) as img:
        if img.mode in ("RGBA", "LA", "P"):
            rgba = img.convert("RGBA")
            alpha = rgba.getchannel("A").histogram()
            # Photos often carry a few transparent edge pixels; only real cut-outs stay PNG.
            if sum(alpha[:250]) > 0.05 * rgba.width * rgba.height:
                return path
            img = Image.new("RGB", rgba.size, (255, 255, 255))
            img.paste(rgba, mask=rgba.getchannel("A"))
        img.convert("RGB").save(jpg, "JPEG", quality=85, optimize=True)
    path.unlink()
    return jpg


def add_image(ctx: Context, base_row: dict, url: str, role: str, dest: Path, source_page: str, alt: str = "") -> None:
    if dest.with_suffix(".jpg").exists():
        dest = dest.with_suffix(".jpg")
    ok = download(f"{url}?width={IMAGE_WIDTH}", dest) or download(url, dest)
    if ok and ctx.brand.descriptive:
        dest = compact_png(dest)
    width, height = image_size(dest) if ok else (None, None)
    ctx.manifest.append({
        **base_row,
        "asset_type": "image",
        "role": role,
        "source_page": source_page,
        "source_url": url,
        "source_file": file_name(url),
        "alt_text": alt,
        "local_path": rel(dest),
        "width": width,
        "height": height,
        "file_size": dest.stat().st_size if ok else None,
        "status": "success" if ok else "failed",
    })


def add_video(ctx: Context, base_row: dict, candidates: list[str], dest: Path, poster: str | None,
              source_page: str, role: str, width=None, height=None, duration=None) -> None:
    used = next((c for c in candidates if download(c, dest, MAX_VIDEO_BYTES)), None)
    poster_path = dest.with_name(dest.stem + "_poster.jpg")
    if poster:
        download(poster, poster_path)
    ctx.manifest.append({
        **base_row,
        "asset_type": "video",
        "role": role,
        "source_page": source_page,
        "source_url": used or candidates[-1],
        "local_path": rel(dest),
        "poster_path": rel(poster_path) if poster_path.exists() else "",
        "width": width,
        "height": height,
        "duration_s": duration,
        "file_size": dest.stat().st_size if used else None,
        "status": "success" if used else "failed",
    })


def load_store_images(ctx: Context) -> None:
    """Map every product image of the store to the products using it (sets and bundles included)."""
    page = 1
    while True:
        body = fetch(f"{ctx.brand.base_url}/products.json?limit=250&page={page}")
        products = json.loads(body).get("products", []) if body else []
        for product in products:
            for image in product.get("images", []):
                ctx.store_images.setdefault(image_key(image["src"]), set()).add(product["id"])
        if len(products) < 250:
            break
        page += 1
    print(f"  store images indexed: {len(ctx.store_images)}")


def crawl_products(ctx: Context, products: list[dict]) -> None:
    brand, args = ctx.brand, ctx.args
    for index, product in enumerate(products, 1):
        handle = product["product_url"].rstrip("/").rsplit("/", 1)[-1]
        slug = slugify(product["product_name"])
        category_dir = CATEGORY_DIRS.get(product["category"], slugify(product["category"]))
        base_row = {
            "brand": brand.name,
            "product_id": product["product_id"],
            "product_name": product["product_name"],
            "category": product["category"],
        }
        print(f"[{index}/{len(products)}] {product['product_name']}")

        body = fetch(f"{brand.base_url}/products/{handle}.js")
        media = json.loads(body).get("media", []) if body else []
        if not body:
            log_error(f"no product JSON for {handle}")

        video_no = 0
        visual_counts: dict[str, int] = {}
        first_image = True
        for item in media:
            if item.get("media_type") == "video":
                source = pick_video_source(item.get("sources", []), args.video_quality)
                if not source or source["url"] in ctx.seen:
                    continue
                ctx.seen.add(source["url"])
                ctx.seen.add(video_id(source["url"]))
                video_no += 1
                dest = brand.out_dir / "videos" / category_dir / f"{slug}_{video_no:02d}.mp4"
                poster = (item.get("preview_image") or {}).get("src")
                add_video(
                    ctx, base_row, [source["url"]], dest,
                    canonical_image_url(brand, poster) + f"?width={source.get('width') or 1280}" if poster else None,
                    product["product_url"], "product_video",
                    source.get("width"), source.get("height"),
                    round((item.get("duration") or 0) / 1000, 1) or None,
                )
            elif item.get("media_type") == "external_video":
                ctx.manifest.append({
                    **base_row,
                    "asset_type": "external_video",
                    "role": "product_video",
                    "source_page": product["product_url"],
                    "source_url": f"{item.get('host')}:{item.get('external_id')}",
                    "status": "not_downloaded",
                })
            elif item.get("media_type") == "image" and not args.skip_product_visuals:
                url = canonical_image_url(brand, item.get("src", ""))
                name = file_name(url)
                alt = (item.get("alt") or "").strip() if brand.alt_roles else ""
                if brand.descriptive:
                    role = "packshot" if first_image else classify_descriptive(name, alt, product["product_name"])
                else:
                    role = classify_role(name)
                first_image = False
                if role == "packshot" or url in ctx.seen:
                    continue
                ctx.seen.add(url)
                visual_counts[role] = visual_counts.get(role, 0) + 1
                ext = Path(name).suffix.lower() or ".jpg"
                dest = brand.out_dir / "product_visuals" / role / f"{slug}_{visual_counts[role]:02d}{ext}"
                add_image(ctx, base_row, url, role, dest, product["product_url"], alt)

        if brand.pdp_media:
            crawl_pdp(ctx, product, base_row, slug, visual_counts)
        elif not args.skip_icons:
            crawl_pdp_icons(ctx, product, base_row)


def crawl_pdp(ctx: Context, product: dict, base_row: dict, slug: str, visual_counts: dict[str, int]) -> None:
    """Images and videos placed in the PDP's own content sections (not the gallery)."""
    brand, args = ctx.brand, ctx.args
    body = fetch(product["product_url"])
    if not body:
        return
    soup = BeautifulSoup(body, "html.parser")

    if brand.ingredient_section and not args.skip_icons:
        for img in soup.select(f"{brand.ingredient_section} img"):
            src = img_src(img)
            if not src:
                continue
            url = canonical_image_url(brand, src)
            dest = brand.out_dir / "ingredient_icons" / file_name(url)
            if url not in ctx.seen:
                ctx.seen.add(url)
                if not download(f"{url}?width=400", dest):
                    continue
            width, height = image_size(dest)
            ctx.manifest.append({
                **base_row,
                "asset_type": "image",
                "role": "ingredient_icon",
                "source_page": product["product_url"],
                "source_url": url,
                "source_file": file_name(url),
                "alt_text": (img.get("alt") or "").strip(),
                "local_path": rel(dest),
                "width": width,
                "height": height,
                "file_size": dest.stat().st_size if dest.exists() else None,
                "status": "success" if dest.exists() else "failed",
            })

    pruned = prune(soup)
    html = str(pruned)
    for raw in set(VIDEO_URL_RE.findall(html)):
        url = to_cdn(brand, raw.replace("&amp;", "&"))
        if "cdn.shopify.com/videos/" not in url:
            continue
        vid = video_id(url)
        entry = ctx.pdp_videos.setdefault(vid, {"url": url, "products": []})
        if "1080p" in entry["url"] and "1080p" not in url:
            entry["url"] = url
        if product["product_id"] not in [p["product_id"] for p in entry["products"]]:
            entry["products"].append({**base_row, "product_url": product["product_url"], "slug": slug})

    if args.skip_product_visuals:
        return
    for img in pruned.find_all("img"):
        src = img_src(img)
        if not src or any(h in src for h in REVIEW_HOSTS) or "thumbnail.0000000000" in src:
            continue
        url = canonical_image_url(brand, src)
        name = file_name(url)
        lower = name.lower()
        if url in ctx.seen or "cdn.shopify.com" not in url or lower.endswith(".svg"):
            continue
        owners = ctx.store_images.get(image_key(url), set())
        if owners:
            continue  # gallery image of this or another product (already handled / not ours)
        if any(k in lower for k in SKIP_KEYWORDS):
            continue
        alt = (img.get("alt") or "").strip() if brand.alt_roles else ""
        role = classify_descriptive(name, alt, product["product_name"])
        if role == "packshot":
            role = "pdp_banner"  # section images are never the product's packshot
        ctx.seen.add(url)
        ext = Path(name).suffix.lower() or ".jpg"
        dest = brand.out_dir / "product_visuals" / role / f"{slug}_pdp_{visual_counts.get(role + '_pdp', 0) + 1:02d}{ext}"
        add_image(ctx, base_row, url, role, dest, product["product_url"], alt)
        width = ctx.manifest[-1]["width"]
        if width and width < 300:
            # Benefit chips and UI icons, not imagery.
            (ROOT / ctx.manifest.pop()["local_path"]).unlink(missing_ok=True)
            continue
        visual_counts[role + "_pdp"] = visual_counts.get(role + "_pdp", 0) + 1


def save_pdp_videos(ctx: Context) -> None:
    brand, args = ctx.brand, ctx.args
    per_product: dict[int, int] = defaultdict(int)
    for vid, entry in ctx.pdp_videos.items():
        if vid in ctx.seen:
            continue  # already saved from the product gallery
        ctx.seen.add(vid)
        candidates = video_candidates(entry["url"], args.video_quality)
        poster = poster_url(brand, vid) if "/videos/c/vp/" in entry["url"] else None
        owners = entry["products"]
        if len(owners) >= SHARED_VIDEO_PAGES:
            dest = brand.out_dir / "campaign" / "videos" / "product_pages" / f"{vid}.mp4"
            row = {"brand": brand.name, "note": f"embedded on {len(owners)} product pages"}
            add_video(ctx, row, candidates, dest, poster, owners[0]["product_url"], "campaign_video")
            continue
        first = owners[0]
        per_product[first["product_id"]] += 1
        category_dir = CATEGORY_DIRS.get(first["category"], slugify(first["category"]))
        dest = brand.out_dir / "videos" / category_dir / f"{first['slug']}_pdp_{per_product[first['product_id']]:02d}.mp4"
        for owner in owners:
            row = {k: owner[k] for k in ("brand", "product_id", "product_name", "category")}
            if len(owners) > 1:
                row["note"] = "shared by " + ", ".join(o["product_name"] for o in owners)
            add_video(ctx, row, candidates, dest, poster, owner["product_url"], "product_video")


def crawl_pdp_icons(ctx: Context, product: dict, base_row: dict) -> None:
    """Moroccanoil: ingredient icons are small PNGs embedded in the PDP 'key ingredients' section."""
    brand = ctx.brand
    body = fetch(product["product_url"])
    if not body:
        return
    for raw in set(MEDIA_URL_RE.findall(body)):
        url = canonical_image_url(brand, raw)
        name = file_name(url)
        if not name.lower().endswith(".png") or not url.startswith(brand.cdn_prefix + "files/"):
            continue
        if any(k in name.lower() for k in SKIP_KEYWORDS) or PACKSHOT_RE.search(name):
            continue
        dest = brand.out_dir / "ingredient_icons" / name
        if url not in ctx.seen:
            ctx.seen.add(url)
            if not download(f"{url}?width=400", dest):
                continue
        # One row per (product, icon) so the frontend can look up a product's ingredient icons.
        width, height = image_size(dest)
        ctx.manifest.append({
            **base_row,
            "asset_type": "image",
            "role": "ingredient_icon",
            "source_page": product["product_url"],
            "source_url": url,
            "source_file": name,
            "local_path": rel(dest),
            "width": width,
            "height": height,
            "file_size": dest.stat().st_size if dest.exists() else None,
            "status": "success" if dest.exists() else "failed",
        })


# --------------------------------------------------------------------------------------------- campaign

def crawl_campaign(ctx: Context, product_image_files: set[str]) -> None:
    brand = ctx.brand
    for page in brand.campaign_pages:
        page_url = brand.base_url + page
        page_slug = slugify(page.strip("/").replace("collections/", "").replace("pages/", "")) or "home"
        print(f"[campaign] {page_url}")
        body = fetch(page_url)
        if not body:
            log_error(f"page unavailable: {page_url}")
            continue
        if brand.pdp_media:
            # Menus and footers repeat on every page and carry other product lines; keep the page body.
            body = str(prune(BeautifulSoup(body, "html.parser")))

        for raw in sorted(set(MEDIA_URL_RE.findall(body))):
            raw = raw.replace("&amp;", "&")
            lower = raw.lower()
            if "/extensions/" in lower or any(k in lower for k in SKIP_KEYWORDS) or any(h in lower for h in REVIEW_HOSTS):
                continue
            if "/videos/" in lower and lower.split("?")[0].endswith(".mp4"):
                add_campaign_video(ctx, raw, page_url, page_slug)
                continue
            if "/cdn/shop/" not in lower and "cdn.shopify.com/s/files" not in lower:
                continue
            if "preview_images" in lower or "/products/" in lower:
                continue

            url = canonical_image_url(brand, raw)
            name = file_name(url)
            if name in product_image_files or url in ctx.seen or image_key(url) in ctx.store_images:
                continue
            if any(k in name.lower() for k in brand.non_hair):
                continue
            if (PACKSHOT_RE if not brand.descriptive else DESCRIPTIVE_PACKSHOT_RE).search(name):
                continue
            ctx.seen.add(url)
            dest = brand.out_dir / "campaign" / "images" / page_slug / name
            ok = download(f"{url}?width={IMAGE_WIDTH}", dest)
            if ok and brand.descriptive:
                dest = compact_png(dest)
            width, height = image_size(dest) if ok else (None, None)
            if ok and width and width < 300:
                # Swatches, UI chips and nav thumbnails, not campaign imagery.
                dest.unlink()
                continue
            ctx.manifest.append({
                "brand": brand.name,
                "asset_type": "image",
                "role": "campaign_banner",
                "source_page": page_url,
                "source_url": url,
                "source_file": name,
                "local_path": rel(dest),
                "width": width,
                "height": height,
                "file_size": dest.stat().st_size if ok else None,
                "status": "success" if ok else "failed",
            })


def add_campaign_video(ctx: Context, raw: str, page_url: str, page_slug: str) -> None:
    brand = ctx.brand
    url = to_cdn(brand, raw).split("?", 1)[0]
    vid = video_id(url)
    if vid in ctx.seen:
        return
    ctx.seen.add(vid)
    dest = brand.out_dir / "campaign" / "videos" / page_slug / f"{vid}.mp4"
    poster = poster_url(brand, vid) if "/videos/c/vp/" in url else None
    add_video(ctx, {"brand": brand.name}, video_candidates(url, ctx.args.video_quality), dest, poster,
              page_url, "campaign_video")


# --------------------------------------------------------------------------------------------- output

MANIFEST_FIELDS = [
    "brand", "asset_type", "role", "product_id", "product_name", "category", "source_page", "source_url",
    "source_file", "alt_text", "local_path", "poster_path", "width", "height", "duration_s", "file_size", "status",
    "note",
]


def write_outputs(ctx: Context, started: datetime) -> None:
    out = ctx.brand.out_dir
    out.mkdir(parents=True, exist_ok=True)
    with open(out / "brand_media_manifest.csv", "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=MANIFEST_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(ctx.manifest)

    summary: dict[str, int] = {}
    for row in ctx.manifest:
        if row["status"] == "success":
            summary[row["role"]] = summary.get(row["role"], 0) + 1
    payload = {
        "brand": ctx.brand.name,
        "crawled_at": started.isoformat(timespec="seconds"),
        "duration_s": round((datetime.now() - started).total_seconds()),
        "source": ctx.brand.base_url,
        "counts_by_role": dict(sorted(summary.items())),
        "assets": ctx.manifest,
    }
    with open(out / "brand_media_manifest.json", "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    with open(out / "crawl_media_errors.log", "w", encoding="utf-8") as fh:
        fh.write("\n".join(error_lines) + ("\n" if error_lines else ""))

    print(f"\n{ctx.brand.name} done.", json.dumps(payload["counts_by_role"], indent=2))
    print(f"Manifest: {rel(out / 'brand_media_manifest.json')}  errors: {len(error_lines)}")


def combine_manifests() -> None:
    rows = []
    for brand in BRANDS.values():
        path = brand.out_dir / "brand_media_manifest.json"
        if path.exists():
            for asset in json.loads(path.read_text(encoding="utf-8"))["assets"]:
                rows.append({"brand": brand.name, **asset})
    with open(MEDIA_ROOT / "brand_media_manifest.csv", "w", newline="", encoding="utf-8-sig") as fh:
        writer = csv.DictWriter(fh, fieldnames=MANIFEST_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"Combined manifest: {len(rows)} assets -> {rel(MEDIA_ROOT / 'brand_media_manifest.csv')}")


def detect_cdn_prefix(products: list[dict]) -> str:
    for product in products:
        for url in product.get("image_urls", []):
            match = re.match(r"https://cdn\.shopify\.com/s/files/1/(?:\d+/){3}", url)
            if match:
                return match.group(0)
    return ""


def crawl_brand(brand: Brand, args) -> None:
    error_lines.clear()
    started = datetime.now()
    products = json.loads((PRODUCT_DATA / brand.key / "products.json").read_text(encoding="utf-8"))[: args.limit]
    brand.cdn_prefix = detect_cdn_prefix(products)
    print(f"\n=== {brand.name} ({brand.base_url}) cdn={brand.cdn_prefix}")
    product_image_files = {
        file_name(canonical_image_url(brand, u)) for p in products for u in p.get("image_urls", [])
    }
    ctx = Context(brand, args)
    if brand.pdp_media:
        load_store_images(ctx)
    crawl_products(ctx, products)
    if brand.pdp_media:
        save_pdp_videos(ctx)
    if not args.skip_campaign:
        crawl_campaign(ctx, product_image_files)
    write_outputs(ctx, started)


def main() -> None:
    global cache_dir
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--brand", choices=sorted(BRANDS), action="append", help="brand(s) to crawl (default: all)")
    parser.add_argument("--video-quality", default="720p", choices=["480p", "720p", "1080p"])
    parser.add_argument("--limit", type=int, help="only crawl the first N products (for testing)")
    parser.add_argument("--skip-campaign", action="store_true")
    parser.add_argument("--skip-product-visuals", action="store_true")
    parser.add_argument("--skip-icons", action="store_true")
    parser.add_argument("--combine-only", action="store_true", help="only rebuild the combined manifest")
    parser.add_argument("--cache", type=Path, default=Path(tempfile.gettempdir()) / "haircare_crawl_cache",
                        help="page cache shared with crawl_brand_products.py")
    args = parser.parse_args()
    cache_dir = args.cache

    if not args.combine_only:
        for key in args.brand or list(BRANDS):
            crawl_brand(BRANDS[key], args)
    combine_manifests()


if __name__ == "__main__":
    main()

"""Cut out the four signature products shown standing in the home hero scene.

The crawled packshots sit on white/grey studio backgrounds; the hero needs transparent PNG-like
assets so the bottles can stand on the scene's plinth with real shadows and reflections.

Requires `pip install "rembg[cpu]"` (downloads the isnet-general-use model, ~180 MB, on first run).
Run from the repository root:

    python scripts/build_hero_cutouts.py

Output: public/assets/hero/<key>.webp (alpha, trimmed to the bottle, max 900 px tall)
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "hero"
IMAGES = ROOT / "data" / "store" / "product_data"

# Catalog key -> clean front packshot (see product_data/catalog/product_images.csv).
SOURCES = {
    "aromatica-rosemary-scalp-scaling-shampoo": IMAGES / "aromatica/images/shampoo/rosemary_scalp_scaling_shampoo_01.jpg",
    "rahua-classic-shampoo": IMAGES / "rahua/images/shampoo/classic_shampoo_01.jpg",
    "davines-oi-oil": IMAGES / "davines/images/treatment_oil/oi_oil_01.jpg",
    "moroccanoil-treatment-original": IMAGES / "moroccanoil/images/treatment_oil/moroccanoil_treatment_original_01.jpg",
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    session = new_session("isnet-general-use")
    for key, source in SOURCES.items():
        with Image.open(source) as image:
            cutout = remove(image.convert("RGB"), session=session, post_process_mask=True)
        cutout = cutout.crop(cutout.getchannel("A").getbbox())
        cutout.thumbnail((900, 900))
        target = OUT / f"{key}.webp"
        cutout.save(target, "WEBP", quality=88, method=6)
        print(f"{key}: {cutout.size} -> {target.relative_to(ROOT)} ({target.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()

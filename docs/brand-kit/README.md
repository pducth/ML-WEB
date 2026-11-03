# FOLMARÉ — Brand Kit

**Brand:** FOLMARÉ · Botanical Haircare Edit
**Style:** Modern Botanical Pop · Forest Green × Sage × Coral × Pearl
**Approved source:** `reference/approved-original-brand-board.png`

## Contents

```
brand-kit/
├── logo/          # official logo set (raster, transparent PNG + WebP) — see logo/README.md
│   ├── 01_primary … 04_monogram   dark + white versions
│   ├── 05_app_icon                gradient app icon
│   ├── 06_favicon                 favicon 16 → 1024 px + favicon.ico
│   ├── 07_source_originals        untouched originals, for comparison
│   └── 08_preview                 the whole set on light and dark backgrounds
├── web-sources/   # originals of brand images used on the website
│   ├── background-gradient-sky.jpg   home hero backdrop (3840×1800)
│   └── texture/                      the three texture images of the home page
├── reference/     # approved brand board, website mockup and logo crops
├── guidelines/    # brand-guidelines.md: logo usage, colours, typography
└── copywriting/   # brand story and website copy (.docx)
```

## Where the website uses it

| Website file (`public/assets/folmare/…`) | Source |
|---|---|
| `logo/png/folmare-wordmark-dark.png` — header, admin login | `logo/03_wordmark/` |
| `logo/png/folmare-wordmark-white.png` — admin sidebar | `logo/03_wordmark/` |
| `logo/png/folmare-horizontal-white.png` — footer | `logo/02_horizontal/` |
| `logo/png/folmare-primary-dark.png` — home brand story, About, admin login | `logo/01_primary/` |
| `logo/png/folmare-monogram-dark.png` — sign-in pages, bag drawer | `logo/04_monogram/` |
| `favicon/favicon.ico`, `favicon-32.png`, `favicon-180.png`, `favicon-192.png` | `logo/06_favicon/` |
| `home/sky.jpg` (resized to 2560×1200) | `web-sources/background-gradient-sky.jpg` |
| `texture/*.png` | `web-sources/texture/` |

Use the *dark* logos on light backgrounds and the *white* ones on dark backgrounds. When a logo changes,
copy the new file over the website file with the same name and update the `width`/`height` attributes of
its `<img>` tags if the proportions changed.

## Colours

| Name | Hex | Use |
|---|---|---|
| Forest | `#0F3D32` | logo, text, primary buttons |
| Sage | `#4F7F72` | icons, accents |
| Sea Mist | `#A8C3B6` | secondary card backgrounds |
| Pearl Mist | `#E0EAE5` | section backgrounds |
| Sand | `#D8C5AE` | warm neutral |
| Cream | `#F7F8F4` | page background |
| Coral | `#FF7F64` | gradients and hero only, used sparingly |

Fonts: Lora (headlines) and Montserrat (UI), both from Google Fonts; no licensed font files are included.

## Notes

- The logos are raster artwork, not vector. For print or trademark registration, the marks need to be
  redrawn as proper Bézier vectors from the approved PNGs.
- Mockups in `reference/` show packaging of AROMATICA, Rahua, Davines and Moroccanoil for concept purposes
  only; those houses do not endorse FOLMARÉ. Check usage rights before any commercial use, and check the
  FOLMARÉ name for domain and trademark availability.

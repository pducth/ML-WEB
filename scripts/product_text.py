"""Cleans the product copy crawled from the brand sites so the storefront "Details" reads well.

The crawled text carries artefacts of each site: award lists at the end of Moroccanoil pages, hard line breaks
inside Davines sentences, key benefits that are really the description, a trade-press footnote used as a benefit,
duplicated paragraphs on Rahua. `clean_text` returns what the storefront shows:

  description  paragraphs, "• " bullet lines and "*" footnotes, one per line
  keyBenefits  extra benefits that the description does not already say
  howToUse     directions, one step per line
"""

from __future__ import annotations

import re

# Directions the brand sites do not publish for these products, written from the official use instructions
# printed by the brand's stockists (Healf, Bluemercury, Dermstore).
RESEARCHED_HOW_TO = {
    ("Rahua", "Rebalance Shampoo"): "Apply on thoroughly wet hair and work into a lather. Rinse completely.\n"
    "Tip: use it with every wash, or once a week to remove scalp buildup.",
    ("Rahua", "Rebalance Conditioner"): "Apply to mid-lengths and ends, using less for fine hair and more for thicker hair.\n"
    "Leave in for 3 minutes, then rinse thoroughly.\nTip: use it with every wash, or once a week to remove scalp buildup.",
    ("Rahua", "Leave-In Treatment"): "After shampooing and conditioning, apply just a dab to damp hair, using more or less depending on hair thickness and texture.\n"
    "Work the treatment through the hair, concentrating on the ends.\nCan be used before hot styling tools or when air drying.",
}

AWARD_START = re.compile(
    r"^(AWARDS?|Greatest of All Time|DISCOVER THE ORIGINAL|Winner\b|Drop Dead|Ultimate Hair|Favorite Oil|Reviewer'?s Choice|"
    r".*\b(Beauty )?Awards?\b.*\d{4}|#1 Hair Oil)",
    re.I,
)
END_PUNCT = re.compile(r"[.!?:*)\"”]$")
OPEN_ENDINGS = {"by", "the", "and", "a", "an", "of", "this", "to", "with", "for", "in", "on", "as", "or", "against"}
NOT_A_BENEFIT = re.compile(r"^(after one use|in a consumer|efficacy test|\*|\d+%|results )|participants|agreed|^note|^loved ", re.I)


def _lines(text: str) -> list[str]:
    return [line.strip() for line in (text or "").replace("\r", "").split("\n")]


def _join_wrapped(lines: list[str]) -> list[str]:
    """Davines breaks lines in the middle of sentences: glue a line to the previous one unless that ended a sentence."""
    out: list[str] = []
    for line in lines:
        if not line:
            continue
        previous_open = bool(out) and (out[-1].split()[-1].lower() in OPEN_ENDINGS)
        continues = line[0].islower() or line[0] in ",.;:)" or previous_open
        if out and continues and not END_PUNCT.search(out[-1]) and not line.startswith(("•", "*", "-")) and not out[-1].startswith("•"):
            out[-1] = out[-1] + ("" if line[0] in ",.;:)" else " ") + line
        else:
            out.append(line)
    return out


def clean_description(raw: str, brand: str) -> str:
    lines = [line for line in _lines(raw) if line and not re.search(r"final sale|cannot be returned", line, re.I)]
    for i, line in enumerate(lines):  # Moroccanoil: everything from the award list on is press clippings
        if AWARD_START.match(line) and i > 0:
            lines = lines[:i]
            break
    if brand == "Davines":
        lines = _join_wrapped(lines)
    merged: list[str] = []
    for line in lines:
        if re.fullmatch(r"\d{1,2}", line):
            continue
        if merged and re.fullmatch(r"[A-Za-z ]{2,20}:", merged[-1]) and not line.startswith("•"):
            merged[-1] = f"{merged[-1]} {line}"  # "Best for:" + "all hair types"
        else:
            merged.append(line)
    # A label without a value ("Best for:") goes; one that introduces bullets ("In a consumer study:") stays.
    merged = [line for i, line in enumerate(merged) if not (re.fullmatch(r"[A-Za-z ]{2,20}:", line) and not (i + 1 < len(merged) and merged[i + 1].startswith("•")))]
    seen: set[str] = set()
    paragraphs = []
    for line in merged:
        key = re.sub(r"\W+", "", line.lower())[:60]
        if len(key) > 25 and key in seen:
            continue  # the same paragraph repeated
        seen.add(key)
        paragraphs.append(line)
    notes = [p for p in paragraphs if p.startswith("*")]
    body = [p for p in paragraphs if not p.startswith("*")]
    text = "\n".join(body + notes)
    # No footnote to point at: drop the asterisks.
    return text if notes else re.sub(r"(?<=\S)\*+(?=\s|$)", "", text)


def split_benefits(values: list[str] | str) -> list[str]:
    items: list[str] = []
    for value in [values] if isinstance(values, str) else values:
        for part in re.split(r"\n|•", value or ""):
            segments = [s.strip(" -\t") for s in part.split("; ")]
            items.extend(s for s in segments if s)
    return items


def clean_text(item: dict) -> dict:
    brand = item["brand"]
    description = clean_description(item.get("product_description") or "", brand)
    raw_benefits = split_benefits(item.get("key_benefits") or "")
    plain = re.sub(r"\W+", "", description.lower())
    benefits: list[str] = []
    for text in raw_benefits:
        key = re.sub(r"\W+", "", text.lower())
        if "circana" in key or len(key) < 4 or NOT_A_BENEFIT.search(text) or text.endswith(":"):
            continue
        if len(text) > 200:  # a paragraph, not a benefit: the description when the site left it out
            if not description:
                description = clean_description(text, brand)
                plain = re.sub(r"\W+", "", description.lower())
            continue
        if key[:40] in plain or text in benefits:
            continue
        benefits.append(text.rstrip("*") if "*" not in description else text)
    how = "\n".join(_join_steps(_lines(item.get("how_to_use") or "")))
    how = RESEARCHED_HOW_TO.get((brand, item["product_name"]), how)
    return {"description": description, "keyBenefits": benefits[:8], "howToUse": how}


def _join_steps(lines: list[str]) -> list[str]:
    out: list[str] = []
    for line in lines:
        if not line:
            continue
        if out and re.fullmatch(r"Step \d+\.?", out[-1]):
            out[-1] = f"{out[-1]} {line}"
        else:
            out.append(line)
    return out

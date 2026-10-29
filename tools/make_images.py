#!/usr/bin/env python3
"""Generate blog cover images (WebP) and 1200x630 social share images (JPEG).

Run after adding a post:  python3 tools/make_images.py
Needs Pillow. Uses the Google Sans TTFs in tools/fonts (the app's brand font).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
FONTS = Path(__file__).resolve().parent / "fonts"
W, H = 1200, 630

BRAND = (7, 153, 99)
BRAND_DARK = (6, 60, 42)
INK = (29, 21, 23)
ORANGE = (199, 119, 38)
MINT = (0, 223, 152)


def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f"GoogleSans-{weight}.ttf"), size)


def cover_crop(src: Path, focus_y: float = 0.5) -> Image.Image:
    """Scale to fill 1200x630, cropping vertically around focus_y (0 top, 1 bottom)."""
    im = Image.open(src).convert("RGB")
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    x = (im.width - W) // 2
    y = round((im.height - H) * focus_y)
    return im.crop((x, y, x + W, y + H))


def gradient(c1, c2, size=(W, H)) -> Image.Image:
    w, h = size
    g = Image.new("RGB", size)
    px = g.load()
    for yy in range(h):
        for xx in range(w):
            t = min(1.0, (xx / w) * 0.65 + (yy / h) * 0.35)
            px[xx, yy] = tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))
    return g


PHOTOS = IMG / "photos"


def photo_canvas(name: str, focus_y: float = 0.5) -> Image.Image:
    """A real photo, darkened and tinted brand-green so white text and cards stay readable."""
    base = cover_crop(PHOTOS / f"{name}.webp", focus_y).convert("RGBA")
    tint = Image.new("RGBA", (W, H))
    px = tint.load()
    for xx in range(W):
        a = round(230 - 120 * (xx / W))  # heavier on the text side
        for yy in range(H):
            px[xx, yy] = (4, 40, 27, a)
    return Image.alpha_composite(base, tint)


def brand_canvas() -> Image.Image:
    base = gradient(BRAND_DARK, BRAND).convert("RGBA")
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((700, -260, 1400, 440), fill=MINT + (110,))
    base = Image.alpha_composite(base, glow.filter(ImageFilter.GaussianBlur(120)))
    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(grid)
    for gx in range(0, W, 60):
        d.line((gx, 0, gx - 160, H), fill=(255, 255, 255, 18), width=2)
    for gy in range(0, H, 60):
        d.line((0, gy, W, gy - 40), fill=(255, 255, 255, 18), width=2)
    return Image.alpha_composite(base, grid)


def paste_device(canvas: Image.Image, x: int, y: int, height: int, angle: float = -4) -> None:
    dev = Image.open(IMG / "hero-device.png").convert("RGBA")
    dev = dev.resize((round(dev.width * height / dev.height), height), Image.LANCZOS).rotate(angle, expand=True, resample=Image.BICUBIC)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    mask = dev.split()[3].point(lambda a: 120 if a > 10 else 0)
    shadow.paste((0, 0, 0, 255), (x + 18, y + 30), mask)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(28)))
    canvas.alpha_composite(dev, (x, y))


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt, max_w: int) -> list[str]:
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def brand_mark(canvas: Image.Image, x: int, y: int, size: int = 56, label_color=(255, 255, 255)) -> None:
    icon = Image.open(IMG / "bhumitra-app-icon.png").convert("RGBA").resize((size, size), Image.LANCZOS)
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size, size), radius=size // 4.2, fill=255)
    canvas.paste(icon, (x, y), m)
    ImageDraw.Draw(canvas).text((x + size + 14, y + size / 2), "Bhumitra", font=font("Bold", round(size * .55)), fill=label_color, anchor="lm")


def share_image(cover: Image.Image, title: str, kicker: str) -> Image.Image:
    """Cover photo with a dark gradient on the left and the title set over it."""
    im = cover.convert("RGBA")
    shade = Image.new("RGBA", (W, H))
    px = shade.load()
    for xx in range(W):
        a = round(235 * max(0.0, 1 - xx / (W * 0.92)) ** 0.8)
        for yy in range(H):
            px[xx, yy] = (14, 32, 24, a)
    im = Image.alpha_composite(im, shade)
    d = ImageDraw.Draw(im)
    brand_mark(im, 64, 56)
    d.text((64, 180), kicker.upper(), font=font("Bold", 24), fill=MINT)
    size = 58
    while True:
        f = font("Bold", size)
        lines = wrap(d, title, f, 700)
        if len(lines) <= 4 or size <= 40:
            break
        size -= 4
    y = 222
    for line in lines:
        d.text((64, y), line, font=f, fill=(255, 255, 255))
        y += round(size * 1.12)
    d.text((64, H - 70), "getbhumitra.in", font=font("Medium", 26), fill=(255, 255, 255, 200))
    return im.convert("RGB")


def device_cover() -> Image.Image:
    c = photo_canvas("green-paddy")
    paste_device(c, 700, 36, 600)
    d = ImageDraw.Draw(c)
    d.text((80, 170), "RECORD OF RIGHTS", font=font("Bold", 26), fill=MINT)
    for i, line in enumerate(["Plot, khata,", "owners and", "shares."]):
        d.text((80, 214 + i * 82), line, font=font("Bold", 74), fill=(255, 255, 255))
    return c.convert("RGB")


def units_cover() -> Image.Image:
    c = photo_canvas("plots")
    rows = [("1 acre", "100 decimal"), ("1 decimal", "435.6 sq ft"), ("1 guntha", "4 decimal"), ("1 bigha", "33.33 decimal")]
    panel = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel)
    for i in range(len(rows)):
        y = 160 + i * 108
        pd.rounded_rectangle((80, y, 1120, y + 92), radius=24, fill=(255, 255, 255, 30), outline=(255, 255, 255, 60), width=2)
    c = Image.alpha_composite(c, panel)
    d = ImageDraw.Draw(c)
    d.text((80, 96), "ODISHA LAND UNITS", font=font("Bold", 26), fill=MINT)
    y = 160
    for left, right in rows:
        d.text((118, y + 46), left, font=font("Bold", 44), fill=(255, 255, 255), anchor="lm")
        d.text((560, y + 46), "=", font=font("Bold", 44), fill=ORANGE, anchor="mm")
        d.text((1082, y + 46), right, font=font("Bold", 44), fill=(255, 255, 255), anchor="rm")
        y += 108
    return c.convert("RGB")


def home_share() -> Image.Image:
    c = photo_canvas("hills-paddy")
    paste_device(c, 760, 40, 590)
    d = ImageDraw.Draw(c)
    brand_mark(c, 72, 64)
    d.text((72, 190), "Your land,", font=font("Bold", 80), fill=(255, 255, 255))
    d.text((72, 282), "one tap away.", font=font("Bold", 80), fill=(255, 255, 255))
    d.text((72, 404), "Official plot maps and Record of Rights", font=font("Medium", 30), fill=(225, 245, 236))
    d.text((72, 446), "for any plot in Odisha.", font=font("Medium", 30), fill=(225, 245, 236))
    d.rounded_rectangle((72, 518, 420, 572), radius=27, fill=(255, 255, 255))
    d.text((246, 545), "Free on the App Store", font=font("Bold", 24), fill=INK, anchor="mm")
    return c.convert("RGB")


# ---------- Designed thumbnails: headline left, topic illustration right ----------
WHITE = (255, 255, 255)
PALE = (223, 249, 236)
LINE = (210, 232, 220)
MUTED = (110, 120, 115)


def designed(kicker: str, lines: list[str], art, photo: str | None = None) -> Image.Image:
    c = photo_canvas(photo) if photo else brand_canvas()
    brand_mark(c, 64, 52, size=48)
    d = ImageDraw.Draw(c)
    d.text((64, 190), kicker.upper(), font=font("Bold", 24), fill=MINT)
    size = 64 if max(len(x) for x in lines) <= 14 else 56
    for i, line in enumerate(lines):
        d.text((64, 230 + i * round(size * 1.12)), line, font=font("Bold", size), fill=WHITE)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    art(ImageDraw.Draw(layer), layer)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 110), (0, 14), layer.split()[3].point(lambda a: 255 if a > 200 else 0))
    c = Image.alpha_composite(c, shadow.filter(ImageFilter.GaussianBlur(22)))
    return Image.alpha_composite(c, layer).convert("RGB")


def card_box(d, box, r=28, fill=WHITE):
    d.rounded_rectangle(box, radius=r, fill=fill)


def bar(d, x, y, w, h=14, fill=LINE):
    d.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=fill)


def art_search(d, im):
    card_box(d, (640, 110, 1140, 540))
    d.rounded_rectangle((676, 146, 1104, 210), radius=32, fill=(242, 247, 244))
    d.ellipse((700, 164, 728, 192), outline=BRAND, width=5); d.line((724, 188, 738, 202), fill=BRAND, width=5)
    d.text((752, 178), "Owner name", font=font("Medium", 28), fill=MUTED, anchor="lm")
    for i, w in enumerate([300, 240, 280, 200]):
        y = 248 + i * 70
        hi = i == 1
        if hi:
            d.rounded_rectangle((664, y - 14, 1116, y + 50), radius=18, fill=PALE)
        d.ellipse((684, y, 720, y + 36), fill=BRAND if hi else LINE)
        bar(d, 740, y + 4, w, 12, INK if hi else (190, 200, 195))
        bar(d, 740, y + 26, w * 0.55, 10, (200, 210, 205))


def art_map(d, im):
    card_box(d, (640, 96, 1140, 556), fill=(9, 110, 72))
    pts = [[(660, 120), (820, 112), (840, 260), (668, 276)], [(820, 112), (980, 104), (1000, 250), (840, 260)],
           [(980, 104), (1120, 116), (1118, 240), (1000, 250)], [(668, 276), (840, 260), (856, 410), (676, 420)],
           [(840, 260), (1000, 250), (1012, 400), (856, 410)], [(1000, 250), (1118, 240), (1118, 394), (1012, 400)],
           [(676, 420), (856, 410), (864, 536), (680, 540)], [(856, 410), (1012, 400), (1020, 530), (864, 536)],
           [(1012, 400), (1118, 394), (1120, 528), (1020, 530)]]
    for i, p in enumerate(pts):
        d.polygon(p, fill=(0, 223, 152) if i == 4 else None, outline=(255, 214, 120), width=4)
    d.polygon(pts[4], outline=WHITE, width=7)
    cx, cy = 926, 300
    d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=WHITE)
    d.polygon([(cx - 22, cy + 14), (cx + 22, cy + 14), (cx, cy + 56)], fill=WHITE)
    d.ellipse((cx - 13, cy - 13, cx + 13, cy + 13), fill=BRAND)
    for i, p in enumerate(pts):
        if i != 4:
            mx = sum(x for x, _ in p) / 4; my = sum(y for _, y in p) / 4
            d.text((mx, my), str(440 + i), font=font("Bold", 24), fill=(255, 255, 255, 200), anchor="mm")


def art_mutation(d, im):
    for x, label, name, hi in [(640, "BEFORE", "Seller", False), (900, "AFTER", "Buyer", True)]:
        card_box(d, (x, 170, x + 240, 470), fill=PALE if hi else WHITE)
        d.text((x + 28, 206), label, font=font("Bold", 20), fill=BRAND if hi else MUTED)
        d.ellipse((x + 28, 248, x + 92, 312), fill=BRAND if hi else (190, 200, 195))
        d.text((x + 28, 340), name, font=font("Bold", 34), fill=INK)
        bar(d, x + 28, 392, 170, 12); bar(d, x + 28, 418, 120, 12)
    d.ellipse((854, 290, 926, 362), fill=ORANGE)
    d.line((872, 326, 906, 326), fill=WHITE, width=7); d.polygon([(900, 312), (916, 326), (900, 340)], fill=WHITE)


def art_document(d, im):
    card_box(d, (700, 86, 1100, 560))
    d.text((736, 126), "ENCUMBRANCE", font=font("Bold", 22), fill=BRAND)
    bar(d, 736, 166, 240, 16, INK)
    for i in range(5):
        y = 222 + i * 62
        d.rounded_rectangle((736, y, 1064, y + 46), radius=12, fill=(244, 249, 246))
        bar(d, 756, y + 10, 150, 10, (170, 182, 176)); bar(d, 756, y + 28, 90, 8, (200, 210, 205))
        d.text((1040, y + 23), "✓" if i < 4 else "?", font=font("Bold", 26), fill=BRAND if i < 4 else ORANGE, anchor="mm")
    d.ellipse((1050, 40, 1160, 150), fill=ORANGE)
    d.text((1105, 95), "EC", font=font("Bold", 36), fill=WHITE, anchor="mm")


def art_conversion(d, im):
    card_box(d, (620, 150, 860, 470), fill=(255, 241, 210))
    for i in range(7):
        d.line((640, 180 + i * 42, 840, 168 + i * 42), fill=(214, 168, 70), width=6)
    d.text((740, 500), "Agricultural", font=font("Bold", 26), fill=WHITE, anchor="mm")
    d.ellipse((866, 280, 934, 348), fill=ORANGE)
    d.line((884, 314, 914, 314), fill=WHITE, width=7); d.polygon([(908, 300), (922, 314), (908, 328)], fill=WHITE)
    card_box(d, (940, 150, 1160, 470), fill=PALE)
    d.polygon([(990, 300), (1050, 236), (1110, 300)], fill=BRAND)
    d.rectangle((1002, 300, 1098, 400), fill=WHITE, outline=BRAND, width=5)
    d.rectangle((1036, 340, 1064, 400), fill=BRAND)
    d.text((1050, 500), "Gharabari", font=font("Bold", 26), fill=WHITE, anchor="mm")


def art_kisam(d, im):
    rows = [("Gharabari", (0, 180, 120)), ("Sarad", (150, 200, 80)), ("Bahal", (70, 160, 200)),
            ("Atta", (214, 168, 70)), ("Patita", (180, 170, 150)), ("Gochar", (240, 140, 90))]
    card_box(d, (660, 90, 1120, 560))
    for i, (name, col) in enumerate(rows):
        y = 124 + i * 72
        d.rounded_rectangle((694, y, 754, y + 52), radius=14, fill=col)
        d.text((780, y + 26), name, font=font("Bold", 32), fill=INK, anchor="lm")
        bar(d, 980, y + 20, 100, 12)


def art_receipt(d, im):
    top, bot = 90, 560
    pts = [(720, top), (1080, top), (1080, bot)]
    zig = [(1080 - i * 30, bot + (0 if i % 2 == 0 else -18)) for i in range(13)]
    d.polygon(pts + zig + [(720, top)], fill=WHITE)
    d.text((900, 140), "e-PAUTI", font=font("Bold", 26), fill=BRAND, anchor="mm")
    d.text((900, 182), "Land revenue receipt", font=font("Medium", 22), fill=MUTED, anchor="mm")
    for i, (a, b) in enumerate([("Khata", "212"), ("Village", "Naiganer"), ("Year", "2026-27")]):
        y = 236 + i * 56
        d.text((752, y), a, font=font("Medium", 24), fill=MUTED); d.text((1048, y), b, font=font("Bold", 24), fill=INK, anchor="ra")
    d.line((752, 410, 1048, 410), fill=LINE, width=3)
    d.text((752, 430), "Paid", font=font("Bold", 30), fill=INK)
    d.text((1048, 430), "₹ ✓", font=font("Bold", 30), fill=BRAND, anchor="ra")


def art_bars(d, im):
    card_box(d, (640, 110, 1140, 540))
    base = 470
    for x, h, col, label in [(720, 210, (190, 200, 195), "Deal price"), (900, 290, BRAND, "Benchmark")]:
        d.rounded_rectangle((x, base - h, x + 140, base), radius=18, fill=col)
        d.text((x + 70, base + 34), label, font=font("Bold", 24), fill=INK, anchor="mm")
    d.rounded_rectangle((880, base - 350, 1080, base - 302), radius=24, fill=ORANGE)
    d.text((980, base - 326), "Duty on this", font=font("Bold", 22), fill=WHITE, anchor="mm")


def art_steps(d, im):
    labels = ["Check land", "Book slot", "Pay fees", "Sign deed", "Mutation"]
    x0, x1 = 680, 1100
    d.line((x0, 330, x1, 330), fill=(255, 255, 255, 120), width=6)
    for i, lab in enumerate(labels):
        x = x0 + i * (x1 - x0) / (len(labels) - 1)
        done = i < 3
        d.ellipse((x - 34, 296, x + 34, 364), fill=WHITE if done else BRAND_DARK, outline=WHITE, width=4)
        d.text((x, 330), str(i + 1), font=font("Bold", 30), fill=BRAND if done else WHITE, anchor="mm")
        d.text((x, 404 if i % 2 == 0 else 256), lab, font=font("Bold", 22), fill=WHITE, anchor="mm")


def art_govt(d, im):
    card_box(d, (640, 96, 1140, 556), fill=(9, 110, 72))
    d.polygon([(640, 300), (1140, 250), (1140, 300), (640, 352)], fill=(200, 200, 190))
    d.ellipse((900, 380, 1080, 500), fill=(90, 170, 220))
    d.polygon([(680, 130), (860, 120), (870, 270), (686, 284)], outline=(255, 214, 120), width=5)
    d.polygon([(880, 118), (1110, 108), (1112, 250), (890, 266)], outline=(255, 214, 120), width=5)
    d.text((780, 210), "Private", font=font("Bold", 26), fill=WHITE, anchor="mm")
    d.text((990, 190), "Private", font=font("Bold", 26), fill=WHITE, anchor="mm")
    d.text((780, 325), "RASTA", font=font("Bold", 24), fill=INK, anchor="mm")
    d.text((990, 440), "POKHARI", font=font("Bold", 24), fill=WHITE, anchor="mm")
    d.regular_polygon((720, 450, 62), 3, fill=ORANGE)
    d.text((720, 462), "!", font=font("Bold", 56), fill=WHITE, anchor="mm")


DESIGNED = {
    "bhulekh-odisha-plot-details-by-name": ("Land records", ["Find land", "records by", "owner name"], art_search, "farmer"),
    "odisha-village-map-plot-map-online": ("Maps", ["See your", "village and", "plot map"], art_map, "plots"),
    "odisha-land-mutation-apply-status": ("Mutation", ["Change the", "owner name", "in the RoR"], art_mutation, "village"),
    "encumbrance-certificate-odisha-online": ("Encumbrance certificate", ["Check every", "past sale", "and loan"], art_document, "green-paddy"),
    "land-conversion-odisha-gharabari": ("Land conversion", ["Agricultural", "land to", "gharabari"], art_conversion, "transplanting"),
    "kisam-of-land-odisha-list": ("Kisam", ["Every land", "type in an", "Odisha RoR"], art_kisam, "balasore"),
    "pay-khajana-land-revenue-online-odisha": ("Khajana", ["Pay land", "revenue", "online"], art_receipt, "harvest"),
    "benchmark-valuation-odisha-land-value": ("Benchmark value", ["The govt", "value of", "your land"], art_bars, "hills"),
    "odisha-land-registration-process": ("Registration", ["Register", "land, step", "by step"], art_steps, "buffalo"),
    "government-land-or-private-odisha": ("Government land", ["Govt land", "or private?", "Check first"], art_govt, "sunset"),
}

# slug -> cover builder
COVERS = {
    "how-to-check-land-records-odisha-online": lambda: cover_crop(PHOTOS / "hills-paddy.webp", 0.55),
    "record-of-rights-odisha-explained": device_cover,
    "find-plot-number-khata-number-odisha": lambda: cover_crop(PHOTOS / "plots.webp", 0.6),
    "odisha-land-measurement-units": units_cover,
    "stamp-duty-registration-charges-odisha": lambda: cover_crop(PHOTOS / "monsoon-paddy.webp", 0.5),
    "land-buying-checklist-odisha": lambda: cover_crop(PHOTOS / "village.webp", 0.55),
}


def posts() -> list[dict]:
    out = []
    for p in sorted((ROOT / "content" / "blog").glob("*.html")):
        m = re.match(r"^\s*<!--meta\s+(\{.*?\})\s*-->", p.read_text(encoding="utf-8"), re.S)
        out.append(json.loads(m.group(1)))
    return out


def main() -> None:
    (IMG / "blog").mkdir(exist_ok=True)
    (IMG / "og").mkdir(exist_ok=True)
    for p in posts():
        if p["slug"] in DESIGNED:
            # Designed thumbnails already carry a headline and the brand mark.
            cover = designed(*DESIGNED[p["slug"]])
            share = cover
        elif p["slug"] in COVERS:
            cover = COVERS[p["slug"]]()
            share = share_image(cover, p["title"], p["category"])
        else:
            raise SystemExit(f"No cover defined for {p['slug']}; add it to COVERS or DESIGNED")
        cover.save(IMG / "blog" / f"{p['slug']}.webp", "WEBP", quality=82, method=6)
        share.save(IMG / "og" / f"{p['slug']}.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    home_share().save(IMG / "og" / "home.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    print("Images written to assets/img/blog and assets/img/og")


if __name__ == "__main__":
    main()

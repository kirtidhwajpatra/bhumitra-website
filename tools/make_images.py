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
    c = brand_canvas()
    paste_device(c, 700, 36, 600)
    d = ImageDraw.Draw(c)
    d.text((80, 170), "RECORD OF RIGHTS", font=font("Bold", 26), fill=MINT)
    for i, line in enumerate(["Plot, khata,", "owners and", "shares."]):
        d.text((80, 214 + i * 82), line, font=font("Bold", 74), fill=(255, 255, 255))
    return c.convert("RGB")


def units_cover() -> Image.Image:
    c = brand_canvas()
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
    c = brand_canvas()
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


# slug -> cover builder
COVERS = {
    "how-to-check-land-records-odisha-online": lambda: cover_crop(IMG / "landscape.webp", 0.7),
    "record-of-rights-odisha-explained": device_cover,
    "find-plot-number-khata-number-odisha": lambda: cover_crop(IMG / "night.webp", 0.5),
    "odisha-land-measurement-units": units_cover,
    "stamp-duty-registration-charges-odisha": lambda: cover_crop(IMG / "puri.webp", 0.5),
    "land-buying-checklist-odisha": lambda: cover_crop(IMG / "hero-tall.webp", 0.72),
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
        build = COVERS.get(p["slug"])
        if build is None:
            raise SystemExit(f"No cover defined for {p['slug']}; add it to COVERS")
        cover = build()
        cover.save(IMG / "blog" / f"{p['slug']}.webp", "WEBP", quality=80, method=6)
        share_image(cover, p["title"], p["category"]).save(IMG / "og" / f"{p['slug']}.jpg", "JPEG", quality=84, optimize=True, progressive=True)
    home_share().save(IMG / "og" / "home.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    print("Images written to assets/img/blog and assets/img/og")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Download the site's Odisha photographs from Wikimedia Commons and make web sizes.

Every photo is CC BY or CC BY-SA licensed. Attribution is written to
content/photo-credits.json, which tools/build.py turns into /credits/.

Run:  python3 tools/photos.py      (needs Pillow and internet access)
"""
from __future__ import annotations

import io
import json
import socket
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "photos"
CREDITS = ROOT / "content" / "photo-credits.json"
UA = {"User-Agent": "BhumitraSite/1.0 (support@getbhumitra.in)"}
socket.setdefaulttimeout(60)

# name -> (Commons file title, short description used on the credits page)
PHOTOS = {
    "hills-paddy": ("Gobindapur, Odisha, India - panoramio.jpg", "Paddy fields below the hills, Gobindapur"),
    "monsoon-paddy": ("Paddy field in Odisha 01.jpg", "Paddy field under monsoon clouds"),
    "farmer": ("Rice Farmer Near Anantapalli Village Odisha.JPG", "Rice farmer near Anantapalli village"),
    "transplanting": ("Village View2.jpg", "Transplanting paddy near a village"),
    "buffalo": ("A farmer farming with water buffaloes Koraput.jpg", "Ploughing with water buffaloes, Koraput"),
    "green-paddy": ("Paddy field4.jpg", "Ripening paddy"),
    "harvest": ("Harvesting Paddy 01.jpg", "Harvesting paddy"),
    "plots": ("Astak, Odisha, India - panoramio.jpg", "Fields and bunds after harvest, Astak"),
    "balasore": ("Rice Field in Balasore.jpg", "Rice field in Balasore"),
    "village": ("Khalibandha Village Front View.jpg", "Khalibandha village"),
    "sunset": ("Sunset in Odisha , village - Raiberuan, District - Puri.jpg", "Sunset at Raiberuan village, Puri"),
    "hills": ("Hilly Terrain in Koraput, Odisha.jpg", "Hills of Koraput"),
}

SIZES = {"": 2400, "-md": 1400, "-sm": 800}


def commons_info(title: str) -> dict:
    q = {
        "action": "query", "format": "json", "titles": f"File:{title}",
        "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": 2400,
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(q)
    data = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read())
    page = next(iter(data["query"]["pages"].values()))
    return page["imageinfo"][0]


def fetch(url: str) -> bytes:
    for attempt in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()
        except Exception:  # transient network errors
            if attempt == 2:
                raise
            time.sleep(3)
    raise RuntimeError("unreachable")


def strip_html(s: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", s or "").strip()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    credits = {}
    for name, (title, desc) in PHOTOS.items():
        info = commons_info(title)
        meta = info.get("extmetadata", {})
        im = Image.open(io.BytesIO(fetch(info.get("thumburl") or info["url"]))).convert("RGB")
        # Light grade: phone photos from the field tend to be flat and hazy.
        im = ImageEnhance.Contrast(im).enhance(1.08)
        im = ImageEnhance.Color(im).enhance(1.10)
        for suffix, width in SIZES.items():
            out = im.copy()
            if out.width > width:
                out = out.resize((width, round(out.height * width / out.width)), Image.LANCZOS)
            out.save(OUT / f"{name}{suffix}.webp", "WEBP", quality=74 if width >= 1400 else 72, method=6)
        credits[name] = {
            "description": desc,
            "title": title,
            "artist": strip_html(meta.get("Artist", {}).get("value", "")),
            "license": meta.get("LicenseShortName", {}).get("value", ""),
            "licenseUrl": meta.get("LicenseUrl", {}).get("value", ""),
            "source": info["descriptionurl"],
        }
        print(f"{name:14} {im.size[0]}x{im.size[1]}  {credits[name]['license']}  {credits[name]['artist']}")
        time.sleep(0.5)
    CREDITS.write_text(json.dumps(credits, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(credits)} photos to {OUT} and credits to {CREDITS}")


if __name__ == "__main__":
    main()

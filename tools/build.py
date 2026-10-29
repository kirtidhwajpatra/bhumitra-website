#!/usr/bin/env python3
"""Build the Bhumitra blog, sitemap and robots.txt from content/blog/*.html.

Each source file starts with a JSON front-matter comment:
    <!--meta {"slug": "...", "title": "...", ...} -->
followed by the article body HTML. Run from anywhere:
    python3 tools/build.py
"""
from __future__ import annotations

import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "blog"
OUT = ROOT / "blog"

SITE = "https://getbhumitra.in"  # Production origin; change here if the domain differs.
IOS_URL = "https://apps.apple.com/in/app/bhumitra/id6760656162"
EMAIL = "support@getbhumitra.in"

# Top-level pages for the sitemap: (path, priority, changefreq)
STATIC_PAGES = [
    ("/", "1.0", "weekly"),
    ("/blog/", "0.8", "weekly"),
    ("/support/", "0.5", "monthly"),
    ("/privacy/", "0.3", "yearly"),
    ("/terms/", "0.3", "yearly"),
    ("/credits/", "0.2", "yearly"),
]

META_RE = re.compile(r"^\s*<!--meta\s+(\{.*?\})\s*-->", re.S)


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def load_posts() -> list[dict]:
    posts = []
    for path in sorted(SRC.glob("*.html")):
        raw = path.read_text(encoding="utf-8")
        m = META_RE.match(raw)
        if not m:
            raise SystemExit(f"{path.name}: missing <!--meta {{...}} --> header")
        meta = json.loads(m.group(1))
        body = raw[m.end():].strip()
        words = len(re.sub(r"<[^>]+>", " ", body).split())
        meta["body"] = body
        meta["minutes"] = max(1, round(words / 220))
        meta.setdefault("updated", meta["date"])
        meta["url"] = f"/blog/{meta['slug']}/"
        posts.append(meta)
    # Newest first; within a day, higher "order" first.
    posts.sort(key=lambda p: (p["date"], p.get("order", 0)), reverse=True)
    return posts


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", re.sub(r"<[^>]+>", "", text).lower()).strip("-")


def add_toc(body: str) -> tuple[str, str]:
    """Give every <h2> an id and return (body, table-of-contents HTML)."""
    entries = []

    def repl(m: re.Match) -> str:
        attrs, inner = m.group(1), m.group(2)
        hid = re.search(r'id="([^"]+)"', attrs)
        hid = hid.group(1) if hid else slugify(inner)
        entries.append((hid, re.sub(r"<[^>]+>", "", inner)))
        attrs = attrs if 'id="' in attrs else f'{attrs} id="{hid}"'
        return f"<h2{attrs}>{inner}</h2>"

    body = re.sub(r"<h2([^>]*)>(.*?)</h2>", repl, body, flags=re.S)
    if len(entries) < 4:
        return body, ""
    items = "".join(f'<li><a href="#{i}">{esc(t)}</a></li>' for i, t in entries)
    return body, f'<nav class="toc" aria-label="On this page"><b>On this page</b><ol>{items}</ol></nav>'


def related_posts(p: dict, posts: list[dict], n: int = 3) -> list[dict]:
    wanted = p.get("related", [])
    by_slug = {x["slug"]: x for x in posts}
    picked = [by_slug[s] for s in wanted if s in by_slug and s != p["slug"]]
    tags = set(t.lower() for t in p.get("tags", []))
    rest = sorted(
        (x for x in posts if x["slug"] != p["slug"] and x not in picked),
        key=lambda x: (len(tags & set(t.lower() for t in x.get("tags", []))) + (2 if x["category"] == p["category"] else 0)),
        reverse=True,
    )
    return (picked + rest)[:n]


def nice_date(iso: str) -> str:
    d = date.fromisoformat(iso)
    return f"{d.day} {d.strftime('%B %Y')}"


def head(*, title: str, description: str, path: str, image: str, og_type: str, jsonld: list[dict], depth: int) -> str:
    up = "../" * depth
    ld = "\n".join(
        f'  <script type="application/ld+json">{json.dumps(obj, ensure_ascii=False)}</script>' for obj in jsonld
    )
    return f"""<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <link rel="canonical" href="{SITE}{path}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#079963">
  <meta property="og:site_name" content="Bhumitra">
  <meta property="og:locale" content="en_IN">
  <meta property="og:type" content="{og_type}">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:url" content="{SITE}{path}">
  <meta property="og:image" content="{SITE}{image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(title)}">
  <meta name="twitter:description" content="{esc(description)}">
  <meta name="twitter:image" content="{SITE}{image}">
  <meta name="apple-itunes-app" content="app-id=6760656162">
  <link rel="icon" type="image/png" href="{up}assets/img/icon-192.png">
  <link rel="apple-touch-icon" href="{up}assets/img/apple-touch-icon.png">
  <link rel="manifest" href="{up}site.webmanifest">
  <link rel="alternate" type="application/rss+xml" title="Bhumitra blog" href="{up}blog/feed.xml">
  <link rel="preload" href="{up}assets/fonts/GoogleSans-Bold.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="{up}styles.css">
{ld}
</head>"""


def header(depth: int) -> str:
    up = "../" * depth
    return f"""<body class="legal-page blog-page">
  <a class="skip" href="#main">Skip to content</a>
  <header class="legal-nav">
    <div class="container legal-nav__inner">
      <a class="brand" href="/" aria-label="Bhumitra home"><img src="{up}assets/img/bhumitra-app-icon.png" alt="" width="36" height="36">Bhumitra</a>
      <nav class="legal-nav__links" aria-label="Primary">
        <a href="/#how">How it works</a>
        <a href="/blog/">Guides</a>
        <a class="btn btn--brand" href="{IOS_URL}" target="_blank" rel="noopener">Get the app</a>
      </nav>
    </div>
  </header>"""


def footer(depth: int) -> str:
    up = "../" * depth
    return f"""  <footer><div class="container"><div class="foot"><div class="foot__by"><img src="{up}assets/img/bhumitra-app-icon.png" alt="Bhumitra" width="30" height="30"><span>Bhumitra</span></div><nav aria-label="Footer"><a href="/blog/">Guides</a><a href="/support/">Support</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/credits/">Photo credits</a><a href="mailto:{EMAIL}">{EMAIL}</a></nav></div>
  <p class="disclaimer">Bhumitra is an independent app and is not affiliated with the Government of Odisha. Guides are for general information and are not legal advice. Rates and rules change; confirm with the concerned revenue or registration office.</p></div></footer>
</body>
</html>
"""


def cta() -> str:
    return f"""<aside class="post-cta" aria-label="Download Bhumitra">
  <img src="../../assets/img/bhumitra-app-icon.png" alt="" width="64" height="64" loading="lazy">
  <div>
    <b>Check any Odisha plot on your phone</b>
    <p>Bhumitra draws official plot boundaries on a satellite map. Tap a plot to open its Record of Rights. Your first searches are free.</p>
  </div>
  <a class="store" href="{IOS_URL}" target="_blank" rel="noopener"><svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M16.37 1.43c0 1.14-.5 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.2-2.98.81-.94 2.15-1.64 3.25-1.68.03.13.06.28.06.43zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8C3.96 18.38 2.93 15.57 2.93 12.92c0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.67.95 3.6.95.86 0 2.22-1.01 3.9-1.01.61 0 2.88.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.95 4.45z"/></svg><span><small>Download on the</small><strong>App Store</strong></span></a>
</aside>"""


def card(p: dict, up: str) -> str:
    return f"""<a class="post-card" href="{p['url']}">
  <img src="{up}assets/img/blog/{p['slug']}.webp" alt="" width="600" height="315" loading="lazy">
  <div><span class="post-card__cat">{esc(p['category'])}</span><h3>{esc(p['title'])}</h3><p>{esc(p['description'])}</p><span class="post-card__meta">{p['minutes']} min read</span></div>
</a>"""


def breadcrumb_ld(items: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": f"{SITE}{path}"}
            for i, (name, path) in enumerate(items)
        ],
    }


def render_post(p: dict, posts: list[dict]) -> str:
    image = f"/assets/img/og/{p['slug']}.jpg"
    article = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": p["title"],
        "description": p["description"],
        "image": [f"{SITE}{image}"],
        "datePublished": p["date"],
        "dateModified": p["updated"],
        "inLanguage": "en-IN",
        "mainEntityOfPage": f"{SITE}{p['url']}",
        "author": {"@type": "Organization", "name": "Bhumitra", "url": f"{SITE}/"},
        "publisher": {
            "@type": "Organization",
            "name": "Bhumitra",
            "logo": {"@type": "ImageObject", "url": f"{SITE}/assets/img/icon-192.png"},
        },
        "keywords": ", ".join(p.get("tags", [])),
    }
    ld = [article, breadcrumb_ld([("Home", "/"), ("Guides", "/blog/"), (p["title"], p["url"])])]
    if p.get("faq"):
        ld.append({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                for q, a in p["faq"]
            ],
        })
    related = related_posts(p, posts)
    body, toc = add_toc(p["body"])
    faq_html = ""
    if p.get("faq"):
        items = "\n".join(
            f"<details class=\"faq__item\"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>" for q, a in p["faq"]
        )
        faq_html = f'<h2 id="faq">Frequently asked questions</h2>\n<div class="faq faq--post">\n{items}\n</div>'
    updated = (
        f' · Updated <time datetime="{p["updated"]}">{nice_date(p["updated"])}</time>'
        if p["updated"] != p["date"] else ""
    )
    return f"""{head(title=f"{p['title']} | Bhumitra", description=p['description'], path=p['url'], image=image, og_type='article', jsonld=ld, depth=2)}
{header(2)}
  <main id="main">
    <article class="post">
      <header class="post__head container">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/blog/">Guides</a></nav>
        <p class="kicker">{esc(p['category'])}</p>
        <h1>{esc(p['title'])}</h1>
        <p class="post__lede">{esc(p['description'])}</p>
        <p class="post__meta">By the Bhumitra team · <time datetime="{p['date']}">{nice_date(p['date'])}</time>{updated} · {p['minutes']} min read</p>
      </header>
      <figure class="post__cover container"><img src="../../assets/img/blog/{p['slug']}.webp" alt="{esc(p['coverAlt'])}" width="1200" height="630" fetchpriority="high"></figure>
      <div class="prose">
{toc}
{body}
{faq_html}
{cta()}
      </div>
    </article>
    <section class="related container" aria-labelledby="related-h">
      <h2 id="related-h">Keep reading</h2>
      <div class="post-grid">
{chr(10).join(card(x, '../../') for x in related)}
      </div>
    </section>
  </main>
{footer(2)}"""


def render_index(posts: list[dict]) -> str:
    desc = ("Plain-language guides to Odisha land records: Bhulekh and the Record of Rights, khata and plot numbers, "
            "land measurement units, stamp duty and what to check before buying land.")
    ld = [
        {
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "Bhumitra guides",
            "url": f"{SITE}/blog/",
            "description": desc,
            "inLanguage": "en-IN",
            "blogPost": [
                {"@type": "BlogPosting", "headline": p["title"], "url": f"{SITE}{p['url']}", "datePublished": p["date"]}
                for p in posts
            ],
        },
        breadcrumb_ld([("Home", "/"), ("Guides", "/blog/")]),
    ]
    first, rest = posts[0], posts[1:]
    cats: dict[str, list[dict]] = {}
    for p in rest:
        cats.setdefault(p["category"], []).append(p)
    chips = "".join(f'<a class="chip" href="#{slugify(c)}">{esc(c)}</a>' for c in cats)
    sections = "\n".join(
        f'<section class="blog-cat" id="{slugify(c)}" aria-labelledby="{slugify(c)}-h"><h2 id="{slugify(c)}-h">{esc(c)}</h2>'
        f'<div class="post-grid">\n{chr(10).join(card(p, "../") for p in ps)}\n</div></section>'
        for c, ps in cats.items()
    )
    return f"""{head(title='Odisha land record guides | Bhumitra', description=desc, path='/blog/', image='/assets/img/og/home.jpg', og_type='website', jsonld=ld, depth=1)}
{header(1)}
  <main id="main">
    <section class="legal-hero blog-hero"><div class="container"><p class="kicker">Guides</p><h1>Understand your land, in plain language.</h1><p>{esc(desc)}</p></div></section>
    <div class="container blog-list">
      <a class="post-feature" href="{first['url']}">
        <img src="../assets/img/blog/{first['slug']}.webp" alt="" width="1200" height="630">
        <div><span class="post-card__cat">{esc(first['category'])}</span><h2>{esc(first['title'])}</h2><p>{esc(first['description'])}</p><span class="post-card__meta">{first['minutes']} min read</span></div>
      </a>
      <nav class="blog-cats" aria-label="Topics">{chips}</nav>
{sections}
    </div>
  </main>
{footer(1)}"""


def render_feed(posts: list[dict]) -> str:
    items = "\n".join(
        f"""  <item><title>{esc(p['title'])}</title><link>{SITE}{p['url']}</link><guid>{SITE}{p['url']}</guid>
    <pubDate>{date.fromisoformat(p['date']).strftime('%a, %d %b %Y 00:00:00 +0530')}</pubDate><description>{esc(p['description'])}</description></item>"""
        for p in posts
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Bhumitra guides</title><link>{SITE}/blog/</link><language>en-in</language>
  <description>Plain-language guides to Odisha land records.</description>
{items}
</channel></rss>
"""


def render_sitemap(posts: list[dict]) -> str:
    newest = max(p["updated"] for p in posts)
    rows = [(path, newest, pr, cf) for path, pr, cf in STATIC_PAGES]
    rows += [(p["url"], p["updated"], "0.7", "monthly") for p in posts]
    urls = "\n".join(
        f"  <url><loc>{SITE}{path}</loc><lastmod>{mod}</lastmod><changefreq>{cf}</changefreq><priority>{pr}</priority></url>"
        for path, mod, pr, cf in rows
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{urls}
</urlset>
"""


def render_robots() -> str:
    return f"""User-agent: *
Allow: /
Disallow: /tools/
Disallow: /content/
Disallow: /bhumitra-standalone.html

Sitemap: {SITE}/sitemap.xml
"""


def render_credits() -> str:
    data = json.loads((ROOT / "content" / "photo-credits.json").read_text(encoding="utf-8"))
    rows = "\n".join(
        f"""<li class="credit"><img src="../assets/img/photos/{name}-sm.webp" alt="" width="160" height="100" loading="lazy">
  <div><b>{esc(c['description'])}</b><span>Photo by {esc(c['artist'] or 'unknown')}, <a href="{esc(c['licenseUrl'] or c['source'])}" target="_blank" rel="noopener license">{esc(c['license'])}</a>, via <a href="{esc(c['source'])}" target="_blank" rel="noopener">Wikimedia Commons</a>. Colour and contrast adjusted, resized and cropped.</span></div></li>"""
        for name, c in data.items()
    )
    desc = "Credits and licences for the photographs of Odisha used on the Bhumitra website."
    return f"""{head(title='Photo credits | Bhumitra', description=desc, path='/credits/', image='/assets/img/og/home.jpg', og_type='website', jsonld=[], depth=1)}
{header(1)}
  <main id="main">
    <section class="legal-hero"><div class="container"><p class="kicker">Credits</p><h1>Photo credits</h1><p>The photographs of Odisha on this site are by the photographers below, shared on Wikimedia Commons under Creative Commons licences. Thank you to each of them.</p></div></section>
    <div class="legal-content"><article class="legal-card"><ul class="credits">
{rows}
    </ul><p>Images adapted from CC BY-SA originals, including the blog thumbnails built on them, are shared under the same licence. App screenshots and illustrations are © Bhumitra.</p></article></div>
  </main>
{footer(1)}"""


def home_cards(posts: list[dict]) -> str:
    return "\n".join(card(p, "") for p in posts[:3])


def main() -> None:
    posts = load_posts()
    for p in posts:
        dest = OUT / p["slug"] / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(render_post(p, posts), encoding="utf-8")
    (OUT / "index.html").write_text(render_index(posts), encoding="utf-8")
    (OUT / "feed.xml").write_text(render_feed(posts), encoding="utf-8")
    (ROOT / "credits").mkdir(exist_ok=True)
    (ROOT / "credits" / "index.html").write_text(render_credits(), encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(render_sitemap(posts), encoding="utf-8")
    (ROOT / "robots.txt").write_text(render_robots(), encoding="utf-8")

    # Keep the "From the guides" cards on the home page in sync.
    index = ROOT / "index.html"
    text = index.read_text(encoding="utf-8")
    new = re.sub(
        r"(<!-- BLOG-CARDS:START -->).*?(<!-- BLOG-CARDS:END -->)",
        lambda m: f"{m.group(1)}\n{home_cards(posts)}\n{m.group(2)}",
        text,
        flags=re.S,
    )
    if new != text:
        index.write_text(new, encoding="utf-8")
    print(f"Built {len(posts)} posts, blog index, feed.xml, sitemap.xml, robots.txt")


if __name__ == "__main__":
    main()

# Bhumitra on the web: plan (1 Nov 2026)

Goal: the home page *is* the app. A visitor lands on a satellite map of Odisha, searches a
village or taps the map, sees every plot outlined, taps a plot and opens its land details,
just as in the iOS and Android apps. The site must also rank for searches like "bhulekh
odisha", "odisha land map" and "<village> plot map", and bring people into the apps.

---

## 1. What I found in the apps and the backend

The apps don't hold the data themselves. Everything comes from Uday's backend
(`/Users/uday/Documents/MyBhoomi/BhulekBackend`, FastAPI, live at `https://api.prettyplot.in/api/v1`).
The website can use the same backend, so the web app shows exactly what the apps show.

Tested live on 1 Nov 2026:

| What the app does | Endpoint | Auth | Tested |
|---|---|---|---|
| Search a village / place | `GET /location/search?q=` | none | 200, returns districts, villages, coordinates |
| District → tahasil → village lists | `GET /gis/districts`, `/gis/blocks`, `/gis/gps`, `/gis/villages` | none | 200 (30 districts) |
| Village outline / zoom box | `GET /gis/village/{id}/extent` | none | available |
| **All plot outlines in a village** | `GET /gis/village/{id}/parcels` | none | 200: Keonjhar village, **1,696 plots, 1.4 MB GeoJSON, 3.2 s** |
| **Tap the map → which plot** | `GET /gis/plot-at-point?lat=&lng=` | optional | 200 in 1.3 s: plot no., polygon, area, village, tahasil, district, Bhulekh ids. "No credit" by design |
| Record of Rights | `GET /ror?district=&tahasil=&village=&plot=` | device or account token | anonymous → masked preview; credits → full |
| Govt land value | `GET /ror/benchmark-valuation` | token | |
| Registration cost | `GET /ror/registration-estimate` | none | |
| Search by plot / khata | `POST /search/plot`, `/search/khata` | none | |
| Sign-in, credits, subscriptions | `/auth/*`, `/subscription/*` | token | Apple / Google sign-in, Apple IAP |

Map imagery in the apps: Esri World Imagery (licensed key) or Google tiles, plus Esri labels.
Plot lines are drawn from the parcels GeoJSON in yellow over satellite.

### Blockers found

1. **CORS.** The production backend only accepts browser requests from `bhumitra.app`,
   `api.bhumitra.app`, `admin.bhumitra.app` and `myfloatingai.in` (`core/config.py`,
   `ALLOWED_ORIGINS`). A browser on `getbhumitra.in` is refused ("Disallowed CORS origin").
   Fix: add the website's domain(s). That's a small backend change and a production deploy.
2. **Satellite tiles.** Google's tile URLs (`mt1.google.com`) are not allowed on a public
   website by Google's terms. Esri imagery needs an ArcGIS key with the site's domain
   allowed. Options: Esri via ArcGIS Location Platform (free tier, then pay per tile),
   MapTiler Satellite (free tier for low traffic), or Mapbox Satellite. One of these needs
   an account and a key from Uday.
3. **Payments.** Apple in-app purchase can't be used on the web. Credits bought in the app
   could be used on the web after sign-in, but buying on the web needs Razorpay (or
   similar) on the backend. Not needed for launch (see section 4).
4. **Abuse.** A public web map makes the free endpoints easy to scrape. Add per-IP rate
   limits and Cloudflare Turnstile (an invisible bot check) on record requests.

---

## 2. Framework decision

**Recommended: Astro + a React map island + MapLibre GL JS, deployed on Cloudflare Pages
or Vercel.**

| Need | Astro + React island | Next.js | Plain HTML (today) |
|---|---|---|---|
| Fast, crawlable SEO pages (guides, district / village pages) | Static HTML by default, near-zero JS | Good, more JS | Good |
| App-like map with state, sheets, search | React island, loaded only where needed | Good | Hard to maintain |
| Thousands of generated village pages | Static or on-demand rendering | Good | Not practical |
| Markdown guides | Built in | Plugins | Custom script (ours) |
| Hosting | Static or edge, cheap | Best on Vercel | Anywhere |

Next.js would also work. Astro wins here because most pages are content that must load fast
and rank, and only the map needs to be an app.

- **Map:** MapLibre GL JS, the open-source web version of the MapLibre engine the iOS app
  already uses. Same rendering model: raster satellite plus GeoJSON plot layers.
- **UI:** React + TypeScript, with Tailwind or CSS modules. Components mirror the iOS
  screens: search bar, map controls, plot card, land details sheet.
- **State and data:** TanStack Query (caching, retries) talking to the backend.
- **Analytics:** Firebase Analytics, already used by the apps, so web and app funnels
  compare directly. Search Console for SEO.

---

## 3. What the web app does (mirrors iOS)

Home page = full-screen map app. Layout copied from iOS `MainView` / `MapHomeOverlay`:

1. **Map** fills the screen: satellite imagery, centred on Odisha, or on the user's location
   if they allow it.
2. **Search bar** on top: "Search village, area or plot…", using `/location/search`, with
   recent searches saved on the device.
3. **Map controls** on the right: info, base map (satellite / street), plot lines on/off,
   locate me, zoom (same buttons as the iOS screenshot).
4. **Village loads:** pick a result or zoom in far enough, and the village's plots are drawn
   in yellow with plot numbers (`/gis/village/{id}/parcels`).
5. **Tap anywhere:** `/gis/plot-at-point` returns the plot; it's highlighted and a **plot
   card** slides up showing plot no., village, tahasil, district and area.
6. **"View land details"** opens the **land details sheet** (iOS `LandRecordReportView`):
   owners and shares, khata, kisam, area, remarks, other plots in the khata, government
   value, registration cost estimate, and share / save.
7. **Manual search**: district → tahasil → village → plot or khata, as in `ManualRoRSearchView`.
8. **Saved plots and recents**, stored in the browser.
9. **Area converter and cost calculator**, the same tools the app has.
10. **Get the app** prompts at natural moments (after viewing a record, on "save", on mobile).

Every map state has its own URL (`/map/keonjhar/keonjhar-sadar/<village>/plot/91`), so
it can be shared, bookmarked and indexed.

---

## 4. How records work on the web (needs Uday's decision)

| Option | What a visitor gets | Effort | Effect on app installs |
|---|---|---|---|
| **A. Map free, record in the app** (recommended launch) | Full map, all plot lines, tap any plot for area and location. The record shows a preview (masked owners), and "See the full record" opens the app | Low: no web payments, small backend change | Strongest push to the app |
| B. Same free searches as the app | Web gets a device token; the same 10 free searches a day, then a prompt to get the app | Medium: device auth + Turnstile | Good |
| C. Full web accounts | Google sign-in, credits shared with the app, Razorpay to buy on the web | High | Web becomes a second paid product |

Recommendation: launch with **A**, move to **B** once the map is live and stable, and decide
on **C** later from real numbers.

---

## 5. SEO plan (how it ranks)

The map gets people to stay. Pages are what rank:

1. **Programmatic location pages**, rendered as static HTML with real data:
   - `/odisha/<district>/` : 30 pages, "Keonjhar land records and plot map"
   - `/odisha/<district>/<tahasil>/` : about 317 pages
   - `/odisha/<district>/<tahasil>/<village>/` : about 51,000 villages, rolled out in waves,
     starting with the most-searched districts. Each page has the village name in Odia and
     English, plot count, area, neighbouring villages, a static map image of the plot
     lines, and a button that opens the live map at that village.
   These answer "bhulekh <village>", "<village> plot map" and "<village> land record". They
   are the biggest ranking opportunity because each one matches a real search.
2. **Guides**: the 16 existing articles, moved to Astro with the same URLs.
3. **Tools**: `/tools/land-unit-converter/`, `/tools/stamp-duty-calculator/`: high-volume
   searches ("decimal to square feet odisha").
4. **Technical**: sitemap index split by district, structured data (`Place`,
   `BreadcrumbList`, `FAQPage`, `MobileApplication`), canonical URLs, Odia `hreflang`
   versions later, Core Web Vitals in the green.
5. **Honesty in page titles**: say "Bhulekh records" (the data source), never imply Bhumitra
   *is* Bhulekh or a government site. That protects ranking and avoids complaints.

---

## 6. Build phases

| Phase | Deliverable | Depends on |
|---|---|---|
| 0. Setup | Astro project, design tokens from `Theme.swift`, fonts, CI, preview deploys | — |
| 1. Map core | MapLibre map, satellite + labels, locate, search, village plot lines, tap → plot card | Satellite key; CORS fix (or a dev proxy until then) |
| 2. Land details | Land details sheet with preview record, value, registration cost, share, saved plots | Record option (section 4) |
| 3. Content | Guides, tools, legal pages moved into Astro at the same URLs | — |
| 4. SEO pages | District + tahasil pages, then village pages in waves; sitemaps | Read access to the village list (exists) |
| 5. Polish and QA | Mobile gestures, accessibility, offline errors, speed budget, analytics, Turnstile | — |
| 6. Launch | Domain, Search Console, monitoring | Hosting account |

While waiting on the CORS fix, development uses a local proxy, so Phase 1 can start now.

---

## 7. Decisions needed from Uday

1. Framework: Astro + React + MapLibre (recommended), or Next.js.
2. Backend: OK for me to add the website's domain to `ALLOWED_ORIGINS` and add rate limits
   in `BhulekBackend`? You deploy it.
3. Satellite imagery: create a free account at Esri (ArcGIS Location Platform) or MapTiler
   and share the key, restricted to the website domain.
4. Records on the web: option A (recommended), B or C.
5. Domain: is the website `getbhumitra.in`, `bhumitra.app`, or both?
6. Hosting: Cloudflare Pages (recommended: free, fast in India) or Vercel.

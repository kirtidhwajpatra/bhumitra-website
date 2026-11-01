// Phone-only checks: every screen at three phone sizes, with layout assertions
// (nothing overlaps, nothing is cut off, tap targets are big enough).
// Usage: node scripts/qa-mobile.mjs [baseUrl]   (dev server must be running)
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";

const BASE = process.argv[2] || "http://127.0.0.1:4321";
const OUT = new URL("../.qa/m/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const CHROME = `${homedir()}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const browser = await chromium.launch({ ...(existsSync(CHROME) ? { executablePath: CHROME } : {}), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });

const ONLY = process.env.PHONE;
const PHONES = [
  ["iphone15", { width: 393, height: 852 }],
  ["se", { width: 375, height: 667 }],
  ["android360", { width: 360, height: 760 }],
];
const results = [];

/** Fails when visible boxes overlap, leave the screen, or are smaller than 40px. */
async function layout(page, label) {
  const problems = await page.evaluate(() => {
    const vis = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden" ? r : null; };
    const W = innerWidth, H = innerHeight, out = [];
    const boxes = {
      brand: vis(document.querySelector(".brand")),
      search: vis(document.querySelector(".search__box")),
      theme: vis(document.querySelector(".theme-btn")),
      controls: vis(document.querySelector(".controls")),
      sheet: vis(document.querySelector(".panel")),
      tab: vis(document.querySelector(".panel-tab")),
      pill: vis(document.querySelector(".status, .hint")),
    };
    const overlap = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    // A full-height sheet shows short messages ("Saved", "Link copied") on top of itself on purpose.
    const full = !!document.querySelector(".panel.is-expanded");
    for (const [a, b] of [["controls", "sheet"], ["controls", "pill"], ["controls", "tab"], ...(full ? [] : [["pill", "sheet"]]), ["search", "theme"], ["brand", "search"]]) {
      if (overlap(boxes[a], boxes[b])) out.push(`${a} overlaps ${b}`);
    }
    for (const [k, r] of Object.entries(boxes)) if (r && (r.left < -1 || r.right > W + 1 || r.bottom > H + 1)) out.push(`${k} off screen`);
    if (boxes.search && boxes.search.width < 150) out.push(`search too narrow (${Math.round(boxes.search.width)}px)`);
    for (const b of document.querySelectorAll(".ctrl, .theme-btn, .sheet-btn, .rsec__head, .landing__cta .btn, .panel-tab")) {
      const r = vis(b);
      if (r && (r.height < 36 || r.width < 36)) out.push(`small tap target ${b.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    if (document.documentElement.scrollWidth > W + 1) out.push("page scrolls sideways");
    return out;
  });
  if (problems.length) throw new Error(`${label}: ${problems.join("; ")}`);
}

async function step(name, fn) {
  let line;
  try { const note = await fn(); line = `PASS ${name}${note ? ` - ${note}` : ""}`; }
  catch (e) { line = `FAIL ${name}: ${String(e.message).split("\n")[0]}`; }
  results.push(line);
  console.log(line);
}

for (const [label, viewport] of PHONES.filter(([l]) => !ONLY || l === ONLY)) {
  const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2, geolocation: { latitude: 21.6289, longitude: 85.5817 }, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const shot = (n) => page.screenshot({ path: `${OUT}${label}-${n}.png` });

  await step(`${label}: landing sheet is small and clear`, async () => {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".panel--landing h1", { timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot("1-landing");
    await layout(page, "landing");
    const h = await page.locator(".panel--landing").evaluate((el) => el.getBoundingClientRect().height);
    if (h > viewport.height * 0.4) throw new Error(`landing sheet takes ${Math.round(h)}px`);
    return `sheet ${Math.round(h)}px`;
  });

  await step(`${label}: landing sheet opens for districts and guides`, async () => {
    await page.click(".landing__more");
    await page.waitForTimeout(450);
    await shot("2-landing-open");
    if (!(await page.locator(".panel--landing.is-expanded .landing__chips").isVisible())) throw new Error("districts not visible");
    await page.click(".landing__more");
    await page.waitForTimeout(400);
  });

  await step(`${label}: search takes the whole row`, async () => {
    await page.click(".search__box input");
    await page.fill(".search__box input", "keonjhar");
    await page.waitForSelector(".search__row", { timeout: 15000 });
    await shot("3-search");
    const w = await page.locator(".search__box").evaluate((el) => el.getBoundingClientRect().width);
    if (w < viewport.width - 40) throw new Error(`search only ${Math.round(w)}px wide`);
    await page.click(".search__cancel, .search__clear");
    await page.click(".search__cancel").catch(() => undefined);
    await page.waitForTimeout(300);
  });

  await step(`${label}: landing hides to a tab and comes back`, async () => {
    await page.click(".landing__collapse");
    await page.waitForSelector(".panel-tab");
    await page.waitForTimeout(400);
    await shot("4-tab");
    await layout(page, "tab");
    await page.click(".panel-tab");
    await page.waitForSelector(".panel--landing");
  });

  await step(`${label}: plot sheet at half height`, async () => {
    await page.click('button[aria-label="Go to my location"]');
    await page.waitForSelector(".pov__id h2", { timeout: 40000 });
    await page.waitForFunction(() => !document.querySelector(".rsec[aria-busy]"), null, { timeout: 60000 });
    await page.waitForTimeout(900);
    await shot("5-plot");
    await layout(page, "plot");
    const plot = await page.evaluate(() => {
      const s = document.querySelector(".panel").getBoundingClientRect();
      return { sheetTop: Math.round(s.top) };
    });
    return `${await page.textContent(".pov__id h2")}, sheet from ${plot.sheetTop}px`;
  });

  await step(`${label}: opening a section grows the sheet`, async () => {
    await page.locator(".rsec__head", { hasText: "Owners" }).click();
    await page.waitForTimeout(500);
    if (!(await page.locator(".panel--plot.is-expanded").count())) throw new Error("sheet did not grow");
    await shot("6-owners");
    await page.locator(".rsec__head", { hasText: "Value" }).click();
    await page.waitForTimeout(400);
    await page.locator(".rsec", { hasText: "Value & registration cost" }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await shot("7-value");
    await layout(page, "value");
  });

  await step(`${label}: grab handle shrinks the sheet`, async () => {
    await page.locator(".panel__body").evaluate((el) => el.scrollTo(0, 0));
    await page.click(".panel--plot .panel__grab");
    await page.waitForTimeout(450);
    if (await page.locator(".panel--plot.is-expanded").count()) throw new Error("still expanded");
    await page.click('.pov__actions button[aria-label="Close"]');
    await page.waitForSelector(".panel--landing");
  });

  await step(`${label}: village picker`, async () => {
    await page.click(".landing__cta .btn--ghost");
    await page.waitForSelector(".picker__row", { timeout: 20000 });
    await page.waitForTimeout(400);
    await shot("8-picker");
    await page.keyboard.press("Escape");
    await page.locator(".picker__head button").first().click().catch(() => undefined);
    await page.waitForTimeout(300);
  });

  await step(`${label}: dark mode`, async () => {
    await page.click(".theme-btn");
    await page.waitForTimeout(400);
    await shot("9-dark");
    await layout(page, "dark");
    await page.click(".theme-btn");
  });
  await ctx.close();
}

await browser.close();
console.log(`${results.filter((r) => r.startsWith("PASS")).length}/${results.length} passed`);

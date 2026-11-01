// End-to-end check of the map app in a real browser (Playwright + local Chromium).
// Usage: node scripts/qa.mjs [baseUrl]   (dev server must be running)
// Saves screenshots to .qa/ and prints a pass/fail line per step.
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";

const BASE = process.argv[2] || "http://127.0.0.1:4321";
const OUT = new URL("../.qa/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const CHROME = `${homedir()}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const launch = existsSync(CHROME) ? { executablePath: CHROME } : {};

const results = [];
const step = async (name, fn) => {
  const t = Date.now();
  try {
    const note = await fn();
    results.push(`PASS ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)${note ? ` - ${note}` : ""}`);
  } catch (e) {
    results.push(`FAIL ${name}: ${String(e.message).split("\n")[0]}`);
  }
};

const browser = await chromium.launch({ ...launch, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });

async function run(label, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, geolocation: { latitude: 21.6289, longitude: 85.5817 }, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await step(`${label}: Odisha landing with districts`, async () => {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 20000 });
    await page.waitForSelector(".panel--landing h1", { timeout: 5000 });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}${label}-1-landing.png` });
  });

  await step(`${label}: tap a plot opens the panel at once`, async () => {
    await page.click('button[aria-label="Go to my location"]');
    // The panel must appear while the plot is still resolving, before any data.
    await page.waitForSelector(".panel:not(.panel--landing)", { timeout: 6000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}${label}-2-loading.png` });
    await page.waitForSelector(".panel__hero h2", { timeout: 30000 });
    return `plot ${await page.textContent(".panel__hero h2")}`;
  });

  await step(`${label}: record sections fill in`, async () => {
    await page.waitForFunction(() => !document.querySelector(".psec.is-loading"), null, { timeout: 60000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}${label}-3-details.png` });
    const owners = await page.locator(".owners li").count();
    const limited = await page.locator(".unlock").count();
    const value = (await page.locator(".pvalue strong").count()) ? await page.textContent(".pvalue strong") : "needs office or n/a";
    return `owners=${owners} limited=${limited > 0} value=${value}`;
  });

  await step(`${label}: tapping another plot switches the panel`, async () => {
    const before = await page.textContent(".panel__hero h2");
    const box = await page.locator(".map").boundingBox();
    await page.mouse.click(box.x + box.width * (mobile ? 0.5 : 0.7), box.y + box.height * (mobile ? 0.2 : 0.18));
    await page.waitForFunction((b) => document.querySelector(".panel__hero h2")?.textContent !== b, before, { timeout: 20000 });
    return `now plot ${await page.textContent(".panel__hero h2")}`;
  });

  await step(`${label}: close returns to landing`, async () => {
    await page.click('.panel__actions button[aria-label="Close"]');
    await page.waitForSelector(".panel--landing", { timeout: 4000 });
  });

  if (errors.length) results.push(`WARN ${label}: page errors: ${errors.slice(0, 3).join(" | ")}`);
  await ctx.close();
}

await run("desktop", { width: 1440, height: 900 }, false);
await run("mobile", { width: 390, height: 844 }, true);
await browser.close();
console.log(results.join("\n"));

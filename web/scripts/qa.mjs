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
  try {
    await fn();
    results.push(`PASS ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}: ${String(e.message).split("\n")[0]}`);
  }
};

const browser = await chromium.launch({ ...launch, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });

async function run(label, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, geolocation: { latitude: 21.6289, longitude: 85.5817 }, permissions: ["geolocation"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await step(`${label}: map loads`, async () => {
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}${label}-1-start.png` });
  });

  await step(`${label}: search shows results`, async () => {
    await page.fill(".search input", "Keonjhar");
    await page.waitForSelector(".search__row", { timeout: 15000 });
    await page.screenshot({ path: `${OUT}${label}-2-search.png` });
    await page.click(".search__row");
    await page.waitForTimeout(2500);
  });

  await step(`${label}: locate loads plots near you`, async () => {
    await page.click('button[aria-label="Go to my location"]');
    await page.waitForSelector(".plot-card", { timeout: 30000 });
    await page.waitForFunction(() => Number(document.querySelector(".app")?.getAttribute("data-plots")) > 0, null, { timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}${label}-3-plot.png` });
  });

  await step(`${label}: tapping another plot selects it`, async () => {
    const before = await page.textContent(".plot-card__title h2");
    const box = await page.locator(".map").boundingBox();
    // Tap away from the selected plot, upper part of the map.
    await page.mouse.click(box.x + box.width * (mobile ? 0.5 : 0.62), box.y + box.height * (mobile ? 0.22 : 0.14));
    await page.waitForFunction((b) => document.querySelector(".plot-card__title h2")?.textContent !== b, before, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}${label}-4-plot2.png` });
  });

  await step(`${label}: land details opens with record`, async () => {
    await page.click(".plot-card .btn--primary");
    await page.waitForSelector(".details", { timeout: 5000 });
    await page.waitForSelector(".details__facts, .details__card--error", { timeout: 45000 });
    await page.screenshot({ path: `${OUT}${label}-5-details.png` });
  });

  await step(`${label}: village picker lists districts`, async () => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await page.click(".search input");
    await page.click(".search__browse");
    await page.waitForSelector(".picker__row", { timeout: 15000 });
    await page.screenshot({ path: `${OUT}${label}-6-picker.png` });
  });

  if (errors.length) results.push(`WARN ${label}: page errors: ${errors.slice(0, 3).join(" | ")}`);
  await ctx.close();
}

await run("desktop", { width: 1440, height: 900 }, false);
await run("mobile", { width: 390, height: 844 }, true);
await browser.close();
console.log(results.join("\n"));

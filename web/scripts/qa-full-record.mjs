// Visual check of the land panel when a full record is returned (signed-in or within free
// searches). Network responses for /api/ror and the land value are replaced with sample
// data shaped like the backend models (models/ror_response.py, models/igr_benchmark.py).
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";

const BASE = process.argv[2] || "http://127.0.0.1:4321";
const OUT = new URL("../.qa/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const CHROME = `${homedir()}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

const ror = {
  success: true, plot: "91", village: "କେନ୍ଦୁଝର ନିଜଗଡ଼ ୟୁ.ନ. 2", district: "କେନ୍ଦୁଝର", tahasil: "ସଦର",
  khata_number: "212", area: "2.2300 Acre", land_type: "ଘରବାଡ଼ି",
  owners: [
    { name: "ରଘୁନାଥ ମହାନ୍ତ", relation: "ପି:", relation_name: "ଲୋକନାଥ ମହାନ୍ତ", share: "1/2" },
    { name: "ହରେକୃଷ୍ଣ ମହାନ୍ତ", relation: "ପି:", relation_name: "ଲୋକନାଥ ମହାନ୍ତ", share: "1/4" },
    { name: "ଦାମଦର ମହାନ୍ତ", relation: "ପି:", relation_name: "ଲୋକନାଥ ମହାନ୍ତ", share: "1/4" },
  ],
  plots: [
    { plot_number: "91", area: "2.2300 Acre", land_type: "ଘରବାଡ଼ି", remarks: "" },
    { plot_number: "108", area: "0.4100 Acre", land_type: "ଶାରଦ ଦୁଇ" },
    { plot_number: "109", area: "0.1250 Acre", land_type: "ବାଗାୟତ" },
  ],
  raw_fields: { tenure: "ସ୍ଥିତିବାନ" }, is_preview: false, is_locked: false,
};
const value = {
  status: "AVAILABLE", registration_office: "KENDUJHAR", village_thana: "KEONJHAR NIJIGARH - 2", kisam: "GHARABARI",
  unit_rates: { per_acre: 8500000, per_decimal_100: 85000, per_square_foot: 195.13 },
  highest_transaction_value: 2350000, transaction_date: "14 Mar 2025",
  calculation: { indicative_benchmark_amount: 18964350, formula: "223.11 Decimal × ₹85,000/Decimal" },
};

const browser = await chromium.launch({ ...(existsSync(CHROME) ? { executablePath: CHROME } : {}), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"] });
for (const [label, viewport, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["mobile", { width: 390, height: 844 }, true]]) {
  const page = await (await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile })).newPage();
  await page.route(/\/api\/ror\?/, (r) => r.fulfill({ json: ror }));
  await page.route(/\/api\/ror\/benchmark-valuation/, (r) => r.fulfill({ json: value }));
  await page.goto(`${BASE}/?plot=91&lat=21.6289&lng=85.5817`);
  await page.waitForSelector(".rowners li", { timeout: 40000 });
  await page.waitForFunction(() => !document.querySelector(".rsec[aria-busy]"), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  if (mobile) await page.click(".panel__grab");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}full-${label}-1.png` });
  for (const t of ["Value & registration cost", "Sales history"]) await page.locator(".rsec__head", { hasText: t }).click();
  await page.locator(".rlink", { hasText: "Estimate" }).click();
  await page.waitForTimeout(400);
  await page.locator(".panel__body").evaluate((el) => el.scrollTo(0, el.scrollHeight * 0.45));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}full-${label}-2.png` });
  await page.locator(".panel__body").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}full-${label}-3.png` });
  console.log(label, "owners:", await page.locator(".rowners li").count(), "value:", await page.textContent(".pamber strong"));
}
await browser.close();

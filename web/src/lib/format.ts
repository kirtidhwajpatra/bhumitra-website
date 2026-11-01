// Indian number formatting and Odisha statutory rates (from the app's OdishaStatutoryRates).

export const RATES = { stampStandard: 0.05, stampWoman: 0.04, registration: 0.02 } as const;

export function inr(n: number | null | undefined, digits = 0): string {
  if (n == null || !isFinite(n)) return "—";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** Short form for big values: ₹18.5 lakh, ₹2.3 crore. */
export function inrShort(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} crore`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} lakh`;
  return inr(n);
}

export function dealCosts(base: number, woman: boolean) {
  const stamp = base * (woman ? RATES.stampWoman : RATES.stampStandard);
  const reg = base * RATES.registration;
  return { stamp, reg, total: stamp + reg };
}

/** "1/2" style shares; the parser sometimes returns decimals. */
export function share(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\s+/g, "");
}

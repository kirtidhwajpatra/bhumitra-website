// Land record helpers ported from the iOS app (RoRModels.parse, LandAreaUnitConverter,
// LandAreaFormat, LandClassificationHelper), so the website reads a record the same way.
import type { RoRResponse } from "./types";

export interface ParsedOwner {
  name: string;
  relationType: string | null;
  relationName: string | null;
  residence: string | null;
}

/**
 * Splits a Bhulekh owner string ("ନାମ ପି: ବାପାଙ୍କ ନାମ ଜା: … ବା: ଗାଁ") into its parts.
 * Caste (ଜା:) is dropped and never shown, same as the app.
 */
export function parseOwner(raw: string): ParsedOwner {
  let s = raw.trim().replace(/ସ୍ବା:/g, "ସ୍ୱା:");
  const out: ParsedOwner = { name: s, relationType: null, relationName: null, residence: null };
  if (!s) return out;

  if (/ପି:|ସ୍ୱା:|ସ୍ଵା:|ମା:|ଜା:|ବା:/.test(s)) {
    const cut = (marker: string): string | null => {
      const i = s.indexOf(marker);
      if (i < 0) return null;
      const after = s.slice(i + marker.length).trim();
      s = s.slice(0, i).trim();
      return after || null;
    };
    out.residence = cut("ବା:");
    cut("ଜା:");
    for (const [marker, label] of [["ସ୍ୱା:", "Husband"], ["ସ୍ଵା:", "Husband"], ["ପି:", "Father"], ["ମା:", "Mother"]] as const) {
      if (s.includes(marker)) {
        out.relationName = cut(marker);
        out.relationType = label;
        break;
      }
    }
    out.name = s || raw.trim();
    return out;
  }

  const m = s.match(/^(.*?)\s+(S\/O\.?|D\/O\.?|W\/O\.?|C\/O\.?|FATHER:|HUSBAND:)\s+(.*)$/i);
  if (m) {
    const p = m[2].toUpperCase();
    out.name = m[1].trim() || s;
    out.relationType = p.startsWith("W") || p.startsWith("H") ? "Husband" : p.startsWith("C") ? "Guardian" : "Father";
    out.relationName = m[3].trim() || null;
  }
  return out;
}

/** Same rule as the app's isGovernmentLand. */
export function isGovernmentLand(r: RoRResponse): boolean {
  const owners = r.owners.map((o) => o.name.toLowerCase()).join(" ");
  const tenure = (r.raw_fields?.tenure ?? "").toLowerCase();
  const kisam = (r.land_type ?? "").toLowerCase();
  return /sarkar|government|odisha|ସରକାର/.test(owners) || /rakhit|sarbasadharana|ରକ୍ଷିତ|ସର୍ବସାଧାରଣ/.test(tenure) || kisam.includes("sarbasadharana");
}

const SQM = { acre: 4046.8564224, decimal: 40.468564224, hectare: 10000, sqft: 0.09290304, sqm: 1, guntha: 101.17141056 };

/** Bhulekh's 4-digit decimal notation: "1400" means 14 decimal. */
function decimalToken(t: string): number {
  const n = Number(t);
  if (!isFinite(n)) return 0;
  if (t.includes(".")) return n;
  if (t.length === 4) return n / 100;
  if (t.length === 3) return n / 10;
  return n;
}

/** Square metres from a Bhulekh extent such as "2 Acre 1400 Decimal". Null when it can't be read. */
export function parseAreaSqM(raw: string | null | undefined): number | null {
  const s = (raw ?? "").trim();
  if (!s || s === "-" || s === "—") return null;
  let m = s.match(/(\d+(?:\.\d+)?)\s*(?:Acres?|Ac|A)\s+(\d+(?:\.\d+)?)\s*(?:Decimals?|Dec|D)?/i);
  if (m) return (Number(m[1]) + decimalToken(m[2]) / 100) * SQM.acre;
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:Decimals?|Dec|D)$/i);
  if (m) return decimalToken(m[1]) * SQM.decimal;
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:Acres?|Ac|A)$/i);
  if (m) return Number(m[1]) * SQM.acre;
  m = s.match(/^([\d,]+(?:\.\d+)?)\s*(?:Sq\s*Ft|Square\s*Feet|Sqft)$/i);
  if (m) return Number(m[1].replace(/,/g, "")) * SQM.sqft;
  return null;
}

function trim2(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

/** "2.14 acres", "1 acre" or "45 decimal" for plots under an acre. */
export function areaPrimary(sqm: number | null): string | null {
  if (!sqm) return null;
  const acres = sqm / SQM.acre;
  if (acres >= 1) {
    const n = trim2(acres);
    return n === "1" ? "1 acre" : `${n} acres`;
  }
  return `${trim2(sqm / SQM.decimal)} decimal`;
}

/** The same area in the two other units buyers ask about. */
export function areaSecondary(sqm: number | null): string | null {
  if (!sqm) return null;
  const acres = sqm / SQM.acre;
  const lead = acres >= 1 ? `${trim2(sqm / SQM.decimal)} decimal` : `${trim2(acres)} acre`;
  return `${lead} · ${Math.round(sqm / SQM.sqft).toLocaleString("en-IN")} sq ft`;
}

export function areaConversions(sqm: number): { unit: string; value: string }[] {
  const f = (n: number, d = 2) => n.toLocaleString("en-IN", { maximumFractionDigits: d });
  return [
    { unit: "Acre", value: f(sqm / SQM.acre, 4) },
    { unit: "Decimal", value: f(sqm / SQM.decimal) },
    { unit: "Hectare", value: f(sqm / SQM.hectare, 4) },
    { unit: "Guntha", value: f(sqm / SQM.guntha) },
    { unit: "Square feet", value: f(sqm / SQM.sqft, 0) },
    { unit: "Square metre", value: f(sqm, 0) },
  ];
}

export const SQM_PER_ACRE = SQM.acre;

/** Plain-English meaning of a kisam (land type), when the app knows it. */
export function kisamMeaning(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return null;
  const rules: [RegExp, string][] = [
    [/ଘରବାରି|ଘରବାରୀ|ବାସସ୍ଥାନ|gharabari|homestead|residential|makaa?n|basa/, "Homestead or residential land."],
    [/ଶାରଦ|ସାରଦ|sarada?|ଧାନ|paddy|wetland|irrigated|ଜଳାସିକ|ଦୋଫସଲ|dofasali/, "Wetland for irrigated and seasonal paddy."],
    [/ବିଆଳି|biali|autumn/, "Upland field for autumn rice and other seasonal crops."],
    [/ତଇଳା|taila|toila|dry land|upland|rainfed/, "Rainfed dry upland for pulses, millets and dry crops."],
    [/ଡଙ୍ଗର|dangar|dongar|highland|hilly|pahad/, "Highland, usually for rainfed upland farming."],
    [/ବାଗାୟତ|ବଗିଚା|ବାଗାନ|bagayat|orchard|plantation|garden|bagicha/, "Orchard or plantation land."],
    [/ଖଳାବାରି|ଖଳାବାରୀ|ଖଳା|ବାରି|khalabari|bari|khala|khari/, "Garden or threshing ground next to the homestead."],
    [/ଗୋଚର|gochar|pasture|grazing|charagah/, "Village pasture for grazing cattle."],
    [/ପତିତ|ଅନାବାଦୀ|patita|anabadi|fallow|waste|barren/, "Fallow or uncultivated land."],
    [/ଜଳାଶୟ|ପୋଖରୀ|ଗାଡ଼ିଆ|ନଦୀ|ନାଳ|jalashaya|pokhari|pond|river|water|nala/, "Pond, tank, river or channel."],
    [/ରାସ୍ତା|ସଡ଼କ|rasta|road|pathway|street|gali/, "Road, village path or government right of way."],
    [/ଜଙ୍ଗଲ|jangal|jungle|forest/, "Forest land under state forest rules."],
    [/ସରକାରୀ|ରକ୍ଷିତ|ସର୍ବସାଧାରଣ|sarkari|rakhit|government|public|sarbasadharan/, "Government land kept for public use."],
    [/ଚାନ୍ଦିନା|chandina|commercial|market|bazaar|dukan/, "Non-farm land for shops and markets."],
    [/ଭିଟା|ଢିହ|bhita|bhit|dhiha/, "Raised ground safe from floods, suited to houses."],
    [/ଆବାଦ|କୃଷି|abada|krishi|cultivable|agricultural/, "Farmland fit for growing crops."],
  ];
  for (const [re, text] of rules) if (re.test(s)) return text;
  return null;
}

/** Plain-English meaning of the tenure (ownership type). */
export function tenureMeaning(raw: string | null | undefined): string | null {
  const s = (raw ?? "").toLowerCase();
  if (/ରୟତି|ସ୍ଥିତିବାନ|rayati|stitiban/.test(s)) return "Private holding with permanent, inheritable rights.";
  if (/ରକ୍ଷିତ|rakhit/.test(s)) return "Government land kept reserved.";
  if (/ସର୍ବସାଧାରଣ|sarbasadharan/.test(s)) return "Government land for common public use.";
  return null;
}

/** "ଅ" style initial for the owner avatar; works for Odia and Latin names. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => Array.from(p)[0] ?? "").join("");
  return letters ? letters.toUpperCase() : "?";
}

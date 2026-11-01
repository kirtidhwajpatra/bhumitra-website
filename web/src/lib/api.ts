// Thin client for the Bhumitra backend. All calls go to same-origin /api/*, which the
// dev server (astro.config.mjs) or the Pages Function (functions/api) forwards.
import { clearToken, getToken } from "./session";
import type {
  AdminItem,
  BenchmarkResponse,
  EstimateResponse,
  Extent,
  Jurisdiction,
  PlotAtPointResponse,
  RoRResponse,
  SearchResponse,
  VillageContext,
} from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | null | undefined>;

async function request<T>(path: string, opts: { params?: Params; body?: unknown; auth?: boolean; signal?: AbortSignal } = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.params ?? {})) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const url = `/api/${path}${qs.size ? `?${qs}` : ""}`;

  const send = async (token: string | null) => {
    const headers: Record<string, string> = { accept: "application/json" };
    if (opts.body !== undefined) headers["content-type"] = "application/json";
    if (token) headers.authorization = `Bearer ${token}`;
    return fetch(url, {
      method: opts.body !== undefined ? "POST" : "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  };

  // Bhulekh can be very slow; give up after 45 s so the panel can offer "Try again".
  const timeout = AbortSignal.timeout(45000);
  opts.signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;

  let res = await send(opts.auth ? await getToken() : null);
  if (res.status === 401 && opts.auth) {
    clearToken();
    res = await send(await getToken(true));
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const body = await res.json();
      const d = body?.detail ?? body;
      message = d?.message ?? (typeof d === "string" ? d : message);
      code = d?.code;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message, code);
  }
  return res.json() as Promise<T>;
}

const where = (v: VillageContext, plot: string) => ({
  district: v.districtName,
  tahasil: v.tahasilName,
  village: v.villageName,
  plot,
  b_id: v.tahasilId,
  v_id: v.villageId,
});

const pickedOffice = (j?: Jurisdiction | null) =>
  j ? { selected_regoff_id: j.regoffId, selected_village_id: j.villageId, candidate_token: j.token } : {};

export const api = {
  search: (q: string, signal?: AbortSignal) => request<SearchResponse>("location/search", { params: { q }, signal }),

  districtsGeo: () => request<GeoJSON.FeatureCollection>("gis/navigation/districts-geojson"),
  districts: () => request<AdminItem[]>("gis/districts", { params: { state: "ODISHA" } }),
  blocks: (districtId: string) => request<AdminItem[]>("gis/blocks", { params: { district_id: districtId, state: "ODISHA" } }),
  gps: (blockId: string) => request<AdminItem[]>("gis/gps", { params: { block_id: blockId, state: "ODISHA" } }),
  villages: (blockId: string, gpId: string) =>
    request<AdminItem[]>("gis/villages", { params: { block_id: blockId, gp_id: gpId, state: "ODISHA" } }),

  extent: (villageId: string) => request<Extent>(`gis/village/${encodeURIComponent(villageId)}/extent`, { params: { state: "ODISHA" } }),

  parcels: (v: VillageContext, signal?: AbortSignal) =>
    request<GeoJSON.FeatureCollection>(`gis/village/${encodeURIComponent(v.villageId)}/parcels`, {
      params: { state: "ODISHA", district_name: v.districtName, block_name: v.tahasilName, village_name: v.villageName },
      signal,
    }),

  plotAtPoint: (lat: number, lng: number, signal?: AbortSignal) =>
        // Sent with the guest session so the rate limit counts this device, not a shared mobile IP.
    request<PlotAtPointResponse>("gis/plot-at-point", { params: { lat: lat.toFixed(7), lng: lng.toFixed(7) }, auth: true, signal }),

  /** Full Record of Rights, using the guest session's free searches (same rules as the app). */
  ror: (v: VillageContext, plot: string, signal?: AbortSignal) => request<RoRResponse>("ror", { params: where(v, plot), auth: true, signal }),

  /** Masked preview, used when the session has no searches left. */
  rorPreview: (v: VillageContext, plot: string, signal?: AbortSignal) =>
    request<RoRResponse>("ror", { params: { ...where(v, plot), preview: true }, auth: true, signal }),

  benchmark: (v: VillageContext, plot: string, areaAcre: number | null, j?: Jurisdiction | null, signal?: AbortSignal) =>
    request<BenchmarkResponse>("ror/benchmark-valuation", {
      params: { ...where(v, plot), actual_area: areaAcre?.toFixed(4), actual_area_unit: areaAcre ? "Acre" : undefined, ...pickedOffice(j) },
      auth: true,
      signal,
    }),

  estimate: (
    v: VillageContext,
    plot: string,
    o: { areaAcre: number; kisam?: string | null; woman: boolean; jurisdiction?: Jurisdiction | null },
    signal?: AbortSignal,
  ) =>
    request<EstimateResponse>("ror/registration-estimate", {
      body: {
        ...where(v, plot),
        area: Number(o.areaAcre.toFixed(4)),
        unit: "Acre",
        kism: o.kisam ?? undefined,
        deed_type: "SALE IMMOVABLE",
        deed_id: 1,
        buyer_category: o.woman ? "WOMEN_BUYER" : "STANDARD",
        ...(o.jurisdiction
          ? { selected_regoff_id: o.jurisdiction.regoffId, selected_village_id: o.jurisdiction.villageId, candidate_token: o.jurisdiction.token }
          : {}),
      },
      auth: true,
      signal,
    }),
};

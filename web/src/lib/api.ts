// Thin client for the Bhumitra backend. All calls go to same-origin /api/*, which the
// dev server (astro.config.mjs) or the Pages Function (functions/api) forwards.
import type {
  AdminItem,
  Extent,
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

async function get<T>(path: string, params: Record<string, string | undefined> = {}, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, v);
  const url = `/api/${path}${qs.size ? `?${qs}` : ""}`;
  const res = await fetch(url, { signal, headers: { accept: "application/json" } });
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

export const api = {
  search: (q: string, signal?: AbortSignal) => get<SearchResponse>("location/search", { q }, signal),

  districts: () => get<AdminItem[]>("gis/districts", { state: "ODISHA" }),
  blocks: (districtId: string) => get<AdminItem[]>("gis/blocks", { district_id: districtId, state: "ODISHA" }),
  gps: (blockId: string) => get<AdminItem[]>("gis/gps", { block_id: blockId, state: "ODISHA" }),
  villages: (blockId: string, gpId: string) =>
    get<AdminItem[]>("gis/villages", { block_id: blockId, gp_id: gpId, state: "ODISHA" }),

  extent: (villageId: string) => get<Extent>(`gis/village/${encodeURIComponent(villageId)}/extent`, { state: "ODISHA" }),

  parcels: (v: VillageContext, signal?: AbortSignal) =>
    get<GeoJSON.FeatureCollection>(
      `gis/village/${encodeURIComponent(v.villageId)}/parcels`,
      { state: "ODISHA", district_name: v.districtName, block_name: v.tahasilName, village_name: v.villageName },
      signal,
    ),

  plotAtPoint: (lat: number, lng: number, signal?: AbortSignal) =>
    get<PlotAtPointResponse>("gis/plot-at-point", { lat: lat.toFixed(7), lng: lng.toFixed(7) }, signal),

  /** Anonymous web visitors get the masked preview of the Record of Rights. */
  ror: (v: VillageContext, plot: string, signal?: AbortSignal) =>
    get<RoRResponse>(
      "ror",
      {
        district: v.districtName,
        tahasil: v.tahasilName,
        village: v.villageName,
        plot,
        b_id: v.tahasilId,
        v_id: v.villageId,
        preview: "true",
      },
      signal,
    ),
};

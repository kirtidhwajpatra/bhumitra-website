// Shapes returned by the Bhumitra backend (api.prettyplot.in/api/v1).

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: string;
  latitude: number;
  longitude: number;
  boundingBox?: number[] | null;
  revenueVillageId?: string | null;
  gisBlockId?: string | null;
  district?: string | null;
  tahasil?: string | null;
  revenueVillage?: string | null;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface AdminItem {
  id: string;
  name: string;
}

export interface Extent {
  min_lng: number;
  min_lat: number;
  max_lng: number;
  max_lat: number;
  center_lng: number;
  center_lat: number;
}

/** The village whose plot lines are on the map. */
export interface VillageContext {
  villageId: string;
  villageName: string;
  villageNameOdia?: string;
  tahasilId: string;
  tahasilName: string;
  districtId?: string;
  districtName: string;
}

export interface PlotAtPoint {
  plot_number: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  centroid: [number, number];
  area_acre?: number | null;
  village_id: string;
  village_name: string;
  village_display_name?: string;
  tahasil_id: string;
  tahasil_name: string;
  district_id: string;
  district_name: string;
  bhulekh_village_name_odia?: string;
}

export interface PlotAtPointResponse {
  status: "exact" | "snapped" | "none" | string;
  plot: PlotAtPoint | null;
  message?: string;
}

/** A plot the user has selected, from a tap or a search. */
export interface SelectedPlot {
  plotNumber: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  areaAcre: number | null;
  village: VillageContext;
}

export interface RoROwner {
  name: string;
  relation?: string | null;
  relation_name?: string | null;
  share?: string | null;
}

export interface RoRResponse {
  success: boolean;
  plot: string;
  village?: string;
  district?: string;
  tahasil?: string;
  khata_number?: string | null;
  area?: string | null;
  land_type?: string | null;
  owners: RoROwner[];
  source?: string;
  is_preview?: boolean;
  is_locked?: boolean;
  preview_message?: string | null;
}

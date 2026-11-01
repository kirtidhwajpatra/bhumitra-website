// Shapes returned by the Bhumitra backend (api.prettyplot.in/api/v1).

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: string;
  latitude: number;
  longitude: number;
  boundingBox?: number[] | null;
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
  tahasil_id: string;
  tahasil_name: string;
  district_id: string;
  district_name: string;
  bhulekh_village_name_odia?: string;
}

export interface PlotAtPointResponse {
  status: string;
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

export interface RoRPlot {
  plot_number: string;
  area?: string | null;
  land_type?: string | null;
  remarks?: string | null;
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
  plots: RoRPlot[];
  raw_fields?: Record<string, string>;
  source?: string;
  is_preview?: boolean;
  is_locked?: boolean;
}

export interface IGRCandidate {
  candidate_token: string;
  registration_office_id: number;
  registration_office_name: string;
  village_id: number;
  village_name: string;
  confidence: string;
}

export interface BenchmarkResponse {
  status: "AVAILABLE" | "NOT_FOUND" | "AMBIGUOUS" | "MAPPING_REQUIRES_USER_SELECTION" | string;
  message?: string | null;
  registration_office?: string | null;
  village_thana?: string | null;
  kisam?: string | null;
  unit_rates?: {
    per_acre: number;
    per_decimal_100: number;
    per_square_foot: number;
  } | null;
  highest_transaction_value?: number | null;
  transaction_date?: string | null;
  calculation?: { indicative_benchmark_amount?: number | null; formula?: string | null } | null;
  candidates?: IGRCandidate[] | null;
}

export interface EstimateResponse {
  status: string;
  message?: string | null;
  stamp_duty?: number | null;
  registration_fee?: number | null;
  total_government_charges?: number | null;
  women_buyer_concession_applicable?: boolean;
  concession_amount?: number | null;
  total_after_concession?: number | null;
  benchmark_value_for_area?: number | null;
}

/** Selected IGR jurisdiction when the backend can't pick one on its own. */
export interface Jurisdiction {
  regoffId: number;
  villageId: number;
  token: string;
  label: string;
}

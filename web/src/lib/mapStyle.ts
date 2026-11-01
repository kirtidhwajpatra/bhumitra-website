// MapLibre style for the Bhumitra web map. Mirrors the iOS MapLibreView layers:
// satellite raster + place labels, yellow plot outlines, highlighted selected plot.
import type { StyleSpecification } from "maplibre-gl";

// Satellite and labels default to Esri's public World Imagery endpoints for development.
// Production should set PUBLIC_SATELLITE_URL / PUBLIC_LABELS_URL to a keyed provider
// (ArcGIS Location Platform or MapTiler) restricted to the website's domain.
const SAT =
  import.meta.env.PUBLIC_SATELLITE_URL ||
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const LABELS =
  import.meta.env.PUBLIC_LABELS_URL ||
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const STREETS = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const PLOT_LINE = "rgba(255, 220, 25, 0.9)"; // iOS parcel outline
export const PLOT_CASING = "rgba(10, 15, 5, 0.45)";
export const SELECTED = "#AEE92B"; // brand lime
export const EMERALD = "#008B48";

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export function buildStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sources: {
      // Esri has no imagery past z18 in much of rural Odisha; overzoom instead of
      // showing "Map data not yet available" tiles.
      satellite: { type: "raster", tiles: [SAT], tileSize: 256, maxzoom: 18, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
      labels: { type: "raster", tiles: [LABELS], tileSize: 256, maxzoom: 18 },
      streets: { type: "raster", tiles: [STREETS], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap contributors" },
      parcels: { type: "geojson", data: EMPTY, promoteId: "fid" },
      selected: { type: "geojson", data: EMPTY },
    },
    layers: [
      { id: "satellite", type: "raster", source: "satellite" },
      { id: "streets", type: "raster", source: "streets", layout: { visibility: "none" } },
      { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.9 } },
      {
        id: "parcel-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": "#ffdc19",
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.22, 0.02],
        },
      },
      { id: "parcel-casing", type: "line", source: "parcels", paint: { "line-color": PLOT_CASING, "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1.2, 18, 3.2] } },
      { id: "parcel-line", type: "line", source: "parcels", paint: { "line-color": PLOT_LINE, "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.5, 18, 1.6] } },
      {
        id: "parcel-label",
        type: "symbol",
        source: "parcels",
        minzoom: 16,
        layout: {
          "text-field": ["get", "plot_number"],
          "text-font": ["Noto Sans Medium"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 16, 10, 19, 14],
          "text-allow-overlap": false,
          "text-padding": 2,
        },
        paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,0.75)", "text-halo-width": 1.3 },
      },
      { id: "selected-fill", type: "fill", source: "selected", paint: { "fill-color": SELECTED, "fill-opacity": 0.32 } },
      { id: "selected-glow", type: "line", source: "selected", paint: { "line-color": SELECTED, "line-width": 9, "line-opacity": 0.35, "line-blur": 4 } },
      { id: "selected-line", type: "line", source: "selected", paint: { "line-color": SELECTED, "line-width": 3 } },
    ],
  };
}

// Odisha district layer for the landing view: hover highlight, tap to fly in.
import type { GeoJSONSource, MapGeoJSONFeature, Map as MLMap } from "maplibre-gl";
import { api } from "../../lib/api";

export interface DistrictInfo {
  id: string;
  name: string;
  bbox?: [number, number, number, number];
}

export async function installDistricts(map: MLMap, onHover: (d: DistrictInfo | null) => void, onPick: (d: DistrictInfo) => void) {
  let fc: GeoJSON.FeatureCollection;
  try {
    fc = await api.districtsGeo();
  } catch {
    return; // Landing still works without outlines.
  }
  (map.getSource("districts") as GeoJSONSource).setData(fc);

  let hovered: string | number | null = null;
  const info = (f: MapGeoJSONFeature): DistrictInfo => {
    const p = f.properties ?? {};
    let bbox: DistrictInfo["bbox"];
    try {
      bbox = typeof p.bbox === "string" ? JSON.parse(p.bbox) : p.bbox;
    } catch {
      bbox = undefined;
    }
    return { id: String(p.district_id), name: String(p.district_name), bbox };
  };

  map.on("mousemove", "district-fill", (e) => {
    const f = e.features?.[0];
    if (!f || map.getZoom() > 10.5) return;
    if (hovered !== null && hovered !== f.id) map.setFeatureState({ source: "districts", id: hovered }, { hover: false });
    hovered = f.id ?? null;
    if (hovered !== null) map.setFeatureState({ source: "districts", id: hovered }, { hover: true });
    map.getCanvas().style.cursor = "pointer";
    onHover(info(f));
  });
  map.on("mouseleave", "district-fill", () => {
    if (hovered !== null) map.setFeatureState({ source: "districts", id: hovered }, { hover: false });
    hovered = null;
    map.getCanvas().style.cursor = "";
    onHover(null);
  });
  map.on("click", "district-fill", (e) => {
    const f = e.features?.[0];
    if (!f || map.getZoom() > 10.5) return;
    const d = info(f);
    onPick(d);
    if (d.bbox) map.fitBounds([[d.bbox[0], d.bbox[1]], [d.bbox[2], d.bbox[3]]], { padding: 60, duration: 1400 });
  });
}

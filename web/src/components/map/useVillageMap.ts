// Map engine: creates the MapLibre map, loads a village's plot outlines, and resolves
// taps to plots. UI components only call the functions this hook returns.
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import { installDistricts, type DistrictInfo } from "./districts";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { areaSqM, bbox, ODISHA_CENTER, SQM_PER_ACRE } from "../../lib/geo";
import { buildStyle } from "../../lib/mapStyle";
import type { PlotAtPoint, SelectedPlot, VillageContext } from "../../lib/types";

export interface Status {
  text: string;
  busy?: boolean;
  tone?: "info" | "warn";
}

const PLOT_LAYERS = ["parcel-fill", "parcel-casing", "parcel-line", "parcel-label"];
const DISCOVER_ZOOM = 15;

function villageFromPlot(p: PlotAtPoint): VillageContext {
  return {
    villageId: p.village_id,
    villageName: p.village_name,
    villageNameOdia: p.bhulekh_village_name_odia,
    tahasilId: p.tahasil_id,
    tahasilName: p.tahasil_name,
    districtId: p.district_id,
    districtName: p.district_name,
  };
}

export function useVillageMap(container: React.RefObject<HTMLDivElement | null>) {
  const mapRef = useRef<MLMap | null>(null);
  const parcelsRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const villageRef = useRef<VillageContext | null>(null);
  const villageBoxRef = useRef<[number, number, number, number] | null>(null);
  const parcelAbort = useRef<AbortController | null>(null);
  const discoverTimer = useRef<number | undefined>(undefined);
  const statusTimer = useRef<number | undefined>(undefined);
  const hoverId = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [village, setVillage] = useState<VillageContext | null>(null);
  const [selected, setSelected] = useState<SelectedPlot | null>(null);
  /** A tap is being resolved to a plot; the panel is open and showing skeletons. */
  const [resolving, setResolving] = useState(false);
  const tapSeq = useRef(0);
  const [status, setStatusState] = useState<Status | null>(null);
  const [plotCount, setPlotCount] = useState(0);
  const [hoverDistrict, setHoverDistrict] = useState<DistrictInfo | null>(null);
  const [zoom, setZoom] = useState(6);

  const setStatus = useCallback((s: Status | null, hideAfterMs?: number) => {
    window.clearTimeout(statusTimer.current);
    setStatusState(s);
    if (s && hideAfterMs) statusTimer.current = window.setTimeout(() => setStatusState(null), hideAfterMs);
  }, []);

  const loadVillage = useCallback(async (ctx: VillageContext, fit = false) => {
    const map = mapRef.current;
    if (!map) return;
    if (fit) {
      api.extent(ctx.villageId)
        .then((e) => map.fitBounds([[e.min_lng, e.min_lat], [e.max_lng, e.max_lat]], { padding: 60, duration: 1200 }))
        .catch(() => undefined);
    }
    if (villageRef.current?.villageId === ctx.villageId && parcelsRef.current) return;
    parcelAbort.current?.abort();
    const ctrl = new AbortController();
    parcelAbort.current = ctrl;
    villageRef.current = ctx;
    setVillage(ctx);
    setStatus({ text: `Loading plots · ${ctx.villageName}`, busy: true });
    try {
      const fc = await api.parcels(ctx, ctrl.signal);
      fc.features.forEach((f, i) => { f.properties = { ...(f.properties ?? {}), fid: i }; });
      parcelsRef.current = fc;
      const boxes = fc.features.map((f) => bbox(f.geometry as GeoJSON.Polygon));
      villageBoxRef.current = boxes.length
        ? [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))]
        : null;
      (map.getSource("parcels") as GeoJSONSource).setData(fc);
      setPlotCount(fc.features.length);
      setStatus({ text: `${fc.features.length.toLocaleString("en-IN")} plots in ${ctx.villageName}` }, 3500);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      villageRef.current = null;
      setVillage(null);
      setStatus({ text: "Couldn't load plot lines for this village. Try again in a moment.", tone: "warn" }, 5000);
    }
  }, [setStatus]);

  const focusPlot = useCallback((plot: SelectedPlot) => {
    const map = mapRef.current;
    if (!map) return;
    (map.getSource("selected") as GeoJSONSource).setData({ type: "Feature", geometry: plot.geometry, properties: {} });
    const [x1, y1, x2, y2] = bbox(plot.geometry);
    // Keep the plot clear of the land panel (left on desktop, bottom sheet on phones).
    const bottom = window.innerWidth < 760 ? Math.round(window.innerHeight * 0.5) : 80;
    const left = window.innerWidth < 760 ? 40 : 480;
    map.fitBounds([[x1, y1], [x2, y2]], { padding: { top: 120, bottom, left, right: 90 }, maxZoom: 18.5, duration: 900 });
  }, []);

  /** Resolve the plot at a point: from loaded outlines first (instant), then the backend. */
  const selectAt = useCallback(async (lng: number, lat: number): Promise<SelectedPlot | null> => {
    const map = mapRef.current;
    if (!map) return null;
    const seq = ++tapSeq.current;
    const pt = map.project([lng, lat]);
    const hit = map.getLayer("parcel-fill") ? map.queryRenderedFeatures(pt, { layers: ["parcel-fill"] })[0] : undefined;
    const fid = hit?.properties?.fid;
    const local = fid != null ? parcelsRef.current?.features[Number(fid)] : undefined;
    if (local && villageRef.current) {
      const geometry = local.geometry as GeoJSON.Polygon;
      const plot: SelectedPlot = {
        plotNumber: String(local.properties?.plot_number ?? local.properties?.revenue_plot ?? ""),
        geometry,
        areaAcre: areaSqM(geometry) / SQM_PER_ACRE,
        village: villageRef.current,
      };
      setResolving(false);
      setSelected(plot);
      focusPlot(plot);
      return plot;
    }
    // Not in the loaded outlines: open the panel now, mark the spot, and look it up.
    setResolving(true);
    setSelected(null);
    (map.getSource("selected") as GeoJSONSource).setData({ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} });
    try {
      const r = await api.plotAtPoint(lat, lng);
      if (seq !== tapSeq.current) return null; // a newer tap won
      if (!r.plot) {
        setResolving(false);
        (map.getSource("selected") as GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
        setStatus({ text: "No plot found here. Odisha's plot maps cover revenue villages; try zooming into fields or houses.", tone: "warn" }, 5000);
        return null;
      }
      const ctx = villageFromPlot(r.plot);
      const plot: SelectedPlot = {
        plotNumber: r.plot.plot_number,
        geometry: r.plot.geometry,
        areaAcre: r.plot.area_acre ?? areaSqM(r.plot.geometry) / SQM_PER_ACRE,
        village: ctx,
      };
      setResolving(false);
      setSelected(plot);
      focusPlot(plot);
      void loadVillage(ctx);
      return plot;
    } catch {
      if (seq !== tapSeq.current) return null;
      setResolving(false);
      (map.getSource("selected") as GeoJSONSource).setData({ type: "FeatureCollection", features: [] });
      setStatus({ text: "The plot map service is busy. Try again in a moment.", tone: "warn" }, 5000);
      return null;
    }
  }, [focusPlot, loadVillage, setStatus]);

  const clearSelection = useCallback(() => {
    tapSeq.current++;
    setResolving(false);
    setSelected(null);
    (mapRef.current?.getSource("selected") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [] });
  }, []);

  // Create the map once. MapLibre is loaded in the browser only (the page is server-rendered).
  useEffect(() => {
    if (!container.current || mapRef.current) return;
    let cancelled = false;
    let created: MLMap | null = null;
    void (async () => {
    const maplibregl = (await import("maplibre-gl")).default;
    if (cancelled || !container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: buildStyle(),
      center: ODISHA_CENTER,
      zoom: window.innerWidth < 760 ? 5.6 : 6.6,
      minZoom: 5,
      maxZoom: 19.5,
      maxBounds: [[78, 15], [91, 25]],
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;
    created = map;

    map.on("load", () => {
      setReady(true);
      // Phones: keep the map credit folded into its (i) button so it covers nothing,
      // until the user taps (i). MapLibre unfolds it again on every resize.
      if (window.matchMedia("(max-width: 760px)").matches) {
        const attrib = container.current?.querySelector(".maplibregl-ctrl-attrib");
        let userOpened = false;
        attrib?.querySelector(".maplibregl-ctrl-attrib-button")?.addEventListener("click", () => { userOpened = true; });
        const fold = () => { if (!userOpened) attrib?.classList.remove("maplibregl-compact-show"); };
        fold();
        map.on("resize", () => requestAnimationFrame(fold));
        map.once("idle", fold);
      }
      void installDistricts(map, setHoverDistrict, () => setHoverDistrict(null));
    });
    map.on("zoomend", () => setZoom(map.getZoom()));

    // Hover highlight on desktop.
    map.on("mousemove", "parcel-fill", (e) => {
      const id = e.features?.[0]?.id;
      if (id == null) return;
      if (hoverId.current !== null) map.setFeatureState({ source: "parcels", id: hoverId.current }, { hover: false });
      hoverId.current = Number(id);
      map.setFeatureState({ source: "parcels", id: hoverId.current }, { hover: true });
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "parcel-fill", () => {
      if (hoverId.current !== null) map.setFeatureState({ source: "parcels", id: hoverId.current }, { hover: false });
      hoverId.current = null;
      map.getCanvas().style.cursor = "";
    });

    })();
    return () => {
      cancelled = true;
      created?.remove();
      mapRef.current = null;
    };
  }, [container]);

  // When the user zooms into an area with no plot lines loaded, find its village.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const onMoveEnd = () => {
      window.clearTimeout(discoverTimer.current);
      const z = map.getZoom();
      const c = map.getCenter();
      const box = villageBoxRef.current;
      const inside = box && c.lng >= box[0] && c.lng <= box[2] && c.lat >= box[1] && c.lat <= box[3];
      if (z < DISCOVER_ZOOM) {
        if (z >= 11 && !villageRef.current) setStatus({ text: "Zoom in on fields or houses to see plot lines" });
        return;
      }
      if (inside) return;
      discoverTimer.current = window.setTimeout(async () => {
        try {
          const r = await api.plotAtPoint(c.lat, c.lng);
          if (r.plot) await loadVillage(villageFromPlot(r.plot));
        } catch {
          /* quiet: discovery is best-effort */
        }
      }, 650);
    };
    map.on("moveend", onMoveEnd);
    return () => { map.off("moveend", onMoveEnd); };
  }, [ready, loadVillage, setStatus]);

  const setBasemap = useCallback((b: "satellite" | "streets") => {
    const map = mapRef.current;
    if (!map) return;
    map.setLayoutProperty("satellite", "visibility", b === "satellite" ? "visible" : "none");
    map.setLayoutProperty("labels", "visibility", b === "satellite" ? "visible" : "none");
    map.setLayoutProperty("streets", "visibility", b === "streets" ? "visible" : "none");
  }, []);

  const setPlotsVisible = useCallback((visible: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    for (const id of PLOT_LAYERS) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }, []);

  return { map: mapRef, ready, zoom, hoverDistrict, village, plotCount, selected, resolving, status, setStatus, selectAt, loadVillage, clearSelection, setBasemap, setPlotsVisible };
}

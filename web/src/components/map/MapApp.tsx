// The Bhumitra web app: full-screen plot map, like the iOS home screen.
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapMouseEvent } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { plotKey, recents, saved, toStored, type StoredPlot } from "../../lib/storage";
import type { SearchResult, SelectedPlot, VillageContext } from "../../lib/types";
import { Icon } from "../Icon";
import { LandDetailsSheet } from "./LandDetailsSheet";
import { MapControls } from "./MapControls";
import { PlotCard } from "./PlotCard";
import { SearchBar } from "./SearchBar";
import { useVillageMap } from "./useVillageMap";
import { VillagePicker } from "./VillagePicker";
import { AboutPanel } from "./AboutPanel";

function zoomFor(type: string): number {
  const t = type.toUpperCase();
  if (t.includes("DISTRICT") || t.includes("STATE")) return 9.5;
  if (t.includes("CITY")) return 12.5;
  if (t.includes("TOWN") || t.includes("TAHASIL") || t.includes("BLOCK")) return 13.5;
  return 15.5;
}

export default function MapApp() {
  const container = useRef<HTMLDivElement>(null);
  const engine = useVillageMap(container);
  const { map, ready, selected, status, setStatus, selectAt, loadVillage, clearSelection } = engine;
  const tapPoint = useRef<[number, number] | null>(null);

  const [basemap, setBasemap] = useState<"satellite" | "streets">("satellite");
  const [showPlots, setShowPlots] = useState(true);
  const [locating, setLocating] = useState(false);
  const [picker, setPicker] = useState(false);
  const [details, setDetails] = useState(false);
  const [about, setAbout] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const remember = useCallback((p: SelectedPlot | null, lng: number, lat: number) => {
    if (!p) return;
    tapPoint.current = [lng, lat];
    recents.add(toStored(p, [lng, lat]));
    setIsSaved(saved.has(plotKey(p)));
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ plot: p.plotNumber, lat: lat.toFixed(6), lng: lng.toFixed(6) }).toString();
    window.history.replaceState(null, "", url);
  }, []);

  const pick = useCallback(async (lng: number, lat: number) => {
    setDetails(false);
    const p = await selectAt(lng, lat);
    remember(p, lng, lat);
  }, [selectAt, remember]);

  // Tap / click on the map selects the plot underneath.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const onClick = (e: MapMouseEvent) => {
      if (m.getZoom() < 13) {
        m.easeTo({ center: e.lngLat, zoom: Math.min(m.getZoom() + 3, 16), duration: 700 });
        return;
      }
      void pick(e.lngLat.lng, e.lngLat.lat);
    };
    m.on("click", onClick);
    return () => { m.off("click", onClick); };
  }, [map, ready, pick]);

  // Open a shared link: /?plot=91&lat=21.62&lng=85.58
  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams(window.location.search);
    const lat = Number(q.get("lat"));
    const lng = Number(q.get("lng"));
    if (isFinite(lat) && isFinite(lng) && lat && lng) {
      map.current?.jumpTo({ center: [lng, lat], zoom: 17 });
      void pick(lng, lat);
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPlace = (r: SearchResult) => {
    clearSelection();
    map.current?.flyTo({ center: [r.longitude, r.latitude], zoom: zoomFor(r.type), duration: 1600, essential: true });
  };

  const onRecent = (p: StoredPlot) => {
    map.current?.jumpTo({ center: p.center, zoom: 17 });
    void pick(p.center[0], p.center[1]);
  };

  const onVillage = (v: VillageContext) => {
    setPicker(false);
    clearSelection();
    void loadVillage(v, true);
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setStatus({ text: "This browser can't share your location.", tone: "warn" }, 4000);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { longitude: lng, latitude: lat, accuracy } = pos.coords;
        map.current?.flyTo({ center: [lng, lat], zoom: 17.5, duration: 1400 });
        setStatus({ text: `Plots near you · ±${Math.round(accuracy)} m` }, 3500);
        window.setTimeout(() => void pick(lng, lat), 1450);
      },
      (err) => {
        setLocating(false);
        setStatus({ text: err.code === 1 ? "Location is off. Allow location for this site, or search a village." : "Couldn't get your location. Try again outdoors.", tone: "warn" }, 5000);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const share = async () => {
    if (!selected) return;
    const url = window.location.href;
    const title = `Plot ${selected.plotNumber}, ${selected.village.villageName}`;
    try {
      if (navigator.share) await navigator.share({ title, text: `${title} on Bhumitra`, url });
      else {
        await navigator.clipboard.writeText(url);
        setStatus({ text: "Link copied" }, 2500);
      }
    } catch {
      /* share sheet dismissed */
    }
  };

  const toggleSave = () => {
    if (!selected || !tapPoint.current) return;
    const now = saved.toggle(toStored(selected, tapPoint.current));
    setIsSaved(now);
    setStatus({ text: now ? "Saved on this device" : "Removed from saved plots" }, 2500);
  };

  return (
    <div className="app" data-village={engine.village?.villageId ?? ""} data-plots={engine.plotCount}>
      <div ref={container} className="map" aria-label="Map of Odisha with plot boundaries" role="application" />

      <header className="topbar">
        <a className="brand" href="/" aria-label="Bhumitra home">
          <img src="/img/app-icon.png" alt="" width="36" height="36" />
          <span>Bhumitra</span>
        </a>
        <SearchBar onPlace={onPlace} onRecent={onRecent} onBrowse={() => setPicker(true)} />
        <nav className="topbar__links" aria-label="Site">
          <a href="/blog/">Guides</a>
          <a className="btn btn--primary btn--sm" href="#get-app">Get the app</a>
        </nav>
      </header>

      {status && (
        <div className={`status status--${status.tone ?? "info"}`} role="status" aria-live="polite">
          {status.busy && <span className="spinner" aria-hidden="true" />}
          {status.text}
        </div>
      )}

      {!selected && ready && !status && (
        <p className="hint"><Icon name="plot" size={16} /> Search a village, or zoom in and tap any plot</p>
      )}

      <MapControls
        basemap={basemap}
        showPlots={showPlots}
        locating={locating}
        onInfo={() => setAbout(true)}
        onBasemap={() => { const b = basemap === "satellite" ? "streets" : "satellite"; setBasemap(b); engine.setBasemap(b); }}
        onTogglePlots={() => { setShowPlots(!showPlots); engine.setPlotsVisible(!showPlots); }}
        onLocate={locate}
        onZoom={(d) => (d > 0 ? map.current?.zoomIn() : map.current?.zoomOut())}
      />

      {selected && !details && (
        <PlotCard plot={selected} isSaved={isSaved} onDetails={() => setDetails(true)} onSave={toggleSave} onShare={share} onClose={clearSelection} />
      )}
      {selected && details && <LandDetailsSheet plot={selected} onClose={() => setDetails(false)} />}
      {picker && <VillagePicker onClose={() => setPicker(false)} onPick={onVillage} />}
      {about && <AboutPanel onClose={() => setAbout(false)} />}
    </div>
  );
}

// The Bhumitra web app: a full-screen map with a side panel, like the iOS home screen.
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapMouseEvent } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { analytics, initAnalytics } from "../../lib/analytics";
import { api } from "../../lib/api";
import { plotKey, recents, saved, toStored, type StoredPlot } from "../../lib/storage";
import { currentTheme, setTheme, type Theme } from "../../lib/theme";
import { Icon } from "../Icon";
import type { SearchResult, VillageContext } from "../../lib/types";
import { LandPanel } from "../panel/LandPanel";
import { LandingPanel } from "../panel/LandingPanel";
import { AboutPanel } from "./AboutPanel";
import { MapControls } from "./MapControls";
import { SearchBar } from "./SearchBar";
import { useVillageMap } from "./useVillageMap";
import { VillagePicker } from "./VillagePicker";

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
  const { map, ready, selected, resolving, status, setStatus, selectAt, loadVillage, clearSelection } = engine;
  const tapPoint = useRef<[number, number] | null>(null);

  const [basemap, setBasemap] = useState<"satellite" | "streets">("satellite");
  const [showPlots, setShowPlots] = useState(true);
  const [locating, setLocating] = useState(false);
  const [picker, setPicker] = useState(false);
  const [about, setAbout] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [searching, setSearching] = useState(false);
  const appRef = useRef<HTMLDivElement>(null);
  const [theme, setThemeState] = useState<Theme>("light");
  // The landing card can be tucked away; remembered on this device.
  const [landingOpen, setLandingOpenState] = useState(true);
  const setLandingOpen = (open: boolean) => {
    setLandingOpenState(open);
    try { localStorage.setItem("bhumitra.landingOpen.v1", open ? "1" : "0"); } catch { /* blocked */ }
  };
  useEffect(() => {
    setThemeState(currentTheme());
    void initAnalytics();
    analytics.screenView("Plot Map");
    try { if (localStorage.getItem("bhumitra.landingOpen.v1") === "0") setLandingOpenState(false); } catch { /* blocked */ }
  }, []);

  const pick = useCallback(async (lng: number, lat: number) => {
    tapPoint.current = [lng, lat];
    const p = await selectAt(lng, lat);
    if (!p) return;
    analytics.plotTapped({
      plotNo: p.plotNumber,
      villageName: p.village.villageName,
      tahasilName: p.village.tahasilName,
      districtName: p.village.districtName,
      areaAcre: p.areaAcre,
    });
    recents.add(toStored(p, [lng, lat]));
    setIsSaved(saved.has(plotKey(p)));
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({ plot: p.plotNumber, lat: lat.toFixed(6), lng: lng.toFixed(6) }).toString();
    window.history.replaceState(null, "", url);
  }, [selectAt]);

  // Tap on the map: far out, districts handle it; mid zoom, zoom in; close in, open the plot.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const onClick = (e: MapMouseEvent) => {
      const z = m.getZoom();
      if (z <= 10.5) return;
      if (z < 13.5) {
        m.easeTo({ center: e.lngLat, zoom: Math.min(z + 3, 16), duration: 700 });
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

  const close = () => {
    clearSelection();
    window.history.replaceState(null, "", window.location.pathname);
  };

  const onPlace = (r: SearchResult) => {
    close();
    map.current?.flyTo({ center: [r.longitude, r.latitude], zoom: zoomFor(r.type), duration: 1600, essential: true });
  };

  const onDistrict = async (name: string) => {
    try {
      const r = await api.search(`${name} district`);
      const hit = r.results.find((x) => x.type.toUpperCase().includes("DISTRICT")) ?? r.results[0];
      if (hit) onPlace(hit);
    } catch {
      setStatus({ text: "Couldn't find that district right now.", tone: "warn" }, 3500);
    }
  };

  const onRecent = (p: StoredPlot) => {
    map.current?.jumpTo({ center: p.center, zoom: 17 });
    void pick(p.center[0], p.center[1]);
  };

  const onVillage = (v: VillageContext) => {
    setPicker(false);
    close();
    void loadVillage(v, true);
  };

  const locate = () => {
    analytics.mapControlClicked("locate_me");
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
    analytics.landRecordAction("share", { plot_number: selected.plotNumber, village: selected.village.villageName });
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
    analytics.landRecordAction(now ? "save" : "unsave", { plot_number: selected.plotNumber, village: selected.village.villageName });
    setStatus({ text: now ? "Saved on this device" : "Removed from saved plots" }, 2500);
  };

  const panelOpen = !!selected || resolving;

  // Phones: map buttons and the map credit sit just above whatever sheet is showing.
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    const sheet = app.querySelector<HTMLElement>(".panel, .panel-tab");
    const update = () => {
      // offsetTop ignores the sheet's slide-in transform, so this is where it settles.
      const top = sheet ? sheet.offsetTop : app.clientHeight;
      app.style.setProperty("--sheet-h", `${Math.max(0, Math.round(app.clientHeight - top))}px`);
    };
    update();
    if (!sheet) return;
    const ro = new ResizeObserver(update);
    ro.observe(sheet);
    sheet.addEventListener("transitionend", update);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); sheet.removeEventListener("transitionend", update); window.removeEventListener("resize", update); };
  }, [panelOpen, landingOpen, ready]);
  const far = engine.zoom <= 10.5;

  return (
    <div ref={appRef} className={`app ${panelOpen ? "has-plot" : ""} ${!panelOpen && landingOpen ? "has-landing" : ""}`} data-village={engine.village?.villageId ?? ""} data-plots={engine.plotCount}>
      <div ref={container} className="map" aria-label="Map of Odisha with plot boundaries" role="application" />

      <header className={`topbar ${searching ? "is-searching" : ""}`}>
        <a className="brand" href="/" aria-label="Bhumitra home">
          <img src="/img/app-icon.png" alt="" width="36" height="36" />
          <span>Bhumitra</span>
        </a>
        <SearchBar onPlace={onPlace} onRecent={onRecent} onBrowse={() => setPicker(true)} onOpenChange={setSearching} />
        <nav className="topbar__links" aria-label="Site">
          <a href="/blog/">Guides</a>
          <button
            className="theme-btn"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            onClick={() => { const t = theme === "dark" ? "light" : "dark"; setTheme(t); setThemeState(t); analytics.themeChanged(t); }}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
          </button>
          <a className="btn btn--primary btn--sm topbar__app" href="#get-app" onClick={(e) => { e.preventDefault(); clearSelection(); setLandingOpen(true); analytics.appStoreClicked("apple", "topbar_cta"); }}>Get the app</a>
        </nav>
      </header>

      {panelOpen ? (
        <LandPanel plot={selected} resolving={resolving} isSaved={isSaved} onSave={toggleSave} onShare={share} onClose={close} />
      ) : landingOpen ? (
        <LandingPanel onDistrict={onDistrict} onBrowse={() => setPicker(true)} onLocate={locate} onCollapse={() => setLandingOpen(false)} onAbout={() => setAbout(true)} />
      ) : (
        <button className="panel-tab" onClick={() => setLandingOpen(true)} aria-label="Show the Bhumitra panel" aria-expanded="false">
          <Icon name="panelOpen" size={18} />
          <span>Explore Odisha</span>
        </button>
      )}

      {status && (
        <div className={`status status--${status.tone ?? "info"}`} role="status" aria-live="polite">
          {status.busy && <span className="spinner" aria-hidden="true" />}
          {status.text}
        </div>
      )}
      {!status && ready && !panelOpen && engine.hoverDistrict && far && (
        <div className="status status--district" aria-hidden="true">{engine.hoverDistrict.name} · tap to explore</div>
      )}
      {!status && ready && !panelOpen && !engine.hoverDistrict && (
        <p className="hint">{far ? "Tap a district to explore its plots" : engine.zoom < 13.5 ? "Zoom in on fields or houses" : "Tap any plot to see its land details"}</p>
      )}

      <MapControls
        basemap={basemap}
        showPlots={showPlots}
        locating={locating}
        onInfo={() => { setAbout(true); analytics.screenView("About Bhumitra"); }}
        onBasemap={() => { const b = basemap === "satellite" ? "streets" : "satellite"; setBasemap(b); engine.setBasemap(b); analytics.mapControlClicked(`basemap_${b}`); }}
        onTogglePlots={() => { const next = !showPlots; setShowPlots(next); engine.setPlotsVisible(next); analytics.mapControlClicked(next ? "show_plots" : "hide_plots"); }}
        onLocate={locate}
        onZoom={(d) => (d > 0 ? map.current?.zoomIn() : map.current?.zoomOut())}
      />

      {picker && <VillagePicker onClose={() => setPicker(false)} onPick={onVillage} />}
      {about && <AboutPanel onClose={() => setAbout(false)} />}
    </div>
  );
}

// Right-hand map buttons, same order as the iOS map: info, base map, plot lines, locate, zoom.
import { Icon } from "../Icon";

interface Props {
  basemap: "satellite" | "streets";
  showPlots: boolean;
  locating: boolean;
  onInfo: () => void;
  onBasemap: () => void;
  onTogglePlots: () => void;
  onLocate: () => void;
  onZoom: (delta: number) => void;
}

export function MapControls(p: Props) {
  return (
    <div className="controls" role="toolbar" aria-label="Map controls">
      <button className="ctrl ctrl--wide" aria-label="About Bhumitra" onClick={p.onInfo}><Icon name="info" /></button>
      <button className="ctrl" aria-label={p.basemap === "satellite" ? "Show street map" : "Show satellite map"} aria-pressed={p.basemap === "streets"} onClick={p.onBasemap}>
        <Icon name="layers" />
      </button>
      <button className="ctrl" aria-label={p.showPlots ? "Hide plot lines" : "Show plot lines"} aria-pressed={!p.showPlots} onClick={p.onTogglePlots}>
        <Icon name={p.showPlots ? "eye" : "eyeOff"} />
      </button>
      <button className={`ctrl ${p.locating ? "is-busy" : ""}`} aria-label="Go to my location" onClick={p.onLocate}><Icon name="locate" /></button>
      <div className="ctrl-group ctrl--wide">
        <button className="ctrl" aria-label="Zoom in" onClick={() => p.onZoom(1)}><Icon name="plus" /></button>
        <button className="ctrl" aria-label="Zoom out" onClick={() => p.onZoom(-1)}><Icon name="minus" /></button>
      </div>
    </div>
  );
}

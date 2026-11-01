// Bottom card shown after tapping a plot (iOS CadastralPlotCardView).
import { formatArea } from "../../lib/geo";
import type { SelectedPlot } from "../../lib/types";
import { Icon } from "../Icon";

interface Props {
  plot: SelectedPlot;
  isSaved: boolean;
  onDetails: () => void;
  onSave: () => void;
  onShare: () => void;
  onClose: () => void;
}

export function PlotCard({ plot, isSaved, onDetails, onSave, onShare, onClose }: Props) {
  const a = formatArea(plot.areaAcre);
  const v = plot.village;
  return (
    <section className="plot-card" aria-label={`Plot ${plot.plotNumber}`}>
      <div className="plot-card__grab" aria-hidden="true" />
      <header className="plot-card__head">
        <div className="plot-card__badge"><Icon name="plot" size={22} /></div>
        <div className="plot-card__title">
          <p className="plot-card__kicker">Plot</p>
          <h2>{plot.plotNumber}</h2>
        </div>
        <div className="plot-card__actions">
          <button className="icon-btn" aria-label={isSaved ? "Remove from saved plots" : "Save plot"} aria-pressed={isSaved} onClick={onSave}>
            <Icon name={isSaved ? "bookmarkFill" : "bookmark"} />
          </button>
          <button className="icon-btn" aria-label="Share plot" onClick={onShare}><Icon name="share" /></button>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>
      </header>

      <dl className="plot-card__grid">
        <div><dt>Village</dt><dd>{v.villageName}{v.villageNameOdia && <span lang="or">{v.villageNameOdia}</span>}</dd></div>
        <div><dt>Tahasil</dt><dd>{v.tahasilName}</dd></div>
        <div><dt>District</dt><dd>{v.districtName}</dd></div>
        <div><dt>Map area</dt><dd>{a ? <>{a.acre} acre<span>{a.decimal} decimal · {a.sqft} sq ft</span></> : "—"}</dd></div>
      </dl>

      <button className="btn btn--primary btn--block" onClick={onDetails}>
        View land details <Icon name="chevron" size={18} />
      </button>
      <p className="plot-card__note">Boundary from Odisha's cadastral map, for reference only.</p>
    </section>
  );
}

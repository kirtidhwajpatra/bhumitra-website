// Land details panel: opens the moment a plot is tapped and fills in section by section.
// Desktop: left side panel next to the map. Phone: bottom sheet over the map.
import { useState } from "react";
import { formatArea } from "../../lib/geo";
import type { SelectedPlot } from "../../lib/types";
import { Icon } from "../Icon";
import { useLandRecord } from "../map/useLandRecord";
import { LandSection, OwnersSection, RemarksSection } from "./RecordSections";
import { Field, Section } from "./Section";
import { ValueSection } from "./ValueSections";

interface Props {
  plot: SelectedPlot | null;
  resolving: boolean;
  isSaved: boolean;
  onSave: () => void;
  onShare: () => void;
  onClose: () => void;
}

export function LandPanel({ plot, resolving, isSaved, onSave, onShare, onClose }: Props) {
  const rec = useLandRecord(plot);
  const [expanded, setExpanded] = useState(false);
  const busy = resolving || rec.ror.state === "loading" || rec.value.state === "loading";
  const v = plot?.village;
  const area = formatArea(plot?.areaAcre);

  return (
    <aside className={`panel ${expanded ? "is-expanded" : ""}`} aria-label={plot ? `Land details for plot ${plot.plotNumber}` : "Finding plot"}>
      {busy && <div className="panel__progress" aria-hidden="true" />}
      <button className="panel__grab" aria-label={expanded ? "Collapse" : "Expand"} onClick={() => setExpanded(!expanded)} />

      <header className="panel__head">
        <div className="panel__hero">
          <span className="panel__badge"><Icon name="plot" size={22} /></span>
          <div>
            <p>Plot</p>
            {plot && !resolving ? <h2>{plot.plotNumber}</h2> : <span className="skeleton panel__skel-title" />}
          </div>
        </div>
        <div className="panel__actions">
          <button className="icon-btn" aria-label={isSaved ? "Remove from saved plots" : "Save plot"} aria-pressed={isSaved} onClick={onSave} disabled={!plot || resolving}>
            <Icon name={isSaved ? "bookmarkFill" : "bookmark"} />
          </button>
          <button className="icon-btn" aria-label="Share plot" onClick={onShare} disabled={!plot || resolving}><Icon name="share" /></button>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>
        <p className="panel__sub">
          {plot && !resolving ? `${v!.villageName}, ${v!.tahasilName}, ${v!.districtName}` : "Finding the plot at this spot…"}
        </p>
      </header>

      <div className="panel__body">
        <Section icon="pin" title="Location" loading={resolving || !plot}>
          {plot && !resolving ? (
            <dl className="pgrid">
              <Field label="District" value={v!.districtName} />
              <Field label="Tahasil" value={v!.tahasilName} />
              <Field label="Village" value={v!.villageName} sub={v!.villageNameOdia && <span lang="or">{v!.villageNameOdia}</span>} />
              <Field label="Map area" value={area ? `${area.acre} acre` : "—"} sub={area && `${area.decimal} decimal · ${area.sqft} sq ft`} />
            </dl>
          ) : (
            <div className="psec__skel"><span className="skeleton skel-b" style={{ width: "70%" }} /><span className="skeleton skel-b" style={{ width: "50%" }} /></div>
          )}
        </Section>

        {plot && !resolving && (
          <>
            <OwnersSection ror={rec.ror} limited={rec.limited} />
            <LandSection ror={rec.ror} limited={rec.limited} plot={plot} />
            <ValueSection value={rec.value} plot={plot} jurisdiction={rec.jurisdiction} setJurisdiction={rec.setJurisdiction} />
            <RemarksSection ror={rec.ror} limited={rec.limited} plot={plot} />
          </>
        )}

        <p className="panel__source">
          <Icon name="shield" size={15} />
          <span>Records from <a href="https://bhulekh.ori.nic.in" target="_blank" rel="noopener">Odisha Bhulekh</a>, values from <a href="https://igrodisha.gov.in" target="_blank" rel="noopener">IGR Odisha</a>, boundaries from Odisha's cadastral maps. For information only, not a certified copy. Bhumitra is not a government app.</span>
        </p>
      </div>
    </aside>
  );
}

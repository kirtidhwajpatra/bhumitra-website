// Land details panel, laid out like the iOS plot sheet (PlotDetailSheet + LandRecordReportView):
// a compact overview (plot, area · land type · khatian, owners, govt value), then collapsible
// sections separated by hairlines. Desktop: left side panel. Phone: bottom sheet.
import { useCallback, useState } from "react";
import { inrShort } from "../../lib/format";
import { areaPrimary, isGovernmentLand, parseAreaSqM, parseOwner } from "../../lib/land";
import type { SelectedPlot } from "../../lib/types";
import { Icon } from "../Icon";
import { useLandRecord } from "../map/useLandRecord";
import { LandSection, LocationSection, OwnersSection, RemarksSection, type SectionId } from "./RecordSections";
import { SalesSection, ValueSection, benchmarkFor } from "./ValueSections";

interface Props {
  plot: SelectedPlot | null;
  resolving: boolean;
  isSaved: boolean;
  onSave: () => void;
  onShare: () => void;
  onClose: () => void;
}

const ALL: SectionId[] = ["location", "owners", "land", "value", "sales", "remarks"];

export function LandPanel({ plot, resolving, isSaved, onSave, onShare, onClose }: Props) {
  const rec = useLandRecord(plot);
  const [expanded, setExpanded] = useState(false);
  // Sections start collapsed, like the app; what you open stays open from plot to plot.
  const [open, setOpen] = useState<Set<SectionId>>(() => new Set());
  const isOpen = useCallback((id: SectionId) => open.has(id), [open]);
  const toggle = useCallback((id: SectionId) => setOpen((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  }), []);
  const allOpen = ALL.slice(0, 5).every((id) => open.has(id));

  const ready = !!plot && !resolving;
  const v = plot?.village;
  const busy = resolving || rec.ror.state === "loading" || rec.value.state === "loading";
  const ror = rec.ror.state === "ready" ? rec.ror.data : null;
  const verified = !!ror && !rec.limited && ror.success !== false;

  return (
    <aside className={`panel panel--plot ${expanded ? "is-expanded" : ""}`} aria-label={plot ? `Land details for plot ${plot.plotNumber}` : "Finding plot"}>
      {busy && <div className="panel__progress" aria-hidden="true" />}
      <button className="panel__grab" aria-label={expanded ? "Collapse" : "Expand"} onClick={() => setExpanded(!expanded)} />

      <div className="panel__body">
        <header className="pov">
          <div className="pov__top">
            <div className="pov__id">
              {ready ? (
                <h2>Plot {plot.plotNumber}{verified && <Icon name="seal" size={17} className="pov__seal" aria-label="Verified against Bhulekh" role="img" aria-hidden={false} />}</h2>
              ) : <span className="skeleton pov__skel-title" />}
              <p>{ready ? `${v!.villageName}, ${v!.tahasilName}, ${v!.districtName}` : "Finding the plot at this spot…"}</p>
            </div>
            <div className="pov__actions">
              {ready && rec.ror.state !== "loading" && (
                <>
                  <button className="sheet-btn" aria-label={isSaved ? "Remove from saved plots" : "Save plot"} aria-pressed={isSaved} onClick={onSave}>
                    <Icon name={isSaved ? "bookmarkFill" : "bookmark"} size={18} />
                  </button>
                  <button className="sheet-btn" aria-label="Share plot" onClick={onShare}><Icon name="share" size={18} /></button>
                </>
              )}
              <button className="sheet-btn" aria-label="Close" onClick={onClose}><Icon name="close" size={18} /></button>
            </div>
          </div>
          {plot && <Overview plot={plot} resolving={resolving} rec={rec} />}
        </header>

        {ready && (
          <div className="rsecs">
            <LocationSection ror={rec.ror} plot={plot} isOpen={isOpen} toggle={toggle} />
            <OwnersSection ror={rec.ror} limited={rec.limited} isOpen={isOpen} toggle={toggle} />
            <LandSection ror={rec.ror} limited={rec.limited} plot={plot} isOpen={isOpen} toggle={toggle} />
            <ValueSection value={rec.value} ror={rec.ror} plot={plot} office={rec.office} setJurisdiction={rec.setJurisdiction} isOpen={isOpen} toggle={toggle} />
            <SalesSection value={rec.value} isOpen={isOpen} toggle={toggle} />
            <RemarksSection ror={rec.ror} limited={rec.limited} plot={plot} isOpen={isOpen} toggle={toggle} />
            <button className="rexpand" onClick={() => setOpen(allOpen ? new Set() : new Set(ALL))}>
              <Icon name="chevronDown" size={14} strokeWidth={2.4} style={{ transform: allOpen ? "rotate(180deg)" : undefined }} />
              {allOpen ? "Collapse all sections" : "Expand all sections"}
            </button>
          </div>
        )}

        <p className="panel__source">
          <Icon name="shield" size={15} />
          <span>Records from <a href="https://bhulekh.ori.nic.in" target="_blank" rel="noopener">Odisha Bhulekh</a>, values from <a href="https://igrodisha.gov.in" target="_blank" rel="noopener">IGR Odisha</a>, boundaries from Odisha's cadastral maps. For information only, not a certified copy. Bhumitra is not a government app.</span>
        </p>
      </div>
    </aside>
  );
}

function Overview({ plot, resolving, rec }: { plot: SelectedPlot; resolving: boolean; rec: ReturnType<typeof useLandRecord> }) {
  const loading = resolving || rec.ror.state === "loading";
  const ror = rec.ror.state === "ready" ? rec.ror.data : null;
  const target = ror?.plots?.find((p) => p.plot_number === plot.plotNumber);
  const sqm = parseAreaSqM(target?.area || ror?.area);
  const area = rec.limited ? null : areaPrimary(sqm) ?? (plot.areaAcre ? `${plot.areaAcre.toFixed(2)} acre` : null);
  const kisam = target?.land_type || ror?.land_type;
  const khata = rec.limited ? "In app" : ror?.khata_number;

  const owners = ror?.owners ?? [];
  const govt = !!ror && isGovernmentLand(ror);
  const first = owners[0] ? parseOwner(owners[0].name).name : null;
  const ownerText = rec.limited
    ? "Owner names didn't load"
    : first ? (owners.length > 1 ? `${first} and ${owners.length - 1} more` : first)
    : rec.ror.state === "error" ? "Owner details couldn't load" : "No owner recorded";

  const b = rec.value.state === "ready" ? rec.value.data : null;
  const { amount } = benchmarkFor(b, plot, rec.ror);
  const valueLoading = resolving || rec.value.state === "loading";
  const showValue = valueLoading || (amount != null && amount > 0);

  return (
    <div className="pov__body">
      <div className="pmetrics">
        <Metric title="Area" value={area} pending={loading} />
        <Metric title="Land type" value={kisam} pending={loading} lang="or" />
        <Metric title="Khatian" value={khata} pending={loading} />
      </div>
      <div className="powner">
        <Icon name={govt ? "building" : "owner"} size={17} />
        {loading ? <span className="skeleton" style={{ width: 150, height: 16 }} /> : <span lang="or">{ownerText}</span>}
      </div>
      {showValue && (
        <div className="pamber">
          <Icon name="rupee" size={21} />
          <div>
            <small>Govt land value</small>
            {valueLoading ? <span className="skeleton" style={{ width: 70, height: 16, display: "block", marginTop: 2 }} /> : <strong>{inrShort(amount)}</strong>}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ title, value, pending, lang }: { title: string; value?: string | null; pending: boolean; lang?: string }) {
  return (
    <div className="pmetric">
      <small>{title}</small>
      {pending && !value ? <span className="skeleton" style={{ width: 52, height: 16, display: "block", marginTop: 3 }} /> : <b lang={lang}>{value || "—"}</b>}
    </div>
  );
}

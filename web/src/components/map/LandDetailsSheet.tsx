// Land details (iOS LandRecordReportView). Web visitors see the Record of Rights preview
// from Bhulekh; owner names and shares stay in the app.
import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { formatArea } from "../../lib/geo";
import type { RoRResponse, SelectedPlot } from "../../lib/types";
import { Icon } from "../Icon";
import { StoreButtons } from "../StoreButtons";

type State = { kind: "loading" } | { kind: "ok"; ror: RoRResponse } | { kind: "error"; message: string; retry: boolean };

export function LandDetailsSheet({ plot, onClose }: { plot: SelectedPlot; onClose: () => void }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ kind: "loading" });
    api
      .ror(plot.village, plot.plotNumber, ctrl.signal)
      .then((ror) => setState({ kind: "ok", ror }))
      .catch((e) => {
        if (e.name === "AbortError") return;
        if (e instanceof ApiError && e.status === 404)
          setState({ kind: "error", message: "Bhulekh has no Record of Rights for this plot number. It may be a government plot, a road or a recently split plot.", retry: false });
        else setState({ kind: "error", message: "Bhulekh is slow or not responding right now.", retry: true });
      });
    return () => ctrl.abort();
  }, [plot, attempt]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const v = plot.village;
  const mapArea = formatArea(plot.areaAcre);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="details" role="dialog" aria-modal="true" aria-label={`Land details for plot ${plot.plotNumber}`} onClick={(e) => e.stopPropagation()}>
        <header className="details__head">
          <button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="back" /></button>
          <h2>Land details</h2>
        </header>

        <div className="details__body">
          <div className="details__hero">
            <p>Plot</p>
            <strong>{plot.plotNumber}</strong>
            <span>{v.villageName}, {v.tahasilName}, {v.districtName}</span>
          </div>

          <dl className="details__loc">
            <div><dt>District</dt><dd>{v.districtName}</dd></div>
            <div><dt>Tahasil</dt><dd>{v.tahasilName}</dd></div>
            <div><dt>Village</dt><dd>{v.villageName}{v.villageNameOdia && <span lang="or">{v.villageNameOdia}</span>}</dd></div>
            <div><dt>Map area</dt><dd>{mapArea ? `${mapArea.acre} acre` : "—"}</dd></div>
          </dl>

          <h3 className="details__section"><Icon name="khata" size={18} /> Record of Rights</h3>

          {state.kind === "loading" && (
            <div className="details__card" aria-busy="true">
              <p className="details__wait">Fetching the record from Bhulekh. This can take up to 20 seconds.</p>
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton details__skel" />)}
            </div>
          )}

          {state.kind === "error" && (
            <div className="details__card details__card--error">
              <p>{state.message}</p>
              {state.retry && <button className="btn btn--ghost" onClick={() => setAttempt((n) => n + 1)}>Try again</button>}
            </div>
          )}

          {state.kind === "ok" && <RecordBody ror={state.ror} />}

          <p className="details__source">
            <Icon name="shield" size={16} /> Records from <a href="https://bhulekh.ori.nic.in" target="_blank" rel="noopener">Odisha Bhulekh</a>. For information only, not a certified copy. Bhumitra is not a government app.
          </p>
        </div>
      </section>
    </div>
  );
}

function RecordBody({ ror }: { ror: RoRResponse }) {
  const locked = ror.is_locked || ror.is_preview;
  // In preview the backend replaces khata and area with placeholders, so never show
  // them as facts. Land type is returned as recorded.
  const Locked = () => <span className="locked-val"><Icon name="lock" size={14} /> In the app</span>;
  return (
    <>
      <div className="details__card">
        <dl className="details__facts">
          <div><dt><Icon name="kisam" size={16} /> Land type (kisam)</dt><dd lang="or">{ror.land_type || "Not recorded"}</dd></div>
          <div><dt><Icon name="khata" size={16} /> Khata no.</dt><dd>{locked ? <Locked /> : ror.khata_number || "—"}</dd></div>
          <div><dt><Icon name="area" size={16} /> Recorded area</dt><dd>{locked ? <Locked /> : ror.area || "—"}</dd></div>
        </dl>
        <p className="details__verified"><Icon name="shield" size={14} /> Record found on Bhulekh for this plot</p>
      </div>

      <h3 className="details__section"><Icon name="owner" size={18} /> Owners</h3>
      <div className={`details__card details__owners ${locked ? "is-locked" : ""}`}>
        {ror.owners.length === 0 && <p>No owner particulars are recorded for this plot.</p>}
        {ror.owners.map((o, i) => (
          <div key={i} className="owner-row">
            <Icon name="owner" size={18} />
            <span lang="or">{locked ? `Owner ${i + 1}` : o.name}</span>
            <b>{locked ? <Icon name="lock" size={14} /> : o.share || ""}</b>
          </div>
        ))}
        {locked && (
          <div className="details__lock">
            <span className="details__lock-ico"><Icon name="lock" size={22} /></span>
            <b>{ror.owners.length > 1 ? `${ror.owners.length} owners recorded` : "Owner recorded"}. See names and shares in the app</b>
            <p>Khata number, recorded area, owners and shares, government land value and registration cost are in the Bhumitra app. Your first searches are free.</p>
            <StoreButtons compact />
          </div>
        )}
      </div>
    </>
  );
}

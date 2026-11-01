// Owners, land details and remarks, from the Record of Rights.
import { share } from "../../lib/format";
import type { RoRResponse, SelectedPlot } from "../../lib/types";
import { Icon } from "../Icon";
import type { Load } from "../map/useLandRecord";
import { Field, Rows, Section, SectionError } from "./Section";
import { UnlockCard } from "./UnlockCard";

export function OwnersSection({ ror, limited }: { ror: Load<RoRResponse>; limited: boolean }) {
  const owners = ror.state === "ready" ? ror.data.owners : [];
  return (
    <Section
      icon="owner"
      title="Owners"
      loading={ror.state === "loading"}
      loadingText="Fetching from Bhulekh"
      badge={ror.state === "ready" && owners.length > 0 && <span className="psec__count">{owners.length}</span>}
    >
      {ror.state === "loading" && <><Rows lines={3} /><p className="pnote">Bhulekh usually answers in 5 to 20 seconds.</p></>}
      {ror.state === "error" && <SectionError message={ror.message} retry={ror.retry} />}
      {ror.state === "ready" && owners.length === 0 && <p className="psec__empty">No owner particulars are recorded for this plot.</p>}
      {ror.state === "ready" && owners.length > 0 && (
        <>
          <div className="owners__head" aria-hidden="true"><span>Owner</span><span>Share</span></div>
          <ul className={`owners ${limited ? "is-limited" : ""}`}>
            {owners.map((o, i) => (
              <li key={i}>
                <span className="owners__avatar"><Icon name="owner" size={16} /></span>
                <span className="owners__name">
                  <b lang="or">{limited ? `Owner ${i + 1}` : o.name}</b>
                  {!limited && o.relation_name && <small lang="or">{o.relation ? `${o.relation} ` : ""}{o.relation_name}</small>}
                </span>
                <span className="owners__share">{limited ? <Icon name="lock" size={14} /> : share(o.share) || "—"}</span>
              </li>
            ))}
          </ul>
          {limited && <UnlockCard what="owner names and shares" />}
        </>
      )}
    </Section>
  );
}

export function LandSection({ ror, limited, plot }: { ror: Load<RoRResponse>; limited: boolean; plot: SelectedPlot }) {
  const d = ror.state === "ready" ? ror.data : null;
  const target = d?.plots?.find((p) => p.plot_number === plot.plotNumber);
  const others = (d?.plots ?? []).filter((p) => p.plot_number !== plot.plotNumber);
  const tenure = d?.raw_fields?.tenure;
  return (
    <Section icon="khata" title="Land details" loading={ror.state === "loading"}>
      {ror.state === "loading" && <Rows lines={4} />}
      {ror.state === "error" && <SectionError message={ror.message} retry={ror.retry} />}
      {d && (
        <>
          <dl className="pgrid">
            <Field label="Khata no." value={limited ? <Locked /> : d.khata_number || "—"} />
            <Field label="Recorded area" value={limited ? <Locked /> : target?.area || d.area || "—"} />
            <Field label="Land type (kisam)" value={target?.land_type || d.land_type || "Not recorded"} lang="or" />
            {tenure && !limited && <Field label="Ownership type" value={tenure} lang="or" />}
          </dl>
          {!limited && others.length > 0 && (
            <details className="pother">
              <summary>Other plots in this khata <span>{others.length}</span></summary>
              <table>
                <thead><tr><th>Plot</th><th>Area</th><th>Land type</th></tr></thead>
                <tbody>
                  {others.map((p) => (
                    <tr key={p.plot_number}><td>{p.plot_number}</td><td>{p.area || "—"}</td><td lang="or">{p.land_type || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
          <p className="pverified"><Icon name="shield" size={14} /> Verified against Bhulekh for plot {plot.plotNumber}</p>
        </>
      )}
    </Section>
  );
}

export function RemarksSection({ ror, limited, plot }: { ror: Load<RoRResponse>; limited: boolean; plot: SelectedPlot }) {
  if (ror.state !== "ready" || limited) return null;
  const target = ror.data.plots?.find((p) => p.plot_number === plot.plotNumber);
  const remarks = (target?.remarks || ror.data.raw_fields?.remarks || "").trim();
  return (
    <Section icon="info" title="Remarks">
      {remarks ? <p className="premarks" lang="or">{remarks}</p> : <p className="psec__empty">No encumbrance or dispute noted in the register.</p>}
    </Section>
  );
}

function Locked() {
  return <span className="locked-val"><Icon name="lock" size={13} /> In the app</span>;
}

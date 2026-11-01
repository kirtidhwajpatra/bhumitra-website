// Location, owners, land details and remarks from the Record of Rights,
// laid out like the iOS land report (LandRecordReportView).
import { useState } from "react";
import { share } from "../../lib/format";
import { areaConversions, areaPrimary, areaSecondary, initials, kisamMeaning, parseAreaSqM, parseOwner, tenureMeaning, SQM_PER_ACRE } from "../../lib/land";
import type { RoRResponse, SelectedPlot } from "../../lib/types";
import type { Load } from "../map/useLandRecord";
import { ActionRow, Empty, Note, Row, RowLink, Rows, Section, SectionError } from "./Section";
import { UnlockCard } from "./UnlockCard";

export type SectionId = "location" | "owners" | "land" | "value" | "sales" | "remarks";
export interface Toggle {
  isOpen: (id: SectionId) => boolean;
  toggle: (id: SectionId) => void;
}

interface RecordProps extends Toggle {
  ror: Load<RoRResponse>;
  limited: boolean;
  plot: SelectedPlot;
}

export function LocationSection({ ror, plot, isOpen, toggle }: Omit<RecordProps, "limited">) {
  const v = plot.village;
  const d = ror.state === "ready" ? ror.data : null;
  const [lng, lat] = centroidOf(plot);
  return (
    <Section icon="pinEllipse" title="Location" open={isOpen("location")} onToggle={() => toggle("location")}>
      <Row label="Village" value={v.villageName} caption={(d?.village || v.villageNameOdia) && <span lang="or">{d?.village || v.villageNameOdia}</span>} />
      <Row label="Tahasil" value={v.tahasilName} caption={d?.tahasil && <span lang="or">{d.tahasil}</span>} />
      <Row label="District" value={v.districtName} caption={d?.district && <span lang="or">{d.district}</span>} />
      <Row label="Police station" value={d?.raw_fields?.thana} lang="or" />
      <Row label="Plot no." value={plot.plotNumber} />
      <Row label="Coordinates" value={`${lat.toFixed(5)}, ${lng.toFixed(5)}`} mono />
    </Section>
  );
}

export function OwnersSection({ ror, limited, isOpen, toggle }: Omit<RecordProps, "plot">) {
  const owners = ror.state === "ready" ? ror.data.owners : [];
  const govt = ror.state === "ready" && !limited && owners.some((o) => /sarkar|government|ସରକାର/i.test(o.name));
  return (
    <Section
      icon="people"
      title={owners.length > 0 ? `Owners (${owners.length})` : "Owners"}
      open={isOpen("owners")}
      onToggle={() => toggle("owners")}
      loading={ror.state === "loading"}
      badge={govt && <span className="rchip">GOVT</span>}
    >
      {ror.state === "loading" && <><Rows lines={2} /><Note>Fetching from Bhulekh. It usually answers in 5 to 20 seconds.</Note></>}
      {ror.state === "error" && <SectionError message={ror.message} retry={ror.retry} />}
      {ror.state === "ready" && owners.length === 0 && <Empty>No owner particulars are recorded for this plot.</Empty>}
      {ror.state === "ready" && owners.length > 0 && (
        <>
          <ol className="rowners">
            {owners.map((o, i) => {
              const p = parseOwner(o.name);
              const relation = p.relationName ? { type: p.relationType, name: p.relationName } : o.relation_name ? { type: o.relation, name: o.relation_name } : null;
              const s = share(o.share);
              return (
                <li key={i}>
                  <span className="rowners__n">{i + 1}.</span>
                  <span className="ravatar" lang="or" aria-hidden="true">{limited ? "?" : initials(p.name)}</span>
                  <div className="rowners__text">
                    <b lang="or">{limited ? `Owner ${i + 1}` : p.name}</b>
                    {!limited && relation && <span><em>{relation.type || "Relative"}:</em> <span lang="or">{relation.name}</span></span>}
                    {!limited && p.residence && <span><em>Residence:</em> <span lang="or">{p.residence}</span></span>}
                    {!limited && s && s !== "-" && <span><em>Share:</em> {s}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
          {limited && <UnlockCard what="owner names and shares" />}
        </>
      )}
    </Section>
  );
}

export function LandSection({ ror, limited, plot, isOpen, toggle }: RecordProps) {
  const [units, setUnits] = useState(false);
  const [others, setOthers] = useState(false);
  const d = ror.state === "ready" ? ror.data : null;
  const target = d?.plots?.find((p) => p.plot_number === plot.plotNumber);
  const rest = (d?.plots ?? []).filter((p) => p.plot_number !== plot.plotNumber);
  const kisam = target?.land_type || d?.land_type;
  const tenure = d?.raw_fields?.tenure;
  const sqm = parseAreaSqM(target?.area || d?.area);
  const mapSqm = plot.areaAcre ? plot.areaAcre * SQM_PER_ACRE : null;

  return (
    <Section icon="squaresDashed" title="Land details" open={isOpen("land")} onToggle={() => toggle("land")} loading={ror.state === "loading"}>
      {ror.state === "loading" && <Rows lines={4} />}
      {ror.state === "error" && <SectionError message={ror.message} retry={ror.retry} />}
      {d && (
        <>
          <Row label="Khata no." value={limited ? "In the app" : d.khata_number} tone={limited ? "muted" : undefined} />
          <Row label="Area" value={limited ? "In the app" : areaPrimary(sqm) || target?.area || d.area} caption={!limited && areaSecondary(sqm)} tone={limited ? "muted" : undefined} />
          <Row label="Land use" value={kisam} lang="or" caption={kisamMeaning(kisam)} />
          {mapSqm && <Row label="Map area" value={`≈ ${(mapSqm / SQM_PER_ACRE).toFixed(2)} acre`} caption="Measured from the cadastral map" />}
          {!limited && <Row label="Ownership type" value={tenure} lang="or" caption={tenureMeaning(tenure)} />}
          {!limited && <Row label="Landlord" value={d.raw_fields?.landlord} lang="or" />}
          {!limited && sqm && (units
            ? areaConversions(sqm).map((c) => <Row key={c.unit} label={c.unit} value={c.value} />)
            : <ActionRow label="Other units"><RowLink icon="chevronDown" onClick={() => setUnits(true)}>Show</RowLink></ActionRow>)}
          {!limited && rest.length > 0 && (
            <ActionRow label="Other plots">
              <RowLink icon={others ? "chevronDown" : "chevron"} aria-expanded={others} onClick={() => setOthers(!others)}>
                <span className="rlink__clip">{rest.map((p) => p.plot_number).join(", ")}</span>
              </RowLink>
            </ActionRow>
          )}
          {others && (
            <ul className="rplots">
              {rest.map((p) => (
                <li key={p.plot_number}>
                  <b>Plot {p.plot_number}</b>
                  <span>{areaPrimary(parseAreaSqM(p.area)) || p.area || "—"}</span>
                  <span lang="or">{p.land_type || "—"}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="rverified">Verified against Bhulekh for plot {plot.plotNumber}, khata {limited ? "…" : d.khata_number || "—"}</p>
        </>
      )}
    </Section>
  );
}

export function remarksOf(ror: Load<RoRResponse>, plot: SelectedPlot): string {
  if (ror.state !== "ready") return "";
  const target = ror.data.plots?.find((p) => p.plot_number === plot.plotNumber);
  return (target?.remarks || ror.data.raw_fields?.remarks || "").trim();
}

export function RemarksSection({ ror, limited, plot, isOpen, toggle }: RecordProps) {
  const remarks = remarksOf(ror, plot);
  if (!remarks || limited) return null;
  return (
    <Section icon="quote" title="Remarks" open={isOpen("remarks")} onToggle={() => toggle("remarks")}>
      <p className="rremarks" lang="or">{remarks}</p>
    </Section>
  );
}

function centroidOf(plot: SelectedPlot): [number, number] {
  const ring = plot.geometry.type === "Polygon" ? plot.geometry.coordinates[0] : plot.geometry.coordinates[0][0];
  let x = 0, y = 0;
  for (const [a, b] of ring) { x += a; y += b; }
  return [x / ring.length, y / ring.length];
}

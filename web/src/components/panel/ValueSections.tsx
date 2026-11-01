// "Value & registration cost" and "Sales history" (IGR Odisha), laid out like the
// iOS land report: one flat label / value list, one action per row.
import { useMemo, useState } from "react";
import { dealCosts, inr, inrShort } from "../../lib/format";
import { areaPrimary, parseAreaSqM, SQM_PER_ACRE } from "../../lib/land";
import type { BenchmarkResponse, IGRCandidate, Jurisdiction, RoRResponse, SelectedPlot } from "../../lib/types";
import { toJurisdiction, type Load, type OfficeChoice } from "../map/useLandRecord";
import type { Toggle } from "./RecordSections";
import { ActionRow, Note, Row, RowLink, Rows, Section, SectionError } from "./Section";

const IGR_EC = "https://igrodisha.gov.in";

interface Props extends Toggle {
  value: Load<BenchmarkResponse>;
  ror: Load<RoRResponse>;
  plot: SelectedPlot;
  office: OfficeChoice;
  setJurisdiction: (j: Jurisdiction | null) => void;
}

const title = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());

/** "KEONJHAR NIZGARH - 129" at "KENDUJHAR" -> village "Keonjhar Nizgarh", office "Kendujhar", thana "129". */
export function readableOffice(c: IGRCandidate) {
  const m = c.village_name.match(/^(.*?)\s*-\s*(\d+)\s*$/);
  const village = title((m ? m[1] : c.village_name).trim());
  const office = title(c.registration_office_name).replace(/\bAdm\b/, "ADM");
  return { village, office, thana: m ? m[2] : c.thana_number ?? null };
}

function optionLabel(c: IGRCandidate) {
  const r = readableOffice(c);
  return `${r.village}${r.thana ? ` (${r.thana})` : ""} · ${r.office} office`;
}

/** Benchmark for the recorded area when Bhulekh gave one, else the map area. */
export function benchmarkFor(b: BenchmarkResponse | null, plot: SelectedPlot, ror: Load<RoRResponse>): { amount: number | null; areaLabel: string | null } {
  if (!b || b.status !== "AVAILABLE") return { amount: null, areaLabel: null };
  const d = ror.state === "ready" && !ror.data.is_preview ? ror.data : null;
  const target = d?.plots?.find((p) => p.plot_number === plot.plotNumber);
  const sqm = parseAreaSqM(target?.area || d?.area);
  const acres = sqm ? sqm / SQM_PER_ACRE : plot.areaAcre;
  const amount = sqm && b.unit_rates?.per_acre
    ? b.unit_rates.per_acre * (sqm / SQM_PER_ACRE)
    : b.calculation?.indicative_benchmark_amount ?? (b.unit_rates?.per_acre && acres ? b.unit_rates.per_acre * acres : null);
  return { amount, areaLabel: sqm ? areaPrimary(sqm) : acres ? `${acres.toFixed(2)} acre (map)` : null };
}

export function ValueSection({ value, ror, plot, office, setJurisdiction, isOpen, toggle }: Props) {
  const [calc, setCalc] = useState(false);
  const b = value.state === "ready" ? value.data : null;
  const candidates = office.candidates.length ? office.candidates : b?.candidates ?? [];
  const current = office.current ? candidates.find((c) => c.candidate_token === office.current!.token) : undefined;
  const needsOffice = b?.status === "MAPPING_REQUIRES_USER_SELECTION" || b?.status === "AMBIGUOUS";
  const { amount, areaLabel } = benchmarkFor(b, plot, ror);
  const costs = amount ? dealCosts(amount, false) : null;

  const officePicker = (label: string) => (
    <label className="rselect">
      <span>{label}</span>
      <select
        aria-label="Registration office and village for the land value"
        value={office.current?.token ?? ""}
        onChange={(e) => {
          const c = candidates.find((x) => x.candidate_token === e.target.value);
          setJurisdiction(c ? toJurisdiction(c) : null);
        }}
      >
        {!office.current && <option value="">Choose village · office</option>}
        {candidates.map((c) => <option key={c.candidate_token} value={c.candidate_token}>{optionLabel(c)}</option>)}
      </select>
    </label>
  );
  const from = current ? readableOffice(current) : null;

  return (
    <Section icon="rupee" title="Value & registration cost" open={isOpen("value")} onToggle={() => toggle("value")} loading={value.state === "loading"}>
      {value.state === "loading" && <><Rows lines={3} /><Note>Finding the official government rate for this plot…</Note></>}
      {value.state === "error" && <SectionError message={value.message} retry={value.retry} />}

      {b && b.status === "AVAILABLE" && (
        <>
          <Row label="Govt land value" value={<span className="rbig">{inr(amount)}</span>} caption={areaLabel && `For ${areaLabel}`} />
          <Row label="Rate / decimal" value={inr(b.unit_rates?.per_decimal_100)} />
          <Row label="Rate / acre" value={inr(b.unit_rates?.per_acre)} />
          <Row label="Rate / sq ft" value={inr(b.unit_rates?.per_square_foot, 2)} />
          {costs && <Row label="Stamp duty" value={inr(costs.stamp)} caption="5%" />}
          {costs && <Row label="Registration fee" value={inr(costs.reg)} caption="2%" />}
          {costs && <Row label="Total to register" value={<b>{inr(costs.total)}</b>} />}
          {from ? (
            <>
              <Row label="IGR village" value={from.village} caption={from.thana && `Thana no. ${from.thana}`} />
              <Row label="Rate from" value={`${from.office} office`} caption={office.auto ? "Picked automatically for this plot" : "You chose this office"} />
              {candidates.length > 1 && <div className="rrow">{officePicker("Change office")}</div>}
            </>
          ) : (
            <Row label="Rate from" value={b.registration_office && `${title(b.registration_office)} office`} caption={b.village_thana && title(b.village_thana)} />
          )}
          <ActionRow label="Your deal"><RowLink icon={calc ? "chevronDown" : "chevron"} aria-expanded={calc} onClick={() => setCalc(!calc)}>Estimate</RowLink></ActionRow>
          {calc && <CostCalculator benchmark={amount} />}
          <Note>
            {office.auto
              ? "Bhulekh and IGR spell village names differently, so Bhumitra matched this plot to the closest IGR village. If it looks wrong, choose the right one above. "
              : ""}
            Official IGR benchmark for registration. It is not an open-market price; the office confirms the final figure.
          </Note>
        </>
      )}

      {b && b.status !== "AVAILABLE" && (
        <>
          <Row label="Govt land value" value={needsOffice ? "Pick an office" : "Not published"} tone="muted" />
          {needsOffice && candidates.length > 0 && <div className="rrow">{officePicker("Office")}</div>}
          <ActionRow label="Your deal"><RowLink icon={calc ? "chevronDown" : "chevron"} aria-expanded={calc} onClick={() => setCalc(!calc)}>Estimate</RowLink></ActionRow>
          {calc && <CostCalculator benchmark={null} />}
          <Note>
            {needsOffice
              ? "More than one registration office serves this village. Pick the one for this plot to see its value."
              : b.message || "The government hasn't listed a rate for this plot. You can still estimate registration cost from a price."}
          </Note>
        </>
      )}
    </Section>
  );
}

export function SalesSection({ value, isOpen, toggle }: Pick<Props, "value" | "isOpen" | "toggle">) {
  const b = value.state === "ready" ? value.data : null;
  return (
    <Section icon="history" title="Sales history" open={isOpen("sales")} onToggle={() => toggle("sales")} loading={value.state === "loading"}>
      {value.state === "loading" && <Rows lines={2} />}
      {value.state !== "loading" && (
        <>
          {b?.highest_transaction_value
            ? <>
                <Row label="Highest sale" value={inr(b.highest_transaction_value)} caption="Registered nearby" />
                <Row label="Sale date" value={b.transaction_date} />
              </>
            : <Row label="Sales online" value="None published" />}
          <ActionRow label="Encumbrance cert.">
            <a className="rlink" href={IGR_EC} target="_blank" rel="noopener">Apply <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7.5 16.5 16.5 7.5M9 7.5h7.5V15" /></svg></a>
          </ActionRow>
          <Note>An Encumbrance Certificate from the registration office lists every past sale.</Note>
        </>
      )}
    </Section>
  );
}

function CostCalculator({ benchmark }: { benchmark: number | null }) {
  const [price, setPrice] = useState("");
  const [woman, setWoman] = useState(false);
  const deal = Number(price.replace(/[^\d]/g, "")) || 0;
  const base = Math.max(deal, benchmark ?? 0);
  const c = useMemo(() => dealCosts(base, woman), [base, woman]);
  return (
    <div className="calc">
      <label className="calc__field">
        <span>Deal price (optional)</span>
        <input inputMode="numeric" placeholder={benchmark ? `Leave blank to use ${inrShort(benchmark)}` : "Enter the deal price"} value={price ? deal.toLocaleString("en-IN") : ""} onChange={(e) => setPrice(e.target.value)} />
      </label>
      <div className="seg" role="radiogroup" aria-label="Buyer">
        <button role="radio" aria-checked={!woman} className={!woman ? "is-on" : ""} onClick={() => setWoman(false)}>Standard</button>
        <button role="radio" aria-checked={woman} className={woman ? "is-on" : ""} onClick={() => setWoman(true)}>Woman buyer</button>
      </div>
      {base > 0 ? (
        <dl className="calc__out">
          <div><dt>Stamp duty ({woman ? "4%" : "5%"})</dt><dd>{inr(c.stamp)}</dd></div>
          <div><dt>Registration fee (2%)</dt><dd>{inr(c.reg)}</dd></div>
          <div className="calc__total"><dt>Estimated total</dt><dd>{inr(c.total)}</dd></div>
        </dl>
      ) : (
        <p className="rempty">Enter the deal price to estimate costs.</p>
      )}
      <p className="rnote">Worked out on the higher of the deal price and the government value, at IGR Odisha's rates for a sale deed.</p>
    </div>
  );
}

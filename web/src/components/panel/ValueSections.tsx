// Government land value, registration cost and sales history (IGR Odisha).
import { useMemo, useState } from "react";
import { dealCosts, inr, inrShort } from "../../lib/format";
import type { BenchmarkResponse, Jurisdiction, SelectedPlot } from "../../lib/types";
import type { Load } from "../map/useLandRecord";
import { Field, Rows, Section, SectionError } from "./Section";

interface Props {
  value: Load<BenchmarkResponse>;
  plot: SelectedPlot;
  jurisdiction: Jurisdiction | null;
  setJurisdiction: (j: Jurisdiction | null) => void;
}

function benchmarkAmount(b: BenchmarkResponse, areaAcre: number | null): number | null {
  if (b.calculation?.indicative_benchmark_amount) return b.calculation.indicative_benchmark_amount;
  if (b.unit_rates?.per_acre && areaAcre) return b.unit_rates.per_acre * areaAcre;
  return null;
}

export function ValueSection({ value, plot, jurisdiction, setJurisdiction }: Props) {
  const b = value.state === "ready" ? value.data : null;
  const needsOffice = b?.status === "MAPPING_REQUIRES_USER_SELECTION" || b?.status === "AMBIGUOUS";
  const amount = b && b.status === "AVAILABLE" ? benchmarkAmount(b, plot.areaAcre) : null;

  return (
    <Section icon="area" title="Government land value" loading={value.state === "loading"} loadingText="Checking IGR Odisha">
      {value.state === "loading" && <Rows lines={3} />}
      {value.state === "error" && <SectionError message={value.message} retry={value.retry} />}

      {b && needsOffice && (
        <div className="office">
          <p>More than one registration office could serve this village. Pick the one for this plot to see its value.</p>
          <select
            aria-label="Registration office and village"
            value={jurisdiction?.token ?? ""}
            onChange={(e) => {
              const c = b.candidates?.find((x) => x.candidate_token === e.target.value);
              setJurisdiction(c ? { regoffId: c.registration_office_id, villageId: c.village_id, token: c.candidate_token, label: `${c.village_name} · ${c.registration_office_name}` } : null);
            }}
          >
            <option value="">Choose village · office</option>
            {(b.candidates ?? []).map((c) => (
              <option key={c.candidate_token} value={c.candidate_token}>{c.village_name} · {c.registration_office_name}</option>
            ))}
          </select>
        </div>
      )}

      {b && b.status === "AVAILABLE" && (
        <>
          <div className="pvalue">
            <small>Govt land value for this plot</small>
            <strong>{inrShort(amount)}</strong>
            {amount != null && <span>{inr(amount)}</span>}
          </div>
          <dl className="pgrid">
            <Field label="Rate / acre" value={inr(b.unit_rates?.per_acre)} />
            <Field label="Rate / decimal" value={inr(b.unit_rates?.per_decimal_100)} />
            <Field label="Rate / sq ft" value={inr(b.unit_rates?.per_square_foot, 2)} />
            <Field label="Registration office" value={b.registration_office || "—"} />
          </dl>
          {jurisdiction && <button className="linkbtn" onClick={() => setJurisdiction(null)}>Change office ({jurisdiction.label})</button>}
          <p className="pnote">Official IGR benchmark for registration. It is not a market price; the office confirms the final figure.</p>
        </>
      )}

      {b && !needsOffice && b.status !== "AVAILABLE" && (
        <p className="psec__empty">{b.message || "No official benchmark rate is published for this plot."}</p>
      )}

      {b && b.status === "AVAILABLE" && <CostCalculator benchmark={amount} />}
      {b && b.status === "AVAILABLE" && <Sales b={b} />}
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
      <h4>Registration cost</h4>
      <label className="calc__field">
        <span>Deal price (optional)</span>
        <input inputMode="numeric" placeholder={benchmark ? `Leave blank to use ${inrShort(benchmark)}` : "Enter the deal price"} value={price ? Number(price.replace(/[^\d]/g, "")).toLocaleString("en-IN") : ""} onChange={(e) => setPrice(e.target.value)} />
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
        <p className="psec__empty">Enter the deal price to estimate costs.</p>
      )}
      <p className="pnote">Worked out on the higher of the deal price and the government value, at IGR Odisha's rates for a sale deed.</p>
    </div>
  );
}

function Sales({ b }: { b: BenchmarkResponse }) {
  return (
    <div className="sales">
      <h4>Sales history</h4>
      {b.highest_transaction_value ? (
        <dl className="pgrid">
          <Field label="Highest recorded sale nearby" value={inr(b.highest_transaction_value)} />
          <Field label="Sale date" value={b.transaction_date || "—"} />
        </dl>
      ) : (
        <p className="psec__empty">No registered sales found online. An Encumbrance Certificate from the registration office lists every past sale.</p>
      )}
    </div>
  );
}

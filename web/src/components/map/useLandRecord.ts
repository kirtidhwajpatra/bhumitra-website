// Loads everything the land panel shows for a plot. Each part loads on its own so the
// panel fills in section by section, like the app's land report.
import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { BenchmarkResponse, IGRCandidate, Jurisdiction, RoRResponse, SelectedPlot } from "../../lib/types";

export type Load<T> =
  | { state: "loading" }
  | { state: "ready"; data: T }
  | { state: "error"; message: string; retry?: () => void };

/** Which IGR office / village the land value came from, and how it was chosen. */
export interface OfficeChoice {
  current: Jurisdiction | null;
  /** True when Bhumitra picked the office itself; false when the user chose it. */
  auto: boolean;
  /** Every office / village the backend offered, best match first. */
  candidates: IGRCandidate[];
}

export interface RecordState {
  ror: Load<RoRResponse>;
  /** True when the free searches are used up and only the masked preview came back. */
  limited: boolean;
  value: Load<BenchmarkResponse>;
  office: OfficeChoice;
  jurisdiction: Jurisdiction | null;
  setJurisdiction: (j: Jurisdiction | null) => void;
}

const RETRYABLE = "Bhulekh is slow or not responding right now.";
/** How many top-ranked offices to try at once, same as the app (maxAutoResolveAttempts). */
const AUTO_TRY = 4;

export function toJurisdiction(c: IGRCandidate): Jurisdiction {
  return { regoffId: c.registration_office_id, villageId: c.village_id, token: c.candidate_token, label: `${c.village_name} · ${c.registration_office_name}` };
}

const needsOffice = (b: BenchmarkResponse) => b.status === "MAPPING_REQUIRES_USER_SELECTION" || b.status === "AMBIGUOUS";
const hasValue = (b: BenchmarkResponse) => b.status === "AVAILABLE" && !!(b.unit_rates?.per_acre || b.calculation?.indicative_benchmark_amount);

/** Best match first: the backend's score, then the Bhulekh thana number when it matches. */
function rank(cands: IGRCandidate[], thana: string | null): IGRCandidate[] {
  return [...cands].sort((a, b) => {
    const ta = thana && a.thana_number === thana ? 1 : 0;
    const tb = thana && b.thana_number === thana ? 1 : 0;
    return tb - ta || (b.score ?? 0) - (a.score ?? 0);
  });
}

/** "ସଦର (129)" -> "129" */
function thanaNumber(r: RoRResponse | null): string | null {
  const m = r?.raw_fields?.thana?.match(/(\d+)\s*\)?\s*$/);
  return m ? m[1] : null;
}

export function useLandRecord(plot: SelectedPlot | null): RecordState {
  const [ror, setRor] = useState<Load<RoRResponse>>({ state: "loading" });
  const [limited, setLimited] = useState(false);
  const [value, setValue] = useState<Load<BenchmarkResponse>>({ state: "loading" });
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(null);
  const [office, setOffice] = useState<OfficeChoice>({ current: null, auto: false, candidates: [] });
  const [rorAttempt, setRorAttempt] = useState(0);
  const [valueAttempt, setValueAttempt] = useState(0);
  const key = plot ? `${plot.village.villageId}:${plot.plotNumber}` : "";

  // New plot: forget the office picked for the previous one.
  useEffect(() => {
    setJurisdiction(null);
    setOffice({ current: null, auto: false, candidates: [] });
  }, [key]);

  useEffect(() => {
    if (!plot) return;
    const ctrl = new AbortController();
    setRor({ state: "loading" });
    setLimited(false);
    (async () => {
      try {
        const data = await api.ror(plot.village, plot.plotNumber, ctrl.signal);
        setRor({ state: "ready", data });
        setLimited(!!data.is_preview);
      } catch (e) {
        if (ctrl.signal.aborted) return; // a newer plot was opened
        if (e instanceof ApiError && e.status === 403) {
          // Out of free searches: the backend still serves the masked preview.
          try {
            const data = await api.rorPreview(plot.village, plot.plotNumber, ctrl.signal);
            setLimited(true);
            setRor({ state: "ready", data });
          } catch {
            setRor({ state: "error", message: RETRYABLE, retry: () => setRorAttempt((n) => n + 1) });
          }
        } else if (e instanceof ApiError && e.status === 404) {
          setRor({ state: "error", message: "Bhulekh has no Record of Rights for this plot number. It may be government land, a road, or a plot that was split recently." });
        } else {
          setRor({ state: "error", message: RETRYABLE, retry: () => setRorAttempt((n) => n + 1) });
        }
      }
    })();
    return () => ctrl.abort();
  }, [key, rorAttempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // The Bhulekh thana number helps pick the right IGR village; read it when it arrives.
  const thana = thanaNumber(ror.state === "ready" ? ror.data : null);

  useEffect(() => {
    if (!plot) return;
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    setValue({ state: "loading" });
    (async () => {
      try {
        const first = await api.benchmark(plot.village, plot.plotNumber, plot.areaAcre, jurisdiction, signal);
        if (jurisdiction || !needsOffice(first) || !first.candidates?.length) {
          if (jurisdiction) setOffice((o) => ({ ...o, current: jurisdiction, auto: false }));
          setValue({ state: "ready", data: first });
          return;
        }
        // More than one office could serve this village. Like the app, try the best
        // matches at once and use the best-ranked one that has a published rate.
        const ranked = rank(first.candidates, thana);
        const tries = ranked.slice(0, AUTO_TRY);
        const results = await Promise.all(
          tries.map((c) => api.benchmark(plot.village, plot.plotNumber, plot.areaAcre, toJurisdiction(c), signal).catch(() => null)),
        );
        if (signal.aborted) return;
        const i = results.findIndex((r) => r && hasValue(r));
        if (i >= 0) {
          setOffice({ current: toJurisdiction(tries[i]), auto: true, candidates: ranked });
          setValue({ state: "ready", data: results[i]! });
        } else {
          setOffice({ current: null, auto: false, candidates: ranked });
          setValue({ state: "ready", data: { ...first, candidates: ranked } });
        }
      } catch {
        if (signal.aborted) return;
        setValue({ state: "error", message: "The government land value couldn't be loaded.", retry: () => setValueAttempt((n) => n + 1) });
      }
    })();
    return () => ctrl.abort();
    // `thana` is read once when the value loads; it is not a reason to reload.
  }, [key, jurisdiction, valueAttempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ror, limited, value, office, jurisdiction, setJurisdiction };
}

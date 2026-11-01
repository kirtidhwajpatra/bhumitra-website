// Loads everything the land panel shows for a plot. Each part loads on its own so the
// panel fills in section by section, like the app's land report.
import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import type { BenchmarkResponse, Jurisdiction, RoRResponse, SelectedPlot } from "../../lib/types";

export type Load<T> =
  | { state: "loading" }
  | { state: "ready"; data: T }
  | { state: "error"; message: string; retry?: () => void };

export interface RecordState {
  ror: Load<RoRResponse>;
  /** True when the free searches are used up and only the masked preview came back. */
  limited: boolean;
  value: Load<BenchmarkResponse>;
  jurisdiction: Jurisdiction | null;
  setJurisdiction: (j: Jurisdiction | null) => void;
}

const RETRYABLE = "Bhulekh is slow or not responding right now.";

export function useLandRecord(plot: SelectedPlot | null): RecordState {
  const [ror, setRor] = useState<Load<RoRResponse>>({ state: "loading" });
  const [limited, setLimited] = useState(false);
  const [value, setValue] = useState<Load<BenchmarkResponse>>({ state: "loading" });
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(null);
  const [rorAttempt, setRorAttempt] = useState(0);
  const [valueAttempt, setValueAttempt] = useState(0);
  const key = plot ? `${plot.village.villageId}:${plot.plotNumber}` : "";

  // New plot: forget the office picked for the previous one.
  useEffect(() => setJurisdiction(null), [key]);

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

  useEffect(() => {
    if (!plot) return;
    const ctrl = new AbortController();
    setValue({ state: "loading" });
    api
      .benchmark(plot.village, plot.plotNumber, plot.areaAcre, jurisdiction, ctrl.signal)
      .then((data) => setValue({ state: "ready", data }))
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setValue({ state: "error", message: "The government land value couldn't be loaded.", retry: () => setValueAttempt((n) => n + 1) });
      });
    return () => ctrl.abort();
  }, [key, jurisdiction, valueAttempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ror, limited, value, jurisdiction, setJurisdiction };
}

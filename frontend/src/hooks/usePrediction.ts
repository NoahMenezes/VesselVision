"use client";
/** Shared prediction flow (Phase 9/13).
 *
 *  Why centralized: every panel used to run its own debounced auto-predict,
 *  so one edit fired four overlapping request chains that flickered the
 *  SCORING state and could leave it stuck. Now there is exactly one driver
 *  (mounted once in Dashboard) plus manual predictNow() for buttons.
 *  A request id + shared abort means only the latest response ever writes.
 */
import { useCallback, useEffect, useRef } from "react";
import { getHealth, postExplain, postPredict } from "@/lib/api";
import type { BackendStatus, ExplainResponse, PredictResponse } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";

let latest = 0;
let sharedAborter: AbortController | null = null;

interface Sink {
  setPrediction: (v: PredictResponse | null) => void;
  setExplanation: (v: ExplainResponse | null) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setBackend: (v: BackendStatus) => void;
}

async function runPredict(
  vals: Record<string, number | string>,
  selected: string,
  store: Sink,
) {
  if (Object.keys(vals).length === 0) return;
  const id = ++latest;
  sharedAborter?.abort();
  const ctrl = new AbortController();
  sharedAborter = ctrl;
  store.setLoading(true);
  store.setError(null);
  const fresh = () => id === latest && !ctrl.signal.aborted;
  try {
    const ok = await getHealth();
    if (!fresh()) return;
    store.setBackend(ok ? "online" : "offline");
    if (!ok) {
      store.setError("Not connected.");
      return;
    }
    const pred = await postPredict(vals);
    if (!fresh()) return;
    if (!pred) {
      store.setError("No result yet — everything is still loading.");
      store.setPrediction(null);
      return;
    }
    store.setPrediction(pred);
    const expl = await postExplain(vals, selected);
    if (!fresh()) return;
    store.setExplanation(expl);
  } catch {
    if (fresh()) store.setError("Something went wrong. It will retry as you keep typing.");
  } finally {
    if (fresh()) store.setLoading(false);
  }
}

export function usePrediction() {
  const {
    selected,
    setPrediction, setExplanation, setLoading, setError, setBackend,
  } = useStore();

  const predictNow = useCallback(
    (vals: Record<string, number | string>) =>
      void runPredict(vals, selected, {
        setPrediction, setExplanation, setLoading, setError, setBackend,
      }),
    [selected, setPrediction, setExplanation, setLoading, setError, setBackend],
  );

  return { predictNow };
}

/** Mount once (Dashboard): debounced auto-predict ~400ms after edits stop. */
export function PredictionDriver() {
  const { inputs, selected } = useStore();
  const { predictNow } = usePrediction();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => predictNow(inputs), 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [inputs, selected, predictNow]);

  useEffect(
    () => () => {
      sharedAborter?.abort();
    },
    [],
  );

  return null;
}

"use client";
/** Debounced live prediction (Phase 9/13). Fires ~400ms after edits stop;
 *  in-flight requests are cancelled so fast edits never show stale results.
 *  All states land in the shared store; 503 (untrained) becomes guidance.
 */
import { useCallback, useEffect, useRef } from "react";
import { getHealth, postExplain, postPredict } from "@/lib/api";
import { useStore } from "@/store/VesselVisionContext";

export function usePrediction() {
  const {
    inputs, setPrediction, setExplanation, selected,
    setLoading, setError, setBackend,
  } = useStore();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aborter = useRef<AbortController | null>(null);

  const predictNow = useCallback(async (vals: Record<string, number | string>) => {
    if (Object.keys(vals).length === 0) return;
    aborter.current?.abort();
    aborter.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const ok = await getHealth();
      setBackend(ok ? "online" : "offline");
      if (!ok) {
        setError("Not connected.");
        return;
      }
      const pred = await postPredict(vals);
      if (!pred) {
        setError("No result yet — everything is still loading.");
        setPrediction(null);
        return;
      }
      setPrediction(pred);
      const expl = await postExplain(vals, selected);
      setExplanation(expl);
    } catch {
      setError("Something went wrong. It will retry as you keep typing.");
    } finally {
      setLoading(false);
    }
  }, [selected, setBackend, setError, setExplanation, setLoading, setPrediction]);

  // Debounced auto-predict on input/selection change.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void predictNow(inputs), 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [inputs, selected, predictNow]);

  useEffect(() => () => aborter.current?.abort(), []);

  return { predictNow };
}

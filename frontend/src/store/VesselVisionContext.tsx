"use client";
/** Global store (React context; no extra deps). Holds form inputs,
 *  predictions, explanation, selection, and request states.
 */
import { createContext, useContext, useMemo, useState } from "react";
import type {
  BackendStatus,
  ExplainResponse,
  PredictResponse,
  SelectedTarget,
  VesselKey,
} from "@/lib/types";

interface Store {
  inputs: Record<string, number | string>;
  setInputs: (v: Record<string, number | string>) => void;
  prediction: PredictResponse | null;
  setPrediction: (v: PredictResponse | null) => void;
  explanation: ExplainResponse | null;
  setExplanation: (v: ExplainResponse | null) => void;
  selected: SelectedTarget;
  setSelected: (v: SelectedTarget) => void;
  hoverVessel: VesselKey | null;
  setHoverVessel: (v: VesselKey | null) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string | null;
  setError: (v: string | null) => void;
  backend: BackendStatus;
  setBackend: (v: BackendStatus) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [inputs, setInputs] = useState<Record<string, number | string>>({});
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [selected, setSelected] = useState<SelectedTarget>("CAD");
  const [hoverVessel, setHoverVessel] = useState<VesselKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<BackendStatus>("checking");
  const value = useMemo(
    () => ({
      inputs, setInputs, prediction, setPrediction, explanation,
      setExplanation, selected, setSelected, hoverVessel, setHoverVessel,
      loading, setLoading,
      error, setError, backend, setBackend,
    }),
    [inputs, prediction, explanation, selected, hoverVessel, loading, error, backend],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

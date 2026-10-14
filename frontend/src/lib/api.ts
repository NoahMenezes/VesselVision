/** Axios client for the FastAPI backend. Base URL from env; every call
 *  fails soft (caller decides offline UI) instead of throwing raw errors.
 */
import axios from "axios";
import type {
  BatchRowResult,
  ExplainResponse,
  FeatureSchema,
  HistoryRecord,
  PredictResponse,
  SamplePatient,
  UncertaintyResponse,
} from "./types";

/** Same-origin "/api" by default: in production Vercel routes it to the
 *  backend service; in local dev next.config rewrites it to :8000.
 *  NEXT_PUBLIC_API_URL still overrides (direct backend, e.g. Render). */
const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const api = axios.create({ baseURL, timeout: 10000 });

export async function getHealth(): Promise<boolean> {
  try {
    const res = await api.get("/health");
    return res.data?.status === "ok";
  } catch {
    return false;
  }
}

/** Success caches: every panel reads the same schema/samples without
 *  refetching. Failures are never cached, so a late-starting backend is
 *  picked up on the next call. */
let schemaCache: FeatureSchema | undefined;
let samplesCache: SamplePatient[] | undefined;

export async function getSchema(): Promise<FeatureSchema | null> {
  if (schemaCache !== undefined) return schemaCache;
  try {
    schemaCache = (await api.get("/schema")).data as FeatureSchema;
    return schemaCache;
  } catch {
    return null;
  }
}

export async function getSamples(): Promise<SamplePatient[]> {
  if (samplesCache !== undefined) return samplesCache;
  try {
    samplesCache = (await api.get("/samples")).data as SamplePatient[];
    return samplesCache;
  } catch {
    return [];
  }
}

export async function postPredict(
  inputs: Record<string, number | string>,
): Promise<PredictResponse | null> {
  try {
    return (await api.post("/predict", { inputs })).data as PredictResponse;
  } catch {
    return null;
  }
}

let uncertaintyCache: UncertaintyResponse | undefined;

export async function getUncertainty(): Promise<UncertaintyResponse | null> {
  if (uncertaintyCache !== undefined) return uncertaintyCache;
  try {
    uncertaintyCache = (await api.get("/uncertainty")).data as UncertaintyResponse;
    return uncertaintyCache;
  } catch {
    return null;
  }
}

/** Checkup history (needs DATABASE_URL/Neon server-side). Null means
 *  unavailable — the UI says so instead of breaking. */
export async function getHistory(): Promise<HistoryRecord[] | null> {
  try {
    return (await api.get("/history")).data as HistoryRecord[];
  } catch {
    return null;
  }
}

export async function postHistory(
  label: string,
  inputs: Record<string, number | string>,
): Promise<{ id: number; prediction: PredictResponse } | null> {
  try {
    return (await api.post("/history", { label, inputs })).data as {
      id: number;
      prediction: PredictResponse;
    };
  } catch {
    return null;
  }
}

export async function deleteHistory(id: number): Promise<boolean> {
  try {
    await api.delete(`/history/${id}`);
    return true;
  } catch {
    return false;
  }
}

/** Batch scoring: the raw file goes straight to POST /predict-batch
 *  (parsed in memory server-side, never stored). Null on any failure. */
export async function postBatch(file: File): Promise<BatchRowResult[] | null> {
  try {
    const form = new FormData();
    form.append("file", file);
    return (await api.post("/predict-batch", form)).data as BatchRowResult[];
  } catch {
    return null;
  }
}

export async function postExplain(
  inputs: Record<string, number | string>,
  target: string,
): Promise<ExplainResponse | null> {
  try {
    return (await api.post("/explain", { inputs, target })).data as ExplainResponse;
  } catch {
    return null;
  }
}

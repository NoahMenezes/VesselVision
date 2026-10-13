/** Axios client for the FastAPI backend. Base URL from env; every call
 *  fails soft (caller decides offline UI) instead of throwing raw errors.
 */
import axios from "axios";
import type {
  ExplainResponse,
  FeatureSchema,
  PredictResponse,
  SamplePatient,
} from "./types";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

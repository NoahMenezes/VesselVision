"use client";
/** Live pipeline status from real endpoints (truthful pending states). */
import { useEffect, useState } from "react";
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface PipelineStatus {
  api: boolean | null;
  schema: boolean | null;
  models: boolean | null;
  explain: boolean | null;
}

export function usePipelineStatus(): PipelineStatus {
  const [s, setS] = useState<PipelineStatus>({ api: null, schema: null, models: null, explain: null });
  useEffect(() => {
    let live = true;
    (async () => {
      const get = async (path: string) => {
        try {
          const r = await axios.get(`${BASE}${path}`, { timeout: 4000 });
          return r.status === 200;
        } catch {
          return false;
        }
      };
      const [api, schema, models] = await Promise.all([
        get("/health"),
        get("/schema"),
        get("/metrics"),
      ]);
      // Explainability shares the model artifacts; live exactly when they are.
      if (live) setS({ api, schema, models, explain: models });
    })();
    return () => {
      live = false;
    };
  }, []);
  return s;
}

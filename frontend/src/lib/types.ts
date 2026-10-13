/** Shared API contracts (mirror backend/app/schemas.py + Phase 7 endpoints).
 *  Predictions are null until the backend answers; never fabricate numbers.
 */

export type VesselKey = "LAD" | "LCX" | "RCA";
export type SelectedTarget = VesselKey | "CAD";

export interface RiskPrediction {
  probability: number; // calibrated 0..1
  label: 0 | 1;
  threshold: number;
}

export interface PredictResponse {
  cad: RiskPrediction;
  vessels: Record<VesselKey, RiskPrediction>;
}

export interface ShapContribution {
  feature: string;
  label: string;
  value: number | string;
  unit: string | null;
  shap_value: number;
  direction: "increases" | "decreases";
}

export interface ExplainResponse {
  target: string;
  probability: number;
  base_value: number;
  contributions: ShapContribution[];
}

export interface SchemaField {
  label: string;
  unit: string | null;
  normal: string | null;
  group: string;
  kind: "numeric" | "binary" | "categorical" | "ordinal" | "target";
  dtype: string;
}

export interface FeatureSchema {
  targets: string[];
  features: Record<string, SchemaField>;
}

export interface SamplePatient {
  id: string;
  description: string;
  inputs: Record<string, number | string>;
}

export interface BatchRowResult {
  row: number;
  prediction: PredictResponse | null;
  errors: string[];
}

export interface UncertaintyBand {
  plusminus: number;
  accuracy: number;
  rounds: number;
}

export type UncertaintyResponse = Record<string, UncertaintyBand>;

export type BackendStatus = "checking" | "online" | "offline";

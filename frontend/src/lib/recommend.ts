/** Rules-based next steps (no LLM, by design).
 *
 *  An LLM free-writing medical advice can hallucinate, needs keys and
 *  network, and cannot be unit-tested. These rules are deterministic:
 *  out-of-range values and diabetes/smoking flags map to short actions,
 *  each citing the exact number that triggered it and framed as
 *  talk-to-your-doctor. The top SHAP driver bumps its matching action
 *  first. Pure function — see recommend.test.ts.
 */
import type { ExplainResponse } from "./types";

export type NextId = "quit" | "bp" | "ldl" | "sugar" | "weight" | "pump" | "routine";

export interface Reco {
  id: NextId;
  detail: string;
}

interface Candidate extends Reco {
  prio: number;
}

const DRIVER_OF: Record<string, NextId> = {
  current_smoker: "quit",
  ex_smoker: "quit",
  bp: "bp",
  htn: "bp",
  ldl: "ldl",
  dlp: "ldl",
  hdl: "ldl",
  tg: "ldl",
  fbs: "sugar",
  dm: "sugar",
  bmi: "weight",
  obesity: "weight",
  weight: "weight",
  ef_tte: "pump",
  region_rwma: "pump",
  chf: "pump",
};

export function recommendations(
  inputs: Record<string, number | string>,
  explanation: ExplainResponse | null,
): Reco[] {
  const out: Candidate[] = [];
  const num = (n: string): number | null =>
    typeof inputs[n] === "number" ? (inputs[n] as number) : null;

  if (inputs.current_smoker === 1) {
    out.push({
      id: "quit",
      prio: 0,
      detail:
        "You currently smoke. Quitting is the single biggest lever for your arteries — talk to your doctor about a quit plan.",
    });
  }

  const bp = num("bp");
  if ((bp !== null && bp >= 140) || inputs.htn === 1) {
    out.push({
      id: "bp",
      prio: 1,
      detail:
        `${bp !== null ? `Systolic ${bp} mmHg (usual: below 120). ` : ""}` +
        "Ask your doctor about a blood-pressure check.",
    });
  }

  const ldl = num("ldl");
  if (ldl !== null && ldl >= 160) {
    out.push({
      id: "ldl",
      prio: 2,
      detail: `LDL ${ldl} mg/dL (usual: below 100). Discuss cholesterol with your doctor.`,
    });
  } else if (ldl !== null && ldl >= 130) {
    out.push({
      id: "ldl",
      prio: 3,
      detail: `LDL ${ldl} mg/dL (usual: below 100). Food, movement, and a doctor's view can move it.`,
    });
  }

  const fbs = num("fbs");
  if ((fbs !== null && fbs >= 126) || inputs.dm === 1) {
    out.push({
      id: "sugar",
      prio: 4,
      detail:
        `${fbs !== null ? `Fasting sugar ${fbs} mg/dL (usual: 70–100). ` : ""}` +
        "Ask about a diabetes check.",
    });
  }

  const bmi = num("bmi");
  if (bmi !== null && bmi >= 30) {
    out.push({
      id: "weight",
      prio: 5,
      detail: `BMI ${bmi} kg/m² (usual: 18.5–24.9). Even small sustained loss helps the heart.`,
    });
  }

  const ef = num("ef_tte");
  if (ef !== null && ef < 50) {
    out.push({
      id: "pump",
      prio: 6,
      detail: `Ejection fraction ${ef}% (usual: 55%+). Ask your doctor about this pump reading.`,
    });
  }

  if (out.length === 0) {
    return [
      {
        id: "routine",
        detail: "Nothing urgent in these numbers — keep regular checkups.",
      },
    ];
  }

  const top = (explanation?.contributions ?? [])
    .slice()
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))[0];
  const boosted = top ? DRIVER_OF[top.feature] : undefined;
  return out
    .sort((a, b) => (b.id === boosted ? 1 : 0) - (a.id === boosted ? 1 : 0) || a.prio - b.prio)
    .slice(0, 5)
    .map(({ id, detail }) => ({ id, detail }));
}

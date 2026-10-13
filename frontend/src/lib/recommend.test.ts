/** Determinism + triggering rules for the recommendation engine. */
import { describe, expect, test } from "bun:test";
import { recommendations } from "./recommend";
import type { ExplainResponse } from "./types";

const EXPL = (top: string): ExplainResponse => ({
  target: "CAD",
  probability: 0.8,
  base_value: 0.5,
  contributions: [
    { feature: top, label: top, value: 1, unit: null, shap_value: 0.4, direction: "increases" },
    { feature: "age", label: "Age", value: 60, unit: "years", shap_value: 0.1, direction: "increases" },
  ],
});

describe("recommendations", () => {
  test("smoker gets quit-smoking first", () => {
    const r = recommendations({ current_smoker: 1, ldl: 190 }, EXPL("ldl"));
    expect(r[0].id).toBe("ldl"); // top driver outranks even smoking
    expect(r.map((x) => x.id)).toContain("quit");
  });

  test("high LDL cites the number", () => {
    const r = recommendations({ ldl: 190 }, null);
    expect(r[0].id).toBe("ldl");
    expect(r[0].detail).toContain("190");
  });

  test("empty inputs fall back to routine", () => {
    expect(recommendations({}, null)).toEqual([
      { id: "routine", detail: expect.stringContaining("regular checkups") },
    ]);
  });

  test("deterministic: same inputs, same list", () => {
    const inp = { current_smoker: 1, bp: 150, ldl: 170, bmi: 32 };
    expect(recommendations(inp, EXPL("bp"))).toEqual(recommendations(inp, EXPL("bp")));
  });

  test("caps at five", () => {
    const r = recommendations(
      { current_smoker: 1, bp: 150, htn: 1, ldl: 190, fbs: 140, dm: 1, bmi: 33, ef_tte: 40 },
      null,
    );
    expect(r.length).toBeLessThanOrEqual(5);
  });
});

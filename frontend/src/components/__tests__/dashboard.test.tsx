/** Smoke tests: disclaimer, empty state, mobile tabs. No fake data asserted. */
import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";
import { Disclaimer } from "@/components/Disclaimer";
import { StoreProvider } from "@/store/VesselVisionContext";

function shell(ui: React.ReactNode) {
  return render(<StoreProvider>{ui}</StoreProvider>);
}

describe("clinical safety copy", () => {
  test("disclaimer is always visible with the full sentence", () => {
    shell(
      <>
        <Disclaimer />
      </>,
    );
    expect(
      screen.getByText(/decision support and educational purposes only/i),
    ).toBeDefined();
  });
});

describe("start state", () => {
  test("step strip plus centered patient form, no fabricated numbers", () => {
    shell(<Dashboard />);
    expect(screen.getByText("Patient data")).toBeDefined();
    expect(screen.getByText("3D heart")).toBeDefined();
    expect(screen.getByText("Risk results")).toBeDefined();
    expect(screen.getByText("Patient input")).toBeDefined();
    // No percent figures anywhere before a prediction exists.
    expect(document.body.textContent).not.toMatch(/\d+%/);
  });
});

describe("mobile section switch", () => {
  test("heart and risk tabs stay locked before the first prediction", () => {
    shell(<Dashboard />);
    const tabs = within(screen.getByRole("navigation", { name: "Dashboard sections" }));
    expect((tabs.getByRole("button", { name: "Heart" }) as HTMLButtonElement).disabled).toBe(true);
    expect((tabs.getByRole("button", { name: "Risk" }) as HTMLButtonElement).disabled).toBe(true);
    const data = tabs.getByRole("button", { name: "Data" });
    fireEvent.click(data);
    expect(data.getAttribute("aria-pressed")).toBe("true");
  });
});

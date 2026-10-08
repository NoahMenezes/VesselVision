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

describe("results empty state", () => {
  test("no prediction yet, no fabricated numbers", () => {
    shell(<Dashboard />);
    expect(screen.getByText("No prediction yet.")).toBeDefined();
    // No percent figures anywhere before a prediction exists.
    expect(document.body.textContent).not.toMatch(/\d+%/);
  });
});

describe("mobile section switch", () => {
  test("tabs switch views", () => {
    shell(<Dashboard />);
    const tabs = within(screen.getByRole("navigation", { name: "Dashboard sections" }));
    const heart = tabs.getByRole("button", { name: "Heart" });
    fireEvent.click(heart);
    expect(heart.getAttribute("aria-pressed")).toBe("true");
    expect(
      tabs.getByRole("button", { name: "Data" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });
});

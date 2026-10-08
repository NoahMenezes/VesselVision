/** Smoke tests: disclaimer, empty state, mobile tabs. No fake data asserted. */
import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { Dashboard } from "@/components/Dashboard";
import { Disclaimer, TopBar } from "@/components/TopBar";
import { StoreProvider } from "@/store/VesselVisionContext";

function shell(ui: React.ReactNode) {
  return render(<StoreProvider>{ui}</StoreProvider>);
}

describe("clinical safety copy", () => {
  test("disclaimer is always visible with the full sentence", () => {
    shell(
      <>
        <TopBar />
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
  test("verb tabs switch visible panels", () => {
    shell(<Dashboard />);
    const heart = screen.getByRole("button", { name: "Explore heart" });
    fireEvent.click(heart);
    expect(heart.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "Enter data" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });
});

import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevtoolsTrigger } from "../components/DevtoolsTrigger.js";

afterEach(cleanup);

describe("DevtoolsTrigger", () => {
  // Test 2 (design §9)
  it("renders at the default position", () => {
    render(
      <DevtoolsTrigger
        position="bottom-right"
        open={false}
        onToggle={vi.fn()}
        hasForcedRegion={false}
        panelId="p"
      />,
    );
    const trigger = document.querySelector('[data-cyd-part="trigger"]');
    expect(trigger?.className).toContain("cyd-pos-bottom-right");
  });

  // Test 3 (design §9)
  it("renders at a configured position", () => {
    render(
      <DevtoolsTrigger
        position="top-left"
        open={false}
        onToggle={vi.fn()}
        hasForcedRegion={false}
        panelId="p"
      />,
    );
    const trigger = document.querySelector('[data-cyd-part="trigger"]');
    expect(trigger?.className).toContain("cyd-pos-top-left");
    expect(trigger?.className).not.toContain("cyd-pos-bottom-right");
  });

  // Test 4 (design §9, trigger half)
  it("reflects open state via aria-expanded and calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <DevtoolsTrigger
        position="bottom-right"
        open={false}
        onToggle={onToggle}
        hasForcedRegion={false}
        panelId="p"
      />,
    );
    const trigger = document.querySelector('[data-cyd-part="trigger"]') as HTMLElement;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await user.click(trigger);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <DevtoolsTrigger
        position="bottom-right"
        open
        onToggle={onToggle}
        hasForcedRegion={false}
        panelId="p"
      />,
    );
    expect(document.querySelector('[data-cyd-part="trigger"]')?.getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("shows the forced-region badge only when a region override is active", () => {
    const { rerender } = render(
      <DevtoolsTrigger
        position="bottom-right"
        open={false}
        onToggle={vi.fn()}
        hasForcedRegion={false}
        panelId="p"
      />,
    );
    expect(document.querySelector('[data-cyd-part="trigger-forced-badge"]')).toBeNull();

    rerender(
      <DevtoolsTrigger
        position="bottom-right"
        open={false}
        onToggle={vi.fn()}
        hasForcedRegion
        panelId="p"
      />,
    );
    expect(document.querySelector('[data-cyd-part="trigger-forced-badge"]')).not.toBeNull();
  });
});

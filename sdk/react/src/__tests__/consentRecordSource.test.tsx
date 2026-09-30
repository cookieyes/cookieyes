import type { ConsentPayload, Regulation } from "@cookieyes/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useConsentActions } from "../hooks/useConsentActions.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { CookieOptOut } from "../presets/CookieOptOut.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { initCookieYes } from "../runtime.js";
import { clearCookie, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

function mountWithRecorder(regulation: Regulation = "GDPR") {
  const records: ConsentPayload[] = [];
  const runtime = initCookieYes({
    mode: "self-hosted",
    regulation,
    backend: { persist: (payload) => void records.push(payload) },
  });
  return { runtime, records };
}

describe("consent record source", () => {
  it('records "banner" for the banner buttons', () => {
    const { records } = mountWithRecorder();
    render(<CookieBanner />);
    fireEvent.click(screen.getByText("Accept All"));
    expect(records[0]).toMatchObject({ action: "accept_all", source: "banner" });
  });

  it('records "preferences" for the preferences dialog buttons', () => {
    const { runtime, records } = mountWithRecorder();
    act(() => runtime.manager.showPreferences());
    render(<CookiePreferences />);
    fireEvent.click(screen.getByText("Save My Preferences"));
    expect(records[0]).toMatchObject({ action: "save", source: "preferences" });
  });

  it('records "optout" for the opt-out dialog', () => {
    const { runtime, records } = mountWithRecorder("CCPA");
    act(() => runtime.showOptOut());
    render(<CookieOptOut />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Save My Preferences"));
    expect(records[0]).toMatchObject({ action: "reject_all", source: "optout" });
  });

  it("keeps onClick={acceptAll} working, and takes the source from the hook", () => {
    const { records } = mountWithRecorder();
    function Buttons() {
      const plain = useConsentActions();
      const banner = useConsentActions("banner");
      return (
        <>
          <button type="button" onClick={plain.acceptAll}>
            plain
          </button>
          <button type="button" onClick={banner.rejectAll}>
            banner
          </button>
        </>
      );
    }
    render(<Buttons />);
    fireEvent.click(screen.getByText("plain"));
    fireEvent.click(screen.getByText("banner"));
    expect(records.map((r) => r.source)).toEqual(["api", "banner"]);
  });
});

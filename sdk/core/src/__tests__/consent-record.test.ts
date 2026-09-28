import { beforeEach, describe, expect, it } from "vitest";
import { createConsentManager } from "../manager.js";
import type { ConsentPayload } from "../types.js";

beforeEach(() => {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
});

function managerWithRecorder() {
  const records: ConsentPayload[] = [];
  const manager = createConsentManager({
    regulation: "GDPR",
    backend: { persist: (payload) => void records.push(payload) },
  });
  return { manager, records };
}

describe("consent record", () => {
  it("records what the visitor did and where", () => {
    const { manager, records } = managerWithRecorder();
    manager.acceptAll("banner");
    manager.rejectAll("preferences");
    manager.acceptSelected(["analytics"], "optout");
    manager.savePreferences("preferences");
    expect(records.map(({ action, source }) => ({ action, source }))).toEqual([
      { action: "accept_all", source: "banner" },
      { action: "reject_all", source: "preferences" },
      { action: "accept_selected", source: "optout" },
      { action: "save", source: "preferences" },
    ]);
  });

  it('marks a direct call from your own code as "api"', () => {
    const { manager, records } = managerWithRecorder();
    manager.acceptAll();
    expect(records[0]?.source).toBe("api");
  });

  it('records "api" when an action is used directly as a click handler', () => {
    const { manager, records } = managerWithRecorder();
    const button = document.createElement("button");
    button.addEventListener("click", manager.acceptAll as unknown as EventListener);
    button.click();
    expect(records[0]?.source).toBe("api");
  });

  it("carries the decision time and the taxonomy hash already stored in the cookie", () => {
    const { manager, records } = managerWithRecorder();
    manager.acceptAll("banner");
    expect(records[0]?.decidedAt).toBe(new Date(manager.lastRenewed ?? 0).toISOString());
    expect(records[0]?.taxonomyHash).toBe(manager.taxonomyHash);
  });

  it("gives each decision its own recordId", () => {
    const { manager, records } = managerWithRecorder();
    manager.rejectAll("banner");
    manager.acceptAll("preferences");
    const ids = records.map((r) => r.recordId);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

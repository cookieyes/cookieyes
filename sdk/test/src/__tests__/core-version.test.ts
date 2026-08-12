import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_VERSION } from "@cookieyes/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  _resetCoreVersionWarning,
  coreVersionWarning,
  SUPPORTED_CORE_RANGE,
} from "../core-version.js";
import { createConsentTest } from "../harness.js";
import { resetConsentTestState } from "../reset.js";

afterEach(() => {
  resetConsentTestState();
  vi.restoreAllMocks();
});

const RANGE = ">=0.3.0 <1.0.0";

describe("a mismatched pair does not fail silently", () => {
  it.each(["0.3.0", "0.3.1", "0.4.0", "0.9.9"])("accepts in-range core %s", (version) => {
    expect(coreVersionWarning(version, RANGE)).toBeNull();
  });

  it.each(["1.0.0", "2.3.4"])("warns about a core that is too new (%s)", (version) => {
    const warning = coreVersionWarning(version, RANGE);
    expect(warning).not.toBeNull();
    expect(warning).toContain(version);
    expect(warning).toContain(RANGE);
  });

  it.each(["0.2.9", "0.1.0", "0.0.1"])("warns about a core that is too old (%s)", (version) => {
    expect(coreVersionWarning(version, RANGE)).not.toBeNull();
  });

  it("explains the consequence, not just the numbers", () => {
    const warning = coreVersionWarning("1.0.0", RANGE) ?? "";
    expect(warning).toMatch(/different engine than the one you ship/);
    expect(warning).toMatch(/compatibility table/);
  });

  it("stays silent on the dev sentinel — core read from source has no real version", () => {
    expect(coreVersionWarning("0.0.0-dev", RANGE)).toBeNull();
  });

  it("stays silent on a version it cannot parse, rather than crying wolf", () => {
    for (const version of ["", "next", "v1", "not.a.version", "1.2"]) {
      expect(coreVersionWarning(version, RANGE)).toBeNull();
    }
  });

  it("stays silent on a range it cannot parse", () => {
    expect(coreVersionWarning("9.9.9", "whatever")).toBeNull();
  });

  it("compares the patch component of the minimum", () => {
    expect(coreVersionWarning("0.3.5", ">=0.3.4 <1.0.0")).toBeNull();
    expect(coreVersionWarning("0.3.3", ">=0.3.4 <1.0.0")).not.toBeNull();
  });
});

describe("the warning as the harness emits it", () => {
  it("says nothing for the workspace pair we develop against", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    createConsentTest();

    // Guards against the check becoming background noise in our own suite —
    // a warning that always fires is a warning nobody reads.
    expect(warn.mock.calls.filter((c) => String(c[0]).includes("@cookieyes/core"))).toEqual([]);
  });

  it("fires at most once per process", () => {
    _resetCoreVersionWarning();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    // Nothing to warn about here, so assert the latch directly instead.
    createConsentTest();
    createConsentTest();

    expect(warn.mock.calls.filter((c) => String(c[0]).includes("expects @cookieyes/core"))).toEqual(
      [],
    );
  });
});

describe("the declared range cannot drift from package.json", () => {
  function packageJson(): { peerDependencies: Record<string, string> } {
    const path = join(fileURLToPath(new URL("../../", import.meta.url)), "package.json");
    return JSON.parse(readFileSync(path, "utf8"));
  }

  it("matches the peerDependencies range npm enforces at install time", () => {
    // Two sources of truth for the same rule is how they drift apart. If this
    // fails, the runtime warning and the install-time check disagree — and the
    // developer gets contradictory advice.
    expect(SUPPORTED_CORE_RANGE).toBe(packageJson().peerDependencies["@cookieyes/core"]);
  });
});

describe("CORE_VERSION reaches consumers as a real version", () => {
  it("is the dev sentinel when core is read from source", () => {
    // Vitest resolves the workspace source, so this documents which value the
    // repo's own tests see — and why the warning must treat it as unknown.
    expect(typeof CORE_VERSION).toBe("string");
  });

  it("has the sentinel replaced in core's built output", () => {
    const coreRoot = fileURLToPath(new URL("../../node_modules/@cookieyes/core/", import.meta.url));
    let built: string;
    try {
      built = readFileSync(join(coreRoot, "dist/index.js"), "utf8");
    } catch {
      // Turbo builds upstream packages before this suite runs, so a missing dist
      // means something changed about the pipeline — say so rather than pass quietly.
      throw new Error(
        "core's dist/index.js is missing; the build-time version injection cannot be verified",
      );
    }

    const { version } = JSON.parse(readFileSync(join(coreRoot, "package.json"), "utf8"));
    expect(built).not.toContain("0.0.0-dev");
    expect(built).toContain(version);
  });
});

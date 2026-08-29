import { afterEach, describe, expect, it, vi } from "vitest";
import { warnOnUntestedReactVersion } from "../diagnostics/peer-version-warning.js";

/**
 * `React.version` is a plain, non-configurable string export under Vite/Vitest's CJS interop for
 * "react" — `Object.defineProperty`/`vi.spyOn(..., "get")` cannot touch it directly. Mocking the
 * whole "react" module and backing `version` with a getter over hoisted, mutable state is the
 * reliable way to control it per test.
 */
const state = vi.hoisted(() => ({ version: "19.2.8" }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    get version() {
      return state.version;
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  state.version = "19.2.8";
});

describe("warnOnUntestedReactVersion", () => {
  it("warns on a React major newer than anything the CI matrix has verified", () => {
    vi.stubEnv("NODE_ENV", "development");
    state.version = "20.0.0";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnOnUntestedReactVersion();

    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0] as string;
    expect(message).toContain("20.0.0");
    expect(message).toContain("19");
  });

  it("stays silent on a React version at or below the highest verified major", () => {
    vi.stubEnv("NODE_ENV", "development");
    state.version = "19.2.8";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnOnUntestedReactVersion();

    expect(warn).not.toHaveBeenCalled();
  });

  it("stays silent on an old-but-declared-supported React version (18.x)", () => {
    vi.stubEnv("NODE_ENV", "development");
    state.version = "18.0.0";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnOnUntestedReactVersion();

    expect(warn).not.toHaveBeenCalled();
  });

  it("never warns when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    state.version = "20.0.0";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnOnUntestedReactVersion();

    expect(warn).not.toHaveBeenCalled();
  });

  it("dedupes: calling twice with the exact same React version warns only once", () => {
    vi.stubEnv("NODE_ENV", "development");
    state.version = "21.0.0";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnOnUntestedReactVersion();
    warnOnUntestedReactVersion();
    warnOnUntestedReactVersion();

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("warns again for a genuinely new untested version after an identical repeat was de-duped", () => {
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    state.version = "22.0.0";
    warnOnUntestedReactVersion();
    warnOnUntestedReactVersion(); // de-duped

    state.version = "23.0.0";
    warnOnUntestedReactVersion(); // genuinely new — should warn

    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("does not throw when `process` is undefined (raw <script> load, no bundler define step)", () => {
    const originalProcess = globalThis.process;
    // @ts-expect-error — deliberately deleting a global to simulate a non-bundled consumer.
    delete globalThis.process;
    state.version = "24.0.0";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      expect(() => warnOnUntestedReactVersion()).not.toThrow();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      globalThis.process = originalProcess;
    }
  });

  it("warns when React is BELOW the declared floor, since package managers install it anyway", () => {
    // DEVP-70 Story 6 is explicit that "some will install regardless with only a passing note" —
    // `--legacy-peer-deps` and `--force` both put React 17 against a `>=18.0.0` peer without
    // stopping anyone. Silence here is the confusing-failure-later outcome this warning replaces.
    vi.stubEnv("NODE_ENV", "development");
    state.version = "17.0.2";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnOnUntestedReactVersion();

    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]?.[0] ?? "");
    // Names what they have AND what is supported (Story 6 AC1), and links the matrix (AC3).
    expect(message).toContain("17.0.2");
    expect(message).toContain("18.0.0");
    expect(message).toContain("#compatibility");
    // Must be the below-floor wording, not the newer-than-verified wording.
    expect(message).toContain("below this SDK's supported floor");
  });

  it("stays silent on the exact declared floor itself", () => {
    vi.stubEnv("NODE_ENV", "development");
    state.version = "18.0.0";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnOnUntestedReactVersion();

    expect(warn).not.toHaveBeenCalled();
  });
});

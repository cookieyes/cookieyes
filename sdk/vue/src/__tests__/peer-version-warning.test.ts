import { afterEach, describe, expect, it, vi } from "vitest";
import packageJson from "../../package.json?raw";
import { warnOnUntestedVueVersion } from "../diagnostics/vue-version-warning.js";

/** `version` is a plain export of "vue"; mocking the module over mutable state controls it. */
const state = vi.hoisted(() => ({ version: "3.5.44" }));

vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue")>();
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
  state.version = "3.5.44";
});

function run(version: string): ReturnType<typeof vi.spyOn> {
  vi.stubEnv("NODE_ENV", "development");
  state.version = version;
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  warnOnUntestedVueVersion();
  return warn;
}

describe("warnOnUntestedVueVersion", () => {
  it("warns on a Vue major newer than anything the matrix has verified", () => {
    const warn = run("4.0.0");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("4.0.0");
  });

  it("stays silent on the verified range", () => {
    expect(run("3.5.44")).not.toHaveBeenCalled();
  });

  it("stays silent on the exact declared floor", () => {
    expect(run("3.5.0")).not.toHaveBeenCalled();
  });

  it("warns below the declared floor, since package managers install it anyway", () => {
    const warn = run("3.4.38");
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain("3.4.38");
    expect(message).toContain("3.5.0");
    expect(message).toContain("#compatibility");
    expect(message).toContain("below this SDK's supported floor");
  });

  it("warns for Vue 2", () => {
    expect(run("2.7.16")).toHaveBeenCalledTimes(1);
  });

  it("never warns when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    state.version = "4.0.0";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnOnUntestedVueVersion();
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns once per version", () => {
    vi.stubEnv("NODE_ENV", "development");
    state.version = "5.0.0";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnOnUntestedVueVersion();
    warnOnUntestedVueVersion();
    state.version = "6.0.0";
    warnOnUntestedVueVersion();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("ignores an unparsable version", () => {
    expect(run("not-a-version")).not.toHaveBeenCalled();
  });

  it("does not throw when `process` is undefined (no bundler define step)", () => {
    vi.stubGlobal("process", undefined);
    state.version = "9.0.0";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      expect(() => warnOnUntestedVueVersion()).not.toThrow();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("package.json agreement", () => {
  const pkg = JSON.parse(packageJson) as {
    peerDependencies: { vue: string };
    devDependencies: { vue: string };
  };

  it("treats the peer floor as supported and the version just below it as not", () => {
    const floor = /(\d+)\.(\d+)\.(\d+)/.exec(pkg.peerDependencies.vue);
    expect(floor).not.toBeNull();
    const [, major, minor] = floor ?? [];
    expect(run(`${major}.${minor}.0`)).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    expect(run(`${major}.${Number(minor) - 1}.99`)).toHaveBeenCalled();
  });

  it("treats the dev dependency's major as verified and the next major as not", () => {
    const major = Number(/(\d+)\./.exec(pkg.devDependencies.vue)?.[1]);
    expect(run(`${major}.99.0`)).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    expect(run(`${major + 1}.7.7`)).toHaveBeenCalled();
  });
});

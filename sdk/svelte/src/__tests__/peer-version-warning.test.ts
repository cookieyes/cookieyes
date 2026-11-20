import { afterEach, describe, expect, it, vi } from "vitest";
import packageJson from "../../package.json?raw";
import { warnOnUntestedSvelteVersion } from "../diagnostics/svelte-version-warning.js";

type SvelteGlobal = typeof globalThis & { __svelte?: { v: Set<string> } };

// The warning is once per major, so each case uses a major no earlier case has used.
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete (globalThis as SvelteGlobal).__svelte;
});

function run(...majors: string[]): ReturnType<typeof vi.spyOn> {
  vi.stubEnv("NODE_ENV", "development");
  (globalThis as SvelteGlobal).__svelte = { v: new Set(majors) };
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  warnOnUntestedSvelteVersion();
  return warn;
}

describe("warnOnUntestedSvelteVersion", () => {
  it("warns on a Svelte major newer than anything the matrix has verified", () => {
    const warn = run("6");
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain("Svelte 6");
    expect(message).toContain("#compatibility");
  });

  it("stays silent on the verified major", () => {
    expect(run("5")).not.toHaveBeenCalled();
  });

  it("warns on an older major, which the components cannot run on", () => {
    const warn = run("4");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(">=5.20.0");
  });

  it("warns once per major", () => {
    vi.stubEnv("NODE_ENV", "development");
    (globalThis as SvelteGlobal).__svelte = { v: new Set(["7"]) };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnOnUntestedSvelteVersion();
    warnOnUntestedSvelteVersion();
    (globalThis as SvelteGlobal).__svelte = { v: new Set(["8"]) };
    warnOnUntestedSvelteVersion();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("ignores an unparsable entry", () => {
    expect(run("not-a-version")).not.toHaveBeenCalled();
  });

  it("stays silent when Svelte has registered no version", () => {
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnOnUntestedSvelteVersion();
    expect(warn).not.toHaveBeenCalled();
  });

  it("never warns when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    (globalThis as SvelteGlobal).__svelte = { v: new Set(["9"]) };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnOnUntestedSvelteVersion();
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not throw when `process` is undefined (no bundler define step)", () => {
    vi.stubGlobal("process", undefined);
    (globalThis as SvelteGlobal).__svelte = { v: new Set(["10"]) };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      expect(() => warnOnUntestedSvelteVersion()).not.toThrow();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("package.json agreement", () => {
  const pkg = JSON.parse(packageJson) as {
    peerDependencies: { svelte: string };
    devDependencies: { svelte: string };
  };

  it("declares the floor the components need for $props.id()", () => {
    expect(pkg.peerDependencies.svelte).toBe(">=5.20.0");
  });

  it("treats the dev dependency's major as verified and the next major as not", () => {
    const major = Number(/(\d+)\./.exec(pkg.devDependencies.svelte)?.[1]);
    expect(run(String(major))).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    delete (globalThis as SvelteGlobal).__svelte;
    expect(run(String(major + 20))).toHaveBeenCalled();
  });
});

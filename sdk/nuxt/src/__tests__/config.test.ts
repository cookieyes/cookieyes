import { describe, expect, it } from "vitest";
import { _findFunctionPaths, _mergeConfig, _resolveConfig } from "../runtime/config.js";

describe("_findFunctionPaths", () => {
  it("lists the path of every function, inside objects and arrays", () => {
    const value = {
      a: 1,
      onConsentUpdate: () => {},
      list: [{ setup() {} }],
      nested: { fn: () => {} },
    };
    expect(_findFunctionPaths(value, "cookieyes")).toEqual([
      "cookieyes.onConsentUpdate",
      "cookieyes.list[0].setup",
      "cookieyes.nested.fn",
    ]);
  });

  it("finds nothing in plain JSON", () => {
    expect(
      _findFunctionPaths({ mode: "cookie-only", region: { map: { DE: "GDPR" } } }, "x"),
    ).toEqual([]);
  });
});

describe("_mergeConfig", () => {
  it("lets app.config.ts win per key", () => {
    expect(_mergeConfig({ regulation: "GDPR" }, { regulation: "CCPA" }).regulation).toBe("CCPA");
  });

  it("merges one level of nesting, so a map and a detector from different files both survive", () => {
    const detect = () => "DE";
    const merged = _mergeConfig({ region: { map: { DE: "GDPR" } } }, { region: { detect } });
    expect(merged.region).toEqual({ map: { DE: "GDPR" }, detect });
  });

  it("replaces arrays rather than concatenating them", () => {
    const merged = _mergeConfig(
      { categories: [{ id: "a", required: true }] } as never,
      { categories: [{ id: "b", required: false }] } as never,
    );
    expect(merged.categories).toEqual([{ id: "b", required: false }]);
  });

  it("works with either side missing", () => {
    expect(_mergeConfig(undefined, { mode: "cookie-only" })).toEqual({ mode: "cookie-only" });
    expect(_mergeConfig({ mode: "cookie-only" }, undefined)).toEqual({ mode: "cookie-only" });
  });
});

describe("_resolveConfig", () => {
  it("returns the same object for equal inputs, so the Vue plugin keeps its runtime", () => {
    const onChange = () => {};
    // A fresh copy of each side, as Nuxt hands every server request.
    const first = _resolveConfig({ regulation: "GDPR" }, { onConsentUpdate: onChange });
    const second = _resolveConfig({ regulation: "GDPR" }, { onConsentUpdate: onChange });
    expect(second).toBe(first);
  });

  it("returns a new object when a value or a function changes", () => {
    const first = _resolveConfig({ regulation: "GDPR" }, undefined);
    expect(_resolveConfig({ regulation: "CCPA" }, undefined)).not.toBe(first);

    const a = _resolveConfig(undefined, { onConsentUpdate: () => {} });
    const b = _resolveConfig(undefined, { onConsentUpdate: () => {} });
    expect(b).not.toBe(a);
  });
});

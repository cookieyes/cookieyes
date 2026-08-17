import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createConsentTest } from "../harness.js";
import { resetConsentTestState } from "../reset.js";

afterEach(resetConsentTestState);

function srcDir(): string {
  return fileURLToPath(new URL("../", import.meta.url));
}

/** Every shipped source module, as [filename, contents]. */
function sourceFiles(): Array<[string, string]> {
  const dir = srcDir();
  return readdirSync(dir)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => [name, readFileSync(join(dir, name), "utf8")]);
}

/**
 * A misspelled category must be caught *while writing the test*, not at runtime
 * three assertions later.
 *
 * Every `@ts-expect-error` below is a real assertion: `pnpm typecheck` fails if the
 * next line stops being an error, which is the only thing standing between us and a
 * silent widening regression in `CategoryIdOf`. Core's own `ConsentCategory`
 * deliberately absorbs any string, so the union here must be extracted from the
 * inferred literal taxonomy instead — easy to break, impossible to notice.
 */
describe("typo safety — compile time and runtime together", () => {
  it("rejects a misspelled built-in category", () => {
    const consent = createConsentTest();

    expect(() =>
      // @ts-expect-error — "analytcs" is not a valid category id
      consent.grant("analytcs"),
    ).toThrow(/Unknown consent category/);
  });

  it("rejects a misspelled key in initialConsent", () => {
    expect(() =>
      // @ts-expect-error — "analytcs" is not a valid category id
      createConsentTest({ initialConsent: { analytcs: true } }),
    ).toThrow(/Unknown consent category/);
  });

  it("narrows to a custom taxonomy's own ids", () => {
    const consent = createConsentTest({
      categories: [{ id: "essential", required: true }, { id: "marketing" }],
    });

    // In scope for this taxonomy — must compile.
    consent.grant("marketing");
    expect(consent.has("marketing")).toBe(true);

    expect(() =>
      // @ts-expect-error — "analytics" is not part of the declared taxonomy
      consent.grant("analytics"),
    ).toThrow(/Unknown consent category/);
  });

  it("accepts every built-in id when no taxonomy is declared", () => {
    const consent = createConsentTest();
    // All five must compile — a union that is too narrow is also a bug.
    consent.grant("necessary");
    consent.grant("functional");
    consent.grant("analytics");
    consent.grant("performance");
    consent.grant("advertisement");
    expect(consent.has("advertisement")).toBe(true);
  });
});

/**
 * The package must work no matter which testing tool a developer's team already
 * uses. The only way to guarantee that is for the shipped source to never import
 * a test runner, so this asserts it directly rather than trusting review.
 */
describe("runner independence", () => {
  it("imports no test runner anywhere in the shipped source", () => {
    const files = sourceFiles();

    expect(files.length).toBeGreaterThan(0);
    for (const [name, source] of files) {
      expect(source, `${name} must not import a test runner`).not.toMatch(
        /from\s+["'](vitest|jest|@jest\/globals|mocha|node:test)["']/,
      );
    }
  });
});

/**
 * `react` and `@cookieyes/react` are declared **optional** peers, so the main
 * entry has to stay importable by someone who has never installed React. That
 * only holds while every module reachable from `index.ts` is React-free — a single
 * stray import would break `npm install` for every non-React consumer, and it
 * would break at *their* build, not in CI here. Hence a static guard.
 */
describe("the main entry stays importable without React", () => {
  it("keeps React imports confined to the react-* modules", () => {
    const reactImport = /from\s+["'](react|react-dom|@cookieyes\/react)["']/;
    const reactOnly = new Set(["react.ts", "react-harness.ts", "react-types.ts"]);

    const offenders = sourceFiles()
      .filter(([name]) => !reactOnly.has(name))
      .filter(([, source]) => reactImport.test(source))
      .map(([name]) => name);

    expect(offenders).toEqual([]);
  });

  it("has every react-only module excluded from the main barrel", () => {
    const barrel = readFileSync(join(srcDir(), "index.ts"), "utf8");
    expect(barrel).not.toMatch(/react/i);
  });
});

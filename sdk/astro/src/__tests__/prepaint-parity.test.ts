import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type CategoryDef, readServerConsent, resolveCategories } from "@cookieyes/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { _decided } from "../prepaint/decided.js";
import { _prepaintScript } from "../prepaint/index.js";

/**
 * The head script hides a static page's banner shell only for a visitor whose cookie records a
 * decision the runtime will honour. That verdict must equal `readServerConsent(...) !== null`,
 * which core's own tests pin to the consent manager, for every cookie string: a fixture table of
 * known edge cases, then a seeded corpus over the same tokens. A disagreement prints the cookie.
 */

const CUSTOM: CategoryDef[] = [
  { id: "essential", required: true, label: "Essential" },
  { id: "taxes", label: "Taxes" },
];
// Rejected by `resolveCategories` (an id with a comma), so both sides fall back to the default.
const INVALID: CategoryDef[] = [{ id: "a,b", label: "Broken" }];
const CATEGORY_SETS: Array<[string, CategoryDef[] | undefined]> = [
  ["default categories", undefined],
  ["custom categories", CUSTOM],
  ["an invalid custom list", INVALID],
];

const DEFAULT_TAX = resolveCategories(undefined).taxonomyHash;
const CUSTOM_TAX = resolveCategories(CUSTOM).taxonomyHash;

const FIXTURES = [
  "",
  "other=1",
  "cookieyes-consent=",
  "cookieyes-consent=action:yes",
  "cookieyes-consent=action:no",
  `cookieyes-consent=action:yes,tax:${DEFAULT_TAX}`,
  `cookieyes-consent=action:yes,tax:${CUSTOM_TAX}`,
  "cookieyes-consent=action:yes,tax:nope",
  `cookieyes-consent=action:no,tax:${DEFAULT_TAX}`,
  "cookieyes-consent=%E0",
  `cookieyes-consent=action:no; cookieyes-consent=action:yes,tax:${DEFAULT_TAX}`,
  `cookieyes-consent=action:yes,action:no,tax:${DEFAULT_TAX}`,
  `cookieyes-consent=action:no,action:yes,tax:${DEFAULT_TAX}`,
  `  cookieyes-consent =  action : yes , tax : ${DEFAULT_TAX}  `,
  `cookieyes-consent=ACTION:yes,tax:${DEFAULT_TAX}`,
  `cookieyes-consent=action:YES,tax:${DEFAULT_TAX}`,
  `Cookieyes-consent=action:yes,tax:${DEFAULT_TAX}`,
  `cookieyes-consent=taxes:yes,action:yes,tax:${CUSTOM_TAX}`,
  `cookieyes-consent=${encodeURIComponent(`action:yes,tax:${DEFAULT_TAX},necessary:yes`)}`,
  `a=b; cookieyes-consent=${encodeURIComponent(`consent:yes,action:yes,tax:${CUSTOM_TAX}`)}; c=d`,
];

/** A small seeded generator, so a failure reproduces. */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = [
  "cookieyes-consent",
  " cookieyes-consent",
  "cookieyes-consent ",
  "other",
  "cookieyes",
];
const PAIRS = [
  "action:yes",
  "action:no",
  "action: yes",
  "action:",
  `tax:${DEFAULT_TAX}`,
  `tax:${CUSTOM_TAX}`,
  "tax:",
  "tax:x",
  "consent:yes",
  "necessary:yes",
  "taxes:yes",
  "essential:no",
  "%E0",
  "%2C",
  ":",
  "",
  " tax ",
];

function corpus(size: number): string[] {
  const next = random(20261126);
  const pick = <T>(list: T[]) => list[Math.floor(next() * list.length)] as T;
  const out: string[] = [];
  for (let i = 0; i < size; i++) {
    const cookies: string[] = [];
    const count = 1 + Math.floor(next() * 3);
    for (let c = 0; c < count; c++) {
      const pairs = Array.from({ length: Math.floor(next() * 5) }, () => pick(PAIRS)).join(",");
      const value = next() < 0.3 ? encodeURIComponent(pairs) : pairs;
      cookies.push(next() < 0.05 ? pick(NAMES) : `${pick(NAMES)}=${value}`);
    }
    out.push(cookies.join(next() < 0.5 ? "; " : ";"));
  }
  return out;
}

const CASES = [...FIXTURES, ...corpus(5000)];

function expected(cookie: string, categories: CategoryDef[] | undefined): boolean {
  return readServerConsent(cookie, { categories }) !== null;
}

const warn = vi.spyOn(console, "warn");
beforeAll(() => {
  warn.mockImplementation(() => undefined);
});
afterAll(() => {
  warn.mockRestore();
});

describe("_decided agrees with readServerConsent", () => {
  for (const [name, categories] of CATEGORY_SETS) {
    it(`under ${name}`, () => {
      const { taxonomyHash, isDefault } = resolveCategories(categories);
      for (const cookie of CASES) {
        const verdict = _decided(cookie, taxonomyHash, isDefault);
        if (verdict !== expected(cookie, categories)) {
          throw new Error(`disagreement for cookie ${JSON.stringify(cookie)}`);
        }
      }
    });
  }
});

/** Runs a head script against `cookie` and returns whether it revealed the banner shell. */
function run(script: string, cookie: string): boolean {
  let shown = false;
  const document = {
    cookie,
    documentElement: {
      setAttribute: (name: string, value: string) => {
        if (name === "data-cy-banner" && value === "show") shown = true;
      },
    },
  };
  new Function("document", script)(document);
  return shown;
}

const dist = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dist",
  "prepaint",
  "index.js",
);

describe("the built head script (dist)", () => {
  it.skipIf(!existsSync(dist))(
    "reveals the shell exactly when readServerConsent is null",
    async () => {
      const built = (await import(dist)) as { _prepaintScript: typeof _prepaintScript };
      for (const [name, categories] of CATEGORY_SETS) {
        const script = built._prepaintScript(categories);
        expect(script).not.toContain("__CY_");
        for (const cookie of CASES) {
          if (run(script, cookie) !== !expected(cookie, categories)) {
            throw new Error(`disagreement under ${name} for cookie ${JSON.stringify(cookie)}`);
          }
        }
      }
    },
  );
});

describe("_prepaintScript (source)", () => {
  it("is the build sentinel before the package is built", () => {
    expect(_prepaintScript(undefined)).toBe("__CY_PREPAINT__");
  });
});

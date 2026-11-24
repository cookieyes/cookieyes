import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

// The framework set, the Vue guard (which also covers Nuxt pages), the Svelte guard and the SvelteKit guard are restated in plain
// scripts that cannot import the TypeScript modules. This keeps every restatement identical, so adding a framework in one
// place and forgetting another fails here, not in front of a reader.

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (file) => readFileSync(join(webRoot, file), "utf8");

/** `["nextjs", "react", ...]` after `FRAMEWORKS =`, in order. */
function listAfterFrameworks(source) {
  const match = /FRAMEWORKS = (\[[^\]]*\])/.exec(source);
  assert.ok(match, "no FRAMEWORKS list found");
  // The formatter breaks a long list over several lines, with a trailing comma JSON rejects.
  return JSON.parse(match[1].replace(/,\s*\]$/, "]"));
}

describe("framework set", () => {
  it("is the same list in the TypeScript modules and the scripts", () => {
    const expected = listAfterFrameworks(read("src/lib/framework-docs.ts"));
    assert.ok(expected.includes("vue"));
    assert.ok(expected.includes("nuxt"));
    assert.ok(expected.includes("svelte"));
    assert.ok(expected.includes("sveltekit"));
    for (const file of ["src/lib/remark-framework-docs.ts", "scripts/check-examples.mjs"]) {
      assert.deepEqual(listAfterFrameworks(read(file)), expected, file);
    }
  });

  it("is the key set of the generator's FRAMEWORKS record", () => {
    const expected = listAfterFrameworks(read("src/lib/framework-docs.ts"));
    const block = /const FRAMEWORKS = \{([^}]*)\}/.exec(
      read("scripts/generate-framework-docs.mjs"),
    );
    assert.ok(block);
    const keys = [...block[1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);
    assert.deepEqual(keys, expected);
  });
});

describe("Vue guard", () => {
  it("is the same pattern in the plugin, the composer and the checker", () => {
    const pattern = (file) => {
      const match = /const VUE_FORBIDDEN = (\/.*\/);/.exec(read(file));
      assert.ok(match, file);
      return match[1];
    };
    const expected = pattern("src/lib/framework-docs.ts");
    assert.equal(pattern("src/lib/remark-framework-docs.ts"), expected);
    assert.equal(pattern("scripts/check-examples.mjs"), expected);
  });
});

describe("Svelte guard", () => {
  it("is the same pattern in the plugin, the composer and the checker", () => {
    const pattern = (file) => {
      const match = /const SVELTE_FORBIDDEN =\s*(\/.*\/);/.exec(read(file));
      assert.ok(match, file);
      return match[1];
    };
    const expected = pattern("src/lib/framework-docs.ts");
    assert.equal(pattern("src/lib/remark-framework-docs.ts"), expected);
    assert.equal(pattern("scripts/check-examples.mjs"), expected);
  });
});

describe("SvelteKit guard", () => {
  it("is the same pattern in the plugin, the composer and the checker", () => {
    const pattern = (file) => {
      const match = /const SVELTEKIT_FORBIDDEN =\s*(\/.*\/);/.exec(read(file));
      assert.ok(match, file);
      return match[1];
    };
    const expected = pattern("src/lib/framework-docs.ts");
    assert.equal(pattern("src/lib/remark-framework-docs.ts"), expected);
    assert.equal(pattern("scripts/check-examples.mjs"), expected);
  });
});

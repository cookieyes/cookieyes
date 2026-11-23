// matrix/scripts/__tests__/derive-check.test.mjs
//
// Unit tests for the pure `checkPeerDependencyMatrix` logic in
// matrix/scripts/derive-check.mjs, against fixture peerDependencies +
// combinations rather than the repo's real package.json/matrix.config.mjs —
// so this test doesn't need to mutate real files to exercise a violation.
// See ai-context/designs/peer-dependency-matrix.md §5.3, §10 (#2, #3).

import { describe, expect, it } from "vitest";
import { checkPeerDependencyMatrix } from "../derive-check.mjs";

/** A minimal, internally-consistent fixture: one package, one combination. */
function baseFixture() {
  return {
    peerPackages: [
      {
        name: "@cookieyes/react",
        peerDependencies: { react: ">=18.0.0", "react-dom": ">=18.0.0" },
      },
    ],
    combinations: [
      {
        id: "fixture-react-18.0.0",
        role: "floor",
        packagesUnderTest: ["@cookieyes/react"],
        versions: {
          react: "18.0.0",
          reactDom: "18.0.0",
          typesReact: "^18.3.0",
          typesReactDom: "^18.3.0",
        },
      },
    ],
  };
}

describe("checkPeerDependencyMatrix", () => {
  it("returns no violations for a consistent fixture", () => {
    expect(checkPeerDependencyMatrix(baseFixture())).toEqual([]);
  });

  it("fails when a peer range is widened without a matching combination (AC2 headline case)", () => {
    const fixture = baseFixture();
    fixture.peerPackages[0].peerDependencies.react = ">=17.0.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('"react"') && e.includes("17.0.0"))).toBe(true);
  });

  it("fails when the floor combination pins something that only *satisfies* the range, not the exact floor", () => {
    const fixture = baseFixture();
    fixture.combinations[0].versions.react = "18.2.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes("18.0.0"))).toBe(true);
  });

  it("fails the inverse check when a combination pins a version outside the declared range", () => {
    const fixture = baseFixture();
    // Narrow the declared range so the fixture's own floor combination
    // (18.0.0) no longer satisfies it.
    fixture.peerPackages[0].peerDependencies.react = ">=19.0.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes("does not satisfy") && e.includes(">=19.0.0"))).toBe(true);
  });

  it("fails when a combination's typesReact major does not match its react major", () => {
    const fixture = baseFixture();
    fixture.combinations[0].versions.typesReact = "^19.0.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(
      errors.some(
        (e) => e.includes("typesReact") && e.includes("major 19") && e.includes("major 18"),
      ),
    ).toBe(true);
  });

  it("fails when a combination's typesReactDom major does not match its reactDom major", () => {
    const fixture = baseFixture();
    fixture.combinations[0].versions.typesReactDom = "^19.0.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes("typesReactDom"))).toBe(true);
  });

  it("names the unmapped peer when peerDependencies has no PEER_FIELD_MAP entry", () => {
    const fixture = baseFixture();
    fixture.peerPackages[0].peerDependencies["some-new-peer"] = ">=1.0.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes("some-new-peer"))).toBe(true);
  });

  it("only checks combinations that list the package under packagesUnderTest", () => {
    const fixture = baseFixture();
    // A second package with a floor no combination covers at all — should
    // fail, proving the check isn't silently satisfied by the first package's
    // combination.
    fixture.peerPackages.push({
      name: "@cookieyes/nextjs",
      peerDependencies: { next: ">=14.0.0" },
    });
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes("@cookieyes/nextjs") && e.includes("14.0.0"))).toBe(true);
  });
});

/** A Vue-only fixture: one package, one combination, no React fields at all. */
function vueFixture() {
  return {
    peerPackages: [
      {
        name: "@cookieyes/vue",
        peerDependencies: { vue: ">=3.5.0" },
      },
    ],
    combinations: [
      {
        id: "fixture-vue-3.5.0",
        role: "floor",
        app: "vue",
        packagesUnderTest: ["@cookieyes/vue"],
        versions: { vue: "3.5.0" },
      },
    ],
  };
}

describe("checkPeerDependencyMatrix with a Vue combination", () => {
  it("returns no violations for a consistent Vue fixture", () => {
    expect(checkPeerDependencyMatrix(vueFixture())).toEqual([]);
  });

  it("does not throw on a combination that has no React fields", () => {
    expect(() => checkPeerDependencyMatrix(vueFixture())).not.toThrow();
  });

  it("fails when the vue range is widened without a matching floor combination", () => {
    const fixture = vueFixture();
    fixture.peerPackages[0].peerDependencies.vue = ">=3.4.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes('"vue"') && e.includes("3.4.0"))).toBe(true);
  });

  it("does not require the optional devtools peer to have a matrix field", () => {
    const fixture = vueFixture();
    fixture.peerPackages[0].peerDependencies["@cookieyes/devtools"] = ">=0.1.0";
    expect(checkPeerDependencyMatrix(fixture)).toEqual([]);
  });

  it("leaves the React fixture's verdict unchanged when Vue legs sit beside it", () => {
    const fixture = baseFixture();
    const vue = vueFixture();
    fixture.peerPackages.push(...vue.peerPackages);
    fixture.combinations.push(...vue.combinations);
    expect(checkPeerDependencyMatrix(fixture)).toEqual([]);
  });
});

/** A Nuxt fixture: Nuxt pinned, Vue left to Nuxt, as in matrix.config.mjs. */
function nuxtFixture() {
  return {
    peerPackages: [
      {
        name: "@cookieyes/nuxt",
        peerDependencies: { nuxt: "^4.0.0", vue: ">=3.5.0" },
      },
    ],
    combinations: [
      {
        id: "fixture-nuxt-4.0.0",
        role: "floor",
        app: "nuxt",
        packagesUnderTest: ["@cookieyes/nuxt"],
        versions: { nuxt: "4.0.0" },
      },
    ],
  };
}

describe("checkPeerDependencyMatrix with a Nuxt combination", () => {
  it("returns no violations for a consistent Nuxt fixture", () => {
    expect(checkPeerDependencyMatrix(nuxtFixture())).toEqual([]);
  });

  it("fails when the nuxt range is widened without a matching floor combination", () => {
    const fixture = nuxtFixture();
    fixture.peerPackages[0].peerDependencies.nuxt = "^3.0.0 || ^4.0.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes('"nuxt"') && e.includes("3.0.0"))).toBe(true);
  });

  it("fails the inverse check when a Nuxt combination pins a Vue outside the vue range", () => {
    const fixture = nuxtFixture();
    fixture.combinations[0].versions.vue = "3.4.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes("does not satisfy") && e.includes(">=3.5.0"))).toBe(true);
  });

  it("still requires the vue floor of @cookieyes/vue when only Nuxt legs exist", () => {
    const fixture = nuxtFixture();
    fixture.peerPackages.push({ name: "@cookieyes/vue", peerDependencies: { vue: ">=3.5.0" } });
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes("@cookieyes/vue") && e.includes("3.5.0"))).toBe(true);
  });

  it("leaves the Vue fixture's verdict unchanged when Nuxt legs sit beside it", () => {
    const fixture = vueFixture();
    const nuxt = nuxtFixture();
    fixture.peerPackages.push(...nuxt.peerPackages);
    fixture.combinations.push(...nuxt.combinations);
    expect(checkPeerDependencyMatrix(fixture)).toEqual([]);
  });
});

/** A Svelte fixture: Svelte pinned, with the Vite toolchain pins that are not peers. */
function svelteFixture() {
  return {
    peerPackages: [
      {
        name: "@cookieyes/svelte",
        peerDependencies: { svelte: ">=5.20.0" },
      },
    ],
    combinations: [
      {
        id: "fixture-svelte-5.20.0",
        role: "floor",
        app: "svelte",
        packagesUnderTest: ["@cookieyes/svelte"],
        versions: { svelte: "5.20.0", vite: "7.3.8", vitePluginSvelte: "6.2.4" },
      },
    ],
  };
}

describe("checkPeerDependencyMatrix with a Svelte combination", () => {
  it("returns no violations for a consistent Svelte fixture", () => {
    expect(checkPeerDependencyMatrix(svelteFixture())).toEqual([]);
  });

  it("fails when the svelte range is widened without a matching floor combination", () => {
    const fixture = svelteFixture();
    fixture.peerPackages[0].peerDependencies.svelte = ">=5.0.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes('"svelte"') && e.includes("5.0.0"))).toBe(true);
  });

  it("fails the inverse check when a Svelte combination pins a version outside the range", () => {
    const fixture = svelteFixture();
    fixture.combinations[0].versions.svelte = "5.19.0";
    expect(checkPeerDependencyMatrix(fixture).length).toBeGreaterThan(0);
  });

  it("leaves the Vue fixture's verdict unchanged when Svelte legs sit beside it", () => {
    const fixture = vueFixture();
    const svelte = svelteFixture();
    fixture.peerPackages.push(...svelte.peerPackages);
    fixture.combinations.push(...svelte.combinations);
    expect(checkPeerDependencyMatrix(fixture)).toEqual([]);
  });
});

/** A SvelteKit fixture: Kit and Svelte pinned together in the floor combination. */
function svelteKitFixture() {
  return {
    peerPackages: [
      {
        name: "@cookieyes/sveltekit",
        peerDependencies: { "@sveltejs/kit": "^2.62.0 || ^3.0.0", svelte: ">=5.20.0" },
      },
    ],
    combinations: [
      {
        id: "fixture-sveltekit-2.62.0-svelte-5.20.0",
        role: "floor",
        app: "sveltekit",
        packagesUnderTest: ["@cookieyes/sveltekit"],
        versions: { kit: "2.62.0", svelte: "5.20.0", vite: "7.3.8", vitePluginSvelte: "6.2.4" },
      },
      {
        id: "fixture-sveltekit-3.2.0-svelte-5.57.3",
        role: "newest",
        app: "sveltekit",
        packagesUnderTest: ["@cookieyes/sveltekit"],
        versions: { kit: "3.2.0", svelte: "5.57.3", vite: "8.3.7", vitePluginSvelte: "7.3.1" },
      },
    ],
  };
}

describe("checkPeerDependencyMatrix with a SvelteKit combination", () => {
  it("returns no violations for a consistent SvelteKit fixture", () => {
    expect(checkPeerDependencyMatrix(svelteKitFixture())).toEqual([]);
  });

  it("fails when the kit floor is raised without a matching floor combination", () => {
    const fixture = svelteKitFixture();
    fixture.peerPackages[0].peerDependencies["@sveltejs/kit"] = "^2.50.0 || ^3.0.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes("versions.kit") && e.includes("2.50.0"))).toBe(true);
  });

  it("fails the inverse check when a combination pins a Kit outside the kit range", () => {
    const fixture = svelteKitFixture();
    fixture.combinations[1].versions.kit = "4.0.0";
    const errors = checkPeerDependencyMatrix(fixture);
    expect(errors.some((e) => e.includes("does not satisfy") && e.includes("^2.62.0"))).toBe(true);
  });

  it("fails the inverse check when a combination pins a Svelte below the svelte floor", () => {
    const fixture = svelteKitFixture();
    fixture.combinations[1].versions.svelte = "5.19.0";
    expect(checkPeerDependencyMatrix(fixture).length).toBeGreaterThan(0);
  });

  it("leaves the Svelte fixture's verdict unchanged when SvelteKit legs sit beside it", () => {
    const fixture = svelteFixture();
    const kit = svelteKitFixture();
    fixture.peerPackages.push(...kit.peerPackages);
    fixture.combinations.push(...kit.combinations);
    expect(checkPeerDependencyMatrix(fixture)).toEqual([]);
  });
});

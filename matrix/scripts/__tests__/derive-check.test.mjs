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

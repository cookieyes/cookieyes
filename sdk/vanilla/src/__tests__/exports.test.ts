import { describe, expect, it } from "vitest";
import * as vanilla from "../index.js";

/**
 * Pins the public surface. Adding or removing a name is an API change: update
 * this list, the docs and the changeset together.
 */
describe("@cookieyes/vanilla public exports", () => {
  it("exports exactly the documented commands", () => {
    expect(Object.keys(vanilla).sort()).toEqual([
      "destroy",
      "openOptOut",
      "openPreferences",
      "renderShell",
      "start",
    ]);
  });
});

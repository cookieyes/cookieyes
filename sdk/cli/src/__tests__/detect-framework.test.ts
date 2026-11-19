import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectFramework } from "../utils/detect-framework.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cy-fw-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writePkg(pkg: Record<string, unknown>): void {
  writeFileSync(join(dir, "package.json"), JSON.stringify(pkg), "utf-8");
}

describe("detectFramework", () => {
  it("returns null when there is no package.json", () => {
    expect(detectFramework(dir)).toBeNull();
  });

  it("detects Next.js from a next dependency", () => {
    writePkg({ dependencies: { next: "15.0.0", react: "19.0.0" } });
    expect(detectFramework(dir)).toBe("nextjs");
  });

  it("detects React when react is present without next", () => {
    writePkg({ dependencies: { react: "19.0.0" } });
    expect(detectFramework(dir)).toBe("react");
  });

  it("detects from devDependencies too", () => {
    writePkg({ devDependencies: { next: "15.0.0" } });
    expect(detectFramework(dir)).toBe("nextjs");
  });

  it("falls back to vanilla for a non-framework project", () => {
    writePkg({ dependencies: { lodash: "4.0.0" } });
    expect(detectFramework(dir)).toBe("vanilla");
  });

  it("returns null when package.json is malformed", () => {
    writeFileSync(join(dir, "package.json"), "{ not json", "utf-8");
    expect(detectFramework(dir)).toBeNull();
  });

  it("detects Vue from a vue dependency", () => {
    writePkg({ dependencies: { vue: "3.5.0" } });
    expect(detectFramework(dir)).toBe("vue");
  });

  it("keeps React when both react and vue are present", () => {
    writePkg({ dependencies: { react: "19.0.0", vue: "3.5.0" } });
    expect(detectFramework(dir)).toBe("react");
  });

  it("detects Nuxt before Vue, which every Nuxt app depends on", () => {
    writePkg({ dependencies: { nuxt: "4.0.0", vue: "3.5.0" } });
    expect(detectFramework(dir)).toBe("nuxt");
  });

  it("detects Nuxt from a devDependency", () => {
    writePkg({ devDependencies: { nuxt: "4.0.0" }, dependencies: { vue: "3.5.0" } });
    expect(detectFramework(dir)).toBe("nuxt");
  });

  it("takes a project with nuxt and react for Nuxt", () => {
    writePkg({ dependencies: { nuxt: "4.0.0", react: "19.0.0" } });
    expect(detectFramework(dir)).toBe("nuxt");
  });
});

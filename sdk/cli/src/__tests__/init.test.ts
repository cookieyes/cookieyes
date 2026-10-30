import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mock handles so the vi.mock factories can reference them.
const h = vi.hoisted(() => ({
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn() },
  spinnerStart: vi.fn(),
  spinnerStop: vi.fn(),
  existsSync: vi.fn((_path?: unknown): boolean => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn((_path?: unknown): string => ""),
  detectFramework: vi.fn(() => null),
  detectPackageManager: vi.fn(() => "npm"),
  installPackage: vi.fn(),
  nextProjectPaths: vi.fn(),
  reactProjectPaths: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  log: h.log,
  spinner: () => ({ start: h.spinnerStart, stop: h.spinnerStop }),
  isCancel: h.isCancel,
  select: h.select,
  text: h.text,
  multiselect: h.multiselect,
  confirm: h.confirm,
}));
vi.mock("node:fs", () => ({
  existsSync: h.existsSync,
  mkdirSync: h.mkdirSync,
  writeFileSync: h.writeFileSync,
  readFileSync: h.readFileSync,
}));
vi.mock("../utils/detect-framework.js", () => ({ detectFramework: h.detectFramework }));
vi.mock("../utils/detect-pm.js", () => ({ detectPackageManager: h.detectPackageManager }));
vi.mock("../utils/install.js", () => ({ installPackage: h.installPackage }));
vi.mock("../utils/detect-layout.js", () => ({
  nextProjectPaths: h.nextProjectPaths,
  reactProjectPaths: h.reactProjectPaths,
}));

import { cancel, note } from "@clack/prompts";
import { parseInitFlags, runInit } from "../commands/init.js";

const NEXT_PATHS = {
  providerPath: "/proj/src/components/consent-manager/provider.tsx",
  indexPath: "/proj/src/components/consent-manager/index.ts",
  appLayoutPath: "/proj/src/app/layout.tsx",
  pagesAppPath: "/proj/src/pages/_app.tsx",
  layout: "src" as const,
  router: "app" as const,
};
const REACT_PATHS = {
  providerPath: "/proj/src/components/consent-manager/provider.tsx",
  indexPath: "/proj/src/components/consent-manager/index.ts",
  layout: "src" as const,
  entryCandidates: [{ path: "/proj/src/main.tsx", label: "src/main.tsx" }],
};

/** All strings written to disk during a runInit() call. */
function writtenContents(): string[] {
  return h.writeFileSync.mock.calls.map((c) => String(c[1]));
}

beforeEach(() => {
  vi.clearAllMocks();
  h.isCancel.mockReturnValue(false);
  h.existsSync.mockReturnValue(false);
  h.readFileSync.mockReturnValue("");
  h.detectFramework.mockReturnValue(null);
  h.detectPackageManager.mockReturnValue("npm");
  h.installPackage.mockResolvedValue(undefined);
  h.nextProjectPaths.mockReturnValue(NEXT_PATHS);
  h.reactProjectPaths.mockReturnValue(REACT_PATHS);
  process.stdin.isTTY = true;
});

describe("runInit — Next.js (cookie-only, GDPR)", () => {
  it("scaffolds the consent-manager and installs the nextjs adapter", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);

    await runInit();

    const writes = writtenContents();
    expect(writes.some((w) => w.includes("initCookieYes"))).toBe(true);
    expect(writes.some((w) => w.includes("<CookieBanner />"))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/nextjs"'))).toBe(true);
    // Self-referential: the scaffold installs only @cookieyes/nextjs, and under
    // pnpm that app cannot resolve @cookieyes/react — so a scaffold pointing
    // there would not build for a pnpm user.
    expect(writes.some((w) => w.includes('import "@cookieyes/nextjs/styles.css"'))).toBe(true);
    expect(writes.some((w) => w.includes('import "@cookieyes/react/styles.css"'))).toBe(false);
    // App-router layout is generated when one does not already exist.
    expect(writes.some((w) => w.includes("RootLayout"))).toBe(true);
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/nextjs", "npm", expect.any(String));
    // Every completed run ends with a star-repo nudge before the final outro.
    expect(note).toHaveBeenCalledWith(
      expect.stringContaining("github.com/cookieyes/cookieyes"),
      expect.any(String),
    );
  });
});

describe("runInit — React (self-hosted, CCPA, locales, skip install)", () => {
  it("emits apiUrl, opt-out component, locale imports and skips install", async () => {
    h.select
      .mockResolvedValueOnce("react")
      .mockResolvedValueOnce("self-hosted")
      .mockResolvedValueOnce("CCPA")
      .mockResolvedValueOnce("dark");
    h.text.mockResolvedValueOnce("https://api.example.com/consent");
    h.multiselect.mockResolvedValueOnce(["es", "fr"]);
    h.confirm.mockResolvedValueOnce(false);

    await runInit();

    const writes = writtenContents();
    expect(writes.some((w) => w.includes('apiUrl: "https://api.example.com/consent",'))).toBe(true);
    // A hand-written adapter is what lost failed records; the SDK's sender retries them.
    expect(writes.some((w) => w.includes("persist("))).toBe(false);
    expect(writes.some((w) => w.includes("initCookieYes({"))).toBe(true);
    expect(writes.some((w) => w.includes("<CookieOptOut />"))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/translations/es"'))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/react"'))).toBe(true);
    expect(writes.some((w) => w.includes('import "@cookieyes/react/styles.css"'))).toBe(true);
    // Install was declined.
    expect(h.installPackage).not.toHaveBeenCalled();
    // The star-repo nudge is emitted even when install is skipped (unconditional).
    expect(note).toHaveBeenCalledWith(
      expect.stringContaining("github.com/cookieyes/cookieyes"),
      expect.any(String),
    );
  });
});

describe("runInit — Vanilla (self-hosted, locales, install)", () => {
  it("writes the core runtime template and installs core + translations", async () => {
    h.select
      .mockResolvedValueOnce("vanilla")
      .mockResolvedValueOnce("self-hosted")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.text.mockResolvedValueOnce("/api/consent");
    h.multiselect.mockResolvedValueOnce(["de"]);
    h.confirm.mockResolvedValueOnce(true);

    await runInit();

    const writes = writtenContents();
    expect(writes.some((w) => w.includes("getOrCreateConsentRuntime"))).toBe(true);
    // Regulation is a top-level key now — the deprecated `overrides` wrapper is gone.
    expect(writes.some((w) => w.includes('regulation: "GDPR"'))).toBe(true);
    expect(writes.every((w) => !w.includes("overrides"))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/translations/de"'))).toBe(true);
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/core", "npm", expect.any(String));
    expect(h.installPackage).toHaveBeenCalledWith(
      "@cookieyes/translations",
      "npm",
      expect.any(String),
    );
  });
});

describe("runInit — patching existing files", () => {
  it("patches an existing Next.js app-router layout", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    // Everything already exists; the layout has a {children} slot to patch.
    h.existsSync.mockReturnValue(true);
    h.readFileSync.mockReturnValue("<html><body>{children}</body></html>");

    await runInit();

    const writes = writtenContents();
    expect(writes.some((w) => w.includes("CookieYesRoot"))).toBe(true);
    expect(h.log.info).toHaveBeenCalled(); // "already exists — skipped" for provider/index
  });

  it("patches an existing Pages-router _app", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.nextProjectPaths.mockReturnValue({ ...NEXT_PATHS, router: "pages" });
    h.existsSync.mockImplementation((p: unknown) => String(p).endsWith("_app.tsx"));
    h.readFileSync.mockReturnValue(
      "export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }",
    );

    await runInit();

    expect(writtenContents().some((w) => w.includes("CookieYesRoot"))).toBe(true);
  });

  it("patches an existing React entry and warns when install fails", async () => {
    h.select
      .mockResolvedValueOnce("react")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.existsSync.mockImplementation((p: unknown) => String(p).endsWith("main.tsx"));
    h.readFileSync.mockReturnValue("import App from './App';\nroot.render(<App />);");
    h.installPackage.mockRejectedValueOnce(new Error("network down"));

    await runInit();

    expect(writtenContents().some((w) => w.includes("CookieYesRoot"))).toBe(true);
    expect(h.log.warn).toHaveBeenCalled();
  });

  it("prints a manual step when a Pages-router _app does not exist", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.nextProjectPaths.mockReturnValue({ ...NEXT_PATHS, router: "pages" });
    h.existsSync.mockReturnValue(false); // nothing exists → _app gets a manual-step note

    await runInit();

    // provider + index are still scaffolded
    expect(writtenContents().some((w) => w.includes("initCookieYes"))).toBe(true);
  });

  it("skips patching when the layout already uses CookieYesRoot", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.existsSync.mockReturnValue(true);
    h.readFileSync.mockReturnValue(
      'import { CookieYesRoot } from "@/components/consent-manager";\n<body>{children}<CookieYesRoot /></body>',
    );

    await runInit();

    expect(h.log.info).toHaveBeenCalled(); // "already uses CookieYesRoot — skipped"
  });

  it("warns when the translations install fails", async () => {
    h.select
      .mockResolvedValueOnce("vanilla")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce(["de"]);
    h.confirm.mockResolvedValueOnce(true);
    // Core install succeeds, translations install rejects.
    h.installPackage.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("boom"));

    await runInit();

    expect(h.log.warn).toHaveBeenCalled();
  });

  it("skips the React provider/index when they already exist", async () => {
    h.select
      .mockResolvedValueOnce("react")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.existsSync.mockReturnValue(true); // provider + index + entry already present
    h.readFileSync.mockReturnValue("import App from './App';\nroot.render(<App />);");

    await runInit();

    expect(h.log.info).toHaveBeenCalled(); // skipped messages
  });

  it("skips the vanilla consent file when it already exists", async () => {
    h.select
      .mockResolvedValueOnce("vanilla")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(false);
    h.existsSync.mockReturnValue(true); // src/ and consent.ts already exist

    await runInit();

    expect(h.log.info).toHaveBeenCalled();
  });
});

describe("parseInitFlags", () => {
  it("reads every flag, with a space or an = before the value", () => {
    expect(
      parseInitFlags([
        "--framework=react",
        "--mode",
        "self-hosted",
        "--api-url",
        "/api/consent",
        "--regulation=ccpa",
        "--color-scheme",
        "dark",
        "--locales",
        "es, fr",
        "--no-install",
        "-y",
      ]),
    ).toEqual({
      framework: "react",
      mode: "self-hosted",
      apiUrl: "/api/consent",
      regulation: "CCPA",
      colorScheme: "dark",
      locales: ["es", "fr"],
      install: false,
      yes: true,
    });
  });

  it("treats an API URL as a self-hosted setup", () => {
    expect(parseInitFlags(["--api-url=https://api.example.com/consent"]).mode).toBe("self-hosted");
  });

  it("reads an empty --locales as no extra languages", () => {
    expect(parseInitFlags(["--locales="]).locales).toEqual([]);
  });

  it("refuses a typo instead of ignoring it", () => {
    expect(() => parseInitFlags(["--framwork", "react"])).toThrow(/Unknown option/);
    expect(() => parseInitFlags(["--framework", "svelte"])).toThrow(/must be one of/);
    expect(() => parseInitFlags(["--locales", "es,xx"])).toThrow(/must be one of/);
    expect(() => parseInitFlags(["--api-url", "not a url"])).toThrow(/--api-url/);
    expect(() => parseInitFlags(["--mode"])).toThrow(/needs a value/);
    expect(() => parseInitFlags(["--mode", "--yes"])).toThrow(/needs a value/);
  });

  it("refuses an API URL with a cookie-only setup", () => {
    expect(() => parseInitFlags(["--mode=cookie-only", "--api-url=/api/consent"])).toThrow(
      /needs --mode self-hosted/,
    );
  });
});

describe("runInit — flags", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const exit = () =>
    vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new Error(`exit ${code}`);
    }) as never);

  it("asks nothing when every answer is a flag", async () => {
    await runInit([
      "--framework=react",
      "--api-url=https://api.example.com/consent",
      "--regulation=CCPA",
      "--color-scheme=dark",
      "--locales=es",
      "--no-install",
    ]);
    for (const prompt of [h.select, h.text, h.multiselect, h.confirm]) {
      expect(prompt).not.toHaveBeenCalled();
    }
    const writes = writtenContents();
    expect(writes.some((w) => w.includes('apiUrl: "https://api.example.com/consent",'))).toBe(true);
    expect(writes.some((w) => w.includes('regulation: "CCPA"'))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/translations/es"'))).toBe(true);
    expect(h.installPackage).not.toHaveBeenCalled();
  });

  it("takes the defaults with --yes", async () => {
    h.detectFramework.mockReturnValue("nextjs" as never);
    await runInit(["--yes"]);
    for (const prompt of [h.select, h.text, h.multiselect, h.confirm]) {
      expect(prompt).not.toHaveBeenCalled();
    }
    const writes = writtenContents();
    expect(writes.some((w) => w.includes('mode: "cookie-only"'))).toBe(true);
    expect(writes.some((w) => w.includes('regulation: "GDPR"'))).toBe(true);
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/nextjs", "npm", expect.any(String));
  });

  it("asks only the questions no flag answered", async () => {
    h.multiselect.mockResolvedValueOnce([]);
    await runInit([
      "--framework=vanilla",
      "--mode=cookie-only",
      "--regulation=GDPR",
      "--color-scheme=light",
      "--install",
    ]);
    expect(h.select).not.toHaveBeenCalled();
    expect(h.multiselect).toHaveBeenCalledTimes(1);
    expect(h.confirm).not.toHaveBeenCalled();
  });

  it("fails instead of waiting when there is no terminal to ask in", async () => {
    process.stdin.isTTY = false as never;
    exit();
    await expect(runInit(["--framework=react"])).rejects.toThrow("exit 1");
    expect(h.select).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledWith(expect.stringContaining("--mode"));
    expect(h.writeFileSync).not.toHaveBeenCalled();
  });

  it("does not guess a backend URL for --yes with a self-hosted setup", async () => {
    exit();
    await expect(runInit(["--yes", "--mode=self-hosted"])).rejects.toThrow("exit 1");
    expect(cancel).toHaveBeenCalledWith("--mode self-hosted needs --api-url.");
    expect(h.writeFileSync).not.toHaveBeenCalled();
  });

  it("stops on a bad flag before asking anything", async () => {
    exit();
    await expect(runInit(["--regulation=LGPD"])).rejects.toThrow("exit 1");
    expect(h.select).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { runInit } from "../commands/init.js";

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
});

describe("runInit — Next.js (offline, GDPR)", () => {
  it("scaffolds the consent-manager and installs the nextjs adapter", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("offline")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);

    await runInit();

    const writes = writtenContents();
    expect(writes.some((w) => w.includes("createCookieYes"))).toBe(true);
    expect(writes.some((w) => w.includes("<CookieBanner />"))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/nextjs"'))).toBe(true);
    // App-router layout is generated when one does not already exist.
    expect(writes.some((w) => w.includes("RootLayout"))).toBe(true);
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/nextjs", "npm", expect.any(String));
  });
});

describe("runInit — React (self-hosted, CCPA, locales, skip install)", () => {
  it("emits the backend chain, opt-out component, locale imports and skips install", async () => {
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
    expect(writes.some((w) => w.includes(".backend({"))).toBe(true);
    expect(writes.some((w) => w.includes("<CookieOptOut />"))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/translations/es"'))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/react"'))).toBe(true);
    // Install was declined.
    expect(h.installPackage).not.toHaveBeenCalled();
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
      .mockResolvedValueOnce("offline")
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
      .mockResolvedValueOnce("offline")
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
      .mockResolvedValueOnce("offline")
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
      .mockResolvedValueOnce("offline")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.nextProjectPaths.mockReturnValue({ ...NEXT_PATHS, router: "pages" });
    h.existsSync.mockReturnValue(false); // nothing exists → _app gets a manual-step note

    await runInit();

    // provider + index are still scaffolded
    expect(writtenContents().some((w) => w.includes("createCookieYes"))).toBe(true);
  });

  it("skips patching when the layout already uses CookieYesRoot", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("offline")
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
      .mockResolvedValueOnce("offline")
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
      .mockResolvedValueOnce("offline")
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
      .mockResolvedValueOnce("offline")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(false);
    h.existsSync.mockReturnValue(true); // src/ and consent.ts already exist

    await runInit();

    expect(h.log.info).toHaveBeenCalled();
  });
});

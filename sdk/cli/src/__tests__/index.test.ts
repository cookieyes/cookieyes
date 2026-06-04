import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runInit } = vi.hoisted(() => ({ runInit: vi.fn() }));
vi.mock("../commands/init.js", () => ({ runInit }));

const ORIGINAL_ARGV = process.argv;
let logSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;
let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetModules();
  runInit.mockReset().mockResolvedValue(undefined);
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
});

afterEach(() => {
  process.argv = ORIGINAL_ARGV;
  vi.restoreAllMocks();
});

async function runCli(arg?: string): Promise<void> {
  process.argv = ["node", "cli", ...(arg ? [arg] : [])];
  await import("../index.js");
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("cli entry", () => {
  it("prints the version with --version", async () => {
    await runCli("--version");
    expect(logSpy).toHaveBeenCalledWith("1.0.0");
    expect(runInit).not.toHaveBeenCalled();
  });

  it("prints help with --help", async () => {
    await runCli("--help");
    expect(logSpy).toHaveBeenCalled();
    expect(runInit).not.toHaveBeenCalled();
  });

  it("runs init by default (no command)", async () => {
    await runCli();
    expect(runInit).toHaveBeenCalledTimes(1);
  });

  it("runs init for the explicit init command", async () => {
    await runCli("init");
    expect(runInit).toHaveBeenCalledTimes(1);
  });

  it("errors and exits on an unknown command", async () => {
    await runCli("bogus");
    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

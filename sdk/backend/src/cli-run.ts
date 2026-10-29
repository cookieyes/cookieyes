import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ConsentBackend } from "./handler.js";

/** Where the CLI writes, so tests can capture it. */
export type CliIo = { out: (line: string) => void; err: (line: string) => void; cwd: string };

const USAGE = `Usage: cookieyes-backend <command> --config <file>

Commands:
  migrate --plan     Show the schema changes that would run (the default)
  migrate --apply    Run them
  prune              Delete records older than the retention period

--config is a module that exports your createConsentBackend() result,
as its default export or as \`backend\`. A TypeScript file needs a Node
version that runs TypeScript, or compile it first.`;

async function loadBackend(file: string, cwd: string): Promise<ConsentBackend> {
  const mod = (await import(pathToFileURL(resolve(cwd, file)).href)) as {
    default?: unknown;
    backend?: unknown;
  };
  const candidate = (mod.backend ?? mod.default) as Partial<ConsentBackend> | undefined;
  if (typeof candidate?.migrate !== "function" || typeof candidate.prune !== "function") {
    throw new Error(
      `${file} must export the result of createConsentBackend(), as its default export or as \`backend\`.`,
    );
  }
  return candidate as ConsentBackend;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Runs one CLI command and returns the exit code. */
export async function runCli(args: readonly string[], io: CliIo): Promise<number> {
  const [command, ...rest] = args;
  const configAt = rest.indexOf("--config");
  const config = configAt === -1 ? undefined : rest[configAt + 1];
  if ((command !== "migrate" && command !== "prune") || !config) {
    io.err(USAGE);
    return command === "--help" || command === "-h" ? 0 : 1;
  }
  try {
    const backend = await loadBackend(config, io.cwd);
    if (command === "prune") {
      io.out(`Removed ${plural(await backend.prune(), "record")}.`);
      return 0;
    }
    const apply = rest.includes("--apply");
    const report = await backend.migrate({ dryRun: !apply });
    if (apply) {
      io.out(
        report.applied.length === 0
          ? "The database schema is already up to date."
          : `Applied ${plural(report.applied.length, "migration")}: ${report.applied.join(", ")}.`,
      );
    } else if (report.pending.length === 0) {
      io.out("The database schema is up to date. Nothing to apply.");
    } else {
      io.out(`${plural(report.pending.length, "migration")} to apply:`);
      for (const id of report.pending) io.out(`  ${id}`);
      io.out("Back up the database, then run again with --apply.");
    }
    return 0;
  } catch (error) {
    io.err(`cookieyes-backend: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

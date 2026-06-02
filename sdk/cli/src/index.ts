import { runInit } from "./commands/init.js";

const [, , command] = process.argv;

async function main() {
  // Show version
  if (command === "--version" || command === "-v") {
    console.log("1.0.0");
    return;
  }

  // Show help
  if (command === "--help" || command === "-h") {
    console.log(`
  ${" @cookieyes/cli "}

  Usage
    npx @cookieyes/cli [command]
    pnpm dlx @cookieyes/cli [command]
    bunx @cookieyes/cli [command]

  Commands
    init    Set up CookieYes consent SDK in your project (default)

  Options
    -v, --version    Print version
    -h, --help       Print this help message

  Examples
    npx @cookieyes/cli
    npx @cookieyes/cli init
    pnpm dlx @cookieyes/cli init
`);
    return;
  }

  // Default: run init (also handles explicit "init" command)
  if (!command || command === "init") {
    await runInit();
    return;
  }

  console.error(`Unknown command: ${command}\nRun with --help to see available commands.`);
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

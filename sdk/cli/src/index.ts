import { runInit } from "./commands/init.js";
import { CLI_VERSION } from "./version.js";

const args = process.argv.slice(2);
const [command] = args;

async function main() {
  // Show version
  if (args.includes("--version") || args.includes("-v")) {
    console.log(CLI_VERSION);
    return;
  }

  // Show help. Checked anywhere in the arguments: `init --help` once started the prompts.
  if (args.includes("--help") || args.includes("-h")) {
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

  init options (each one skips its question)
    --framework <nextjs|react|vanilla>
    --mode <cookie-only|self-hosted>
    --api-url <url>          Where records are sent (implies self-hosted)
    --regulation <GDPR|CCPA>
    --color-scheme <light|dark>
    --locales <es,fr,de>     Extra languages; "" for none
    --install, --no-install  Install the package now, or not
    -y, --yes                Accept the default for every question left

  Examples
    npx @cookieyes/cli
    npx @cookieyes/cli init
    pnpm dlx @cookieyes/cli init
    npx @cookieyes/cli init --yes --framework nextjs
    npx @cookieyes/cli init --yes --api-url /api/consent --no-install
`);
    return;
  }

  // Default: run init (also handles explicit "init" command)
  if (!command || command === "init") {
    await runInit(command === "init" ? args.slice(1) : []);
    return;
  }
  // Flags without a command belong to the default command, init.
  if (command.startsWith("-")) {
    await runInit(args);
    return;
  }

  console.error(`Unknown command: ${command}\nRun with --help to see available commands.`);
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

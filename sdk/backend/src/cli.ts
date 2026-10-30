import { runCli } from "./cli-run.js";

const code = await runCli(process.argv.slice(2), {
  out: (line) => console.log(line),
  err: (line) => console.error(line),
  cwd: process.cwd(),
});
// An explicit exit: the app's database pool would otherwise keep the process open.
process.exit(code);

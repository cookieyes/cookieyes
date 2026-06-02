import { execa } from "execa";
import { addCommand, type PackageManager } from "./detect-pm.js";

export async function installPackage(pkg: string, pm: PackageManager, cwd: string): Promise<void> {
  const [cmd, args] = addCommand(pm, pkg);
  await execa(cmd, [...args], { cwd, stdio: "inherit" });
}

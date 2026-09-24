import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The skills under content/agent-skills, published at /.well-known/agent-skills (Agent
 * Skills Discovery v0.2.0). The index carries a sha256 of each SKILL.md exactly as served,
 * so it is computed from the file rather than written by hand.
 */
export const SKILLS = ["install-consent-banner", "gate-third-party-scripts"] as const;
export type Skill = (typeof SKILLS)[number];

export function isSkill(name: string): name is Skill {
  return (SKILLS as readonly string[]).includes(name);
}

export async function readSkill(name: Skill) {
  const content = await readFile(
    join(process.cwd(), "content", "agent-skills", name, "SKILL.md"),
    "utf8",
  );
  const description = /^description:\s*"?(.*?)"?\s*$/m.exec(content)?.[1] ?? "";
  const digest = `sha256:${createHash("sha256").update(content).digest("hex")}`;
  return { name, description, content, digest };
}

// Checks the contributor skills in .agents/skills against the Agent Skills format
// (https://agentskills.io/specification) and makes sure each one is reachable from
// .claude/skills, which is the only directory Claude Code reads. A broken link
// there fails silently in the editor, so it has to fail loudly here instead.
//
//   node tools/agents/check-skills.mjs

import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const sourceDir = join(root, ".agents/skills");
const mirrorDir = join(root, ".claude/skills");

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const errors = [];

const skills = readdirSync(sourceDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (skills.length === 0) errors.push(`${sourceDir}: no skills found`);

for (const skill of skills) {
  const file = join(sourceDir, skill, "SKILL.md");
  if (!existsSync(file)) {
    errors.push(`${skill}: missing SKILL.md`);
    continue;
  }

  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    errors.push(`${skill}: SKILL.md must start with YAML frontmatter`);
    continue;
  }
  const [, frontmatter, body] = match;
  const field = (key) => frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim();

  const name = field("name");
  const description = field("description");
  if (name !== skill)
    errors.push(`${skill}: frontmatter name "${name}" must equal the folder name`);
  if (!NAME.test(skill) || skill.length > 64) errors.push(`${skill}: invalid skill name`);
  if (!description) errors.push(`${skill}: description is required`);
  else if (description.length > 1024) errors.push(`${skill}: description over 1024 characters`);
  if (body.trim() === "") errors.push(`${skill}: SKILL.md has no body`);
  if (body.split("\n").length > 500) errors.push(`${skill}: SKILL.md over 500 lines; split it`);

  // Claude Code reads .claude/skills only, so each skill is linked there. The link must
  // point back at the source; a copy would drift.
  const target = linkTarget(join(mirrorDir, skill));
  if (target === null) {
    errors.push(
      `${skill}: .claude/skills/${skill} must be a symlink to ../../.agents/skills/${skill}`,
    );
  } else if (resolve(mirrorDir, target) !== join(sourceDir, skill)) {
    errors.push(`${skill}: .claude/skills/${skill} points somewhere other than the source skill`);
  }
}

// Git without symlink support (Windows by default) checks a symlink out as a plain
// file holding the link path, so that shape is accepted as well.
function linkTarget(path) {
  if (!existsSync(path)) return null;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return readlinkSync(path);
  if (stat.isFile()) return readFileSync(path, "utf8").trim();
  return null;
}

if (existsSync(mirrorDir)) {
  for (const entry of readdirSync(mirrorDir)) {
    if (!skills.includes(entry)) errors.push(`.claude/skills/${entry}: no matching source skill`);
  }
}

if (errors.length > 0) {
  console.error("Skill check failed:");
  for (const error of errors) console.error(`  ✗ ${error}`);
  process.exit(1);
}
console.log(`Skill check passed: ${skills.length} skills (${skills.join(", ")})`);

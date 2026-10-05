// Checks both skill sets against the Agent Skills format
// (https://agentskills.io/specification):
//
// - .agents/skills: contributor skills. Each must be reachable from .claude/skills, the only
//   directory Claude Code reads; a broken link there fails silently in the editor, so it has
//   to fail loudly here instead.
// - skills: customer skills. Each one listed in SKILLS in apps/web/src/lib/agent-skills.ts,
//   or the docs site silently stops serving it.
//
//   node tools/agents/check-skills.mjs

import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const sourceDir = join(root, ".agents/skills");
const mirrorDir = join(root, ".claude/skills");
const customerDir = join(root, "skills");
const siteList = join(root, "apps/web/src/lib/agent-skills.ts");

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const errors = [];

const skills = listSkills(sourceDir);
const customerSkills = listSkills(customerDir);

for (const skill of customerSkills) checkFormat(customerDir, `skills/${skill}`, skill);

const listed = [
  ...(readFileSync(siteList, "utf8").match(/SKILLS = \[([^\]]*)\]/)?.[1] ?? "").matchAll(
    /"([^"]+)"/g,
  ),
].map((m) => m[1]);
for (const skill of customerSkills) {
  if (!listed.includes(skill))
    errors.push(`skills/${skill}: add it to SKILLS in apps/web/src/lib/agent-skills.ts`);
}
for (const skill of listed) {
  if (!customerSkills.includes(skill))
    errors.push(`apps/web/src/lib/agent-skills.ts: "${skill}" has no folder under skills/`);
}

for (const skill of skills) {
  if (!checkFormat(sourceDir, skill, skill)) continue;

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

function listSkills(dir) {
  const found = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (found.length === 0) errors.push(`${dir}: no skills found`);
  return found;
}

// Returns false when the file is too broken to check further.
function checkFormat(dir, label, skill) {
  const file = join(dir, skill, "SKILL.md");
  if (!existsSync(file)) {
    errors.push(`${label}: missing SKILL.md`);
    return false;
  }

  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    errors.push(`${label}: SKILL.md must start with YAML frontmatter`);
    return false;
  }
  const [, frontmatter, body] = match;
  const field = (key) => frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim();

  const name = field("name");
  const description = field("description");
  if (name !== skill)
    errors.push(`${label}: frontmatter name "${name}" must equal the folder name`);
  if (!NAME.test(skill) || skill.length > 64) errors.push(`${label}: invalid skill name`);
  if (!description) errors.push(`${label}: description is required`);
  else if (description.length > 1024) errors.push(`${label}: description over 1024 characters`);
  if (body.trim() === "") errors.push(`${label}: SKILL.md has no body`);
  if (body.split("\n").length > 500) errors.push(`${label}: SKILL.md over 500 lines; split it`);
  return true;
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
console.log(
  `Skill check passed: ${skills.length} contributor skills (${skills.join(", ")}), ` +
    `${customerSkills.length} customer skills (${customerSkills.join(", ")})`,
);

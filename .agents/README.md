# Agent instructions: how the files fit together

One set of files, read by every AI coding tool. Please keep it that way.

| Path | What it is | Who reads it |
|---|---|---|
| `/AGENTS.md` | The rules, always loaded | Codex, Cursor, Antigravity, Copilot, Claude Code (via `CLAUDE.md`) |
| `/CLAUDE.md` | One line, `@AGENTS.md`. Not a second copy | Claude Code |
| `/apps/web/AGENTS.md` + `CLAUDE.md` | Docs-site rules, loaded when an agent works under `apps/web` | same as above |
| `/.agents/skills/<name>/SKILL.md` | Step-by-step guides for recurring tasks, loaded on demand | Codex, Cursor, Antigravity, Copilot |
| `/.claude/skills/<name>` | Symlinks to the folders above | Claude Code, which reads only this directory |

## Rules for editing

- Edit `AGENTS.md` and `.agents/skills/`. Never put content in `CLAUDE.md` or `.claude/skills/`;
  they only point at the source.
- Adding a skill: create `.agents/skills/<name>/SKILL.md` (frontmatter `name` equals the folder
  name) and `ln -s ../../.agents/skills/<name> .claude/skills/<name>`. Then `pnpm agents:check`.
- Do not replace the symlinks with copies. Copies drift, and `pnpm agents:check` fails on them.
- On Windows without symlink support, Git checks the links out as small text files holding the
  link path. Claude Code then does not see the skills there, but the table at the top of
  `AGENTS.md` still points every agent at `.agents/skills/`. Nothing else breaks.
- `skills/` at the repository root is a different thing: skills for people using the SDK,
  installed with `npx skills add cookieyes/cookieyes` and served from the docs site.
  Contributor skills live here.

Skill format: [agentskills.io/specification](https://agentskills.io/specification). Keep each
`SKILL.md` under 500 lines and write the `description` so a tool can tell when to use it.

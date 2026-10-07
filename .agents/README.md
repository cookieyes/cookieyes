# Agent instructions: how the files fit together

One set of files, read by every AI coding tool. Please keep it that way.

| Path | What it is | Who reads it |
|---|---|---|
| `/AGENTS.md` | The rules, always loaded | Codex, Cursor, Antigravity, Copilot, Claude Code (via `CLAUDE.md`) |
| `/CLAUDE.md` | One line, `@AGENTS.md`. Not a second copy | Claude Code |
| `/apps/web/AGENTS.md` + `CLAUDE.md` | Docs-site rules, loaded when an agent works under `apps/web` | same as above |
| `/.agents/skills/<name>/SKILL.md` | Step-by-step guides for recurring tasks, loaded on demand | Codex, Cursor, Antigravity, Copilot |
| `/.claude/skills/<name>` | Symlinks to the folders above | Claude Code, which reads only this directory |
| `/skills/<name>/SKILL.md` | Guides for people *using* the SDK, not contributors | Their AI tools, via `npx skills add cookieyes/cookieyes` and the docs site |
| `/context7.json` | Which files Context7 indexes, and the rules it gives with answers | Context7 |

## Rules for editing

- Edit `AGENTS.md` and `.agents/skills/`. Never put content in `CLAUDE.md` or `.claude/skills/`;
  they only point at the source.
- Adding a skill: create `.agents/skills/<name>/SKILL.md` (frontmatter `name` equals the folder
  name) and `ln -s ../../.agents/skills/<name> .claude/skills/<name>`. Then `pnpm agents:check`.
- Do not replace the symlinks with copies. Copies drift, and `pnpm agents:check` fails on them.
- On Windows without symlink support, Git checks the links out as small text files holding the
  link path. Claude Code then does not see the skills there, but the table at the top of
  `AGENTS.md` still points every agent at `.agents/skills/`. Nothing else breaks.

## Contributor skills and customer skills

- Every contributor skill sets `metadata:` with `internal: true` in its frontmatter.
  `npx skills add cookieyes/cookieyes` searches `.agents/skills/` as well as `skills/`, and the
  flag is what keeps contributor guides out of users' projects. `pnpm agents:check` fails
  without it.
- Customer skills in `skills/` never set it. Their reader has only the npm packages and the
  docs site, so they never point into `sdk/*/src`, `.agents/` or other repo internals.
- A fact both need (an export, a default, a pitfall) is written once, in the customer skill or
  the docs, and a contributor skill links to it rather than copying it.
- Every `ts`/`tsx` fence in a customer skill is type-checked against the built SDK by
  `apps/web/scripts/check-examples.mjs` (part of `pnpm build:web`). Give fences a
  `title="path/file.ts"` when one file imports another; use `check="false"` only for a fragment.
- Adding a customer skill: also list it in `SKILLS` in `apps/web/src/lib/agent-skills.ts`
  (`pnpm agents:check` enforces this), in `apps/web/src/app/.well-known/ai-catalog.json/route.ts`,
  and in the table on `apps/web/content/shared/ai-agents.mdx`.

Skill format: [agentskills.io/specification](https://agentskills.io/specification). Keep each
`SKILL.md` under 500 lines and write the `description` so a tool can tell when to use it.

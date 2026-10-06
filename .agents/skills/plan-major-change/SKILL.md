---
name: plan-major-change
description: 'Research and plan before writing code for a change that touches consent behaviour in sdk/core, a public API or export, a config option, more than one package, or anything with legal or compliance meaning. Also use when a request is large or unclear. Ends with the developer approving a plan.'
metadata:
  internal: true
---

# Plan a major change

Nothing in this skill writes code. Its output is a short plan the developer has approved.

## When this applies

Any one of these makes a change major:

- consent behaviour: what is granted or denied by default, under which regulation, what counts
  as a decision, what is stored in the cookie or sent to a backend, when a script or iframe loads
- a public API: a new, changed or removed export, prop, hook, config option or CLI flag
- more than one package under `sdk/`
- banner rendering, SSR, `critical.css` or anything first-paint related
- a dependency, a build change or a bundle-size budget change
- the request is vague ("make consent faster", "improve the banner")

If none apply, skip this skill and do the task.

## Step 1: research the code

Read, in this order, and note what you learn:

1. The module you will change and its tests in `src/__tests__/`. The comments record past bugs.
2. `src/__tests__/exports.test.ts` of each affected package: the public surface you must keep or
   consciously change.
3. The docs page for the feature in `apps/web/content/shared/`, and the README of the package.
4. `docs/design/` for a note on the area (its README lists them). Read it fully if one exists.
5. `sdk/test/README.md`, section "Fidelity & limitations", if consent behaviour is involved.
6. `tools/size/budgets.json`: how much headroom the affected bundle has.
7. `CONTRIBUTING.md`, section "The Roadmap": is this `lane:core`? Then an approved issue is
   required before any code.

## Step 2: ask the developer

Ask only the questions the code did not answer. Ask them all in one message and wait for the
answers. Do not guess the answers and do not start coding.

1. **Goal.** What problem does this solve, for whom? Is there an issue or discussion? Issues live
   at `github.com/cookieyes/cookieyes/issues` (`gh issue list --repo cookieyes/cookieyes`). If this
   is `lane:core` and there is no approved issue, say that one is needed and stop here.
2. **Scope.** Which packages? Is anything breaking for current users? (Breaking changes ship
   before 1.0 as a `minor` with an "Action required" note, but they still need agreement.)
3. **Compliance.** Does it change what is granted or denied, under GDPR or CCPA, what is recorded,
   or when a vendor loads? Who confirms it is compliant? Does the answer differ by jurisdiction?
   You do not decide legal questions; you surface them.
4. **Compatibility.** Cookies written by older versions, SSR and the no-flash guarantee, users of
   `@cookieyes/test`, the CLI templates, the peer-dependency ranges.
5. **Size.** Expected growth in bytes, which budget, and whether that growth is acceptable.
6. **Docs and migration.** Which pages change? Is a migration note needed?
7. **Proof.** How will we know it works? Which existing tests should change?

## Step 3: propose the plan

Reply with a short plan, then wait for approval:

- files to touch, per package, in order: core, adapters, `@cookieyes/test`, docs, changeset
- the API shape, as a code snippet if there is one
- tests to add or change
- the expected size change and the budget decision
- risks and what you will not do
- the changeset bump per package

Keep it under one screen. If the developer changes the plan, update it; do not start on the old one.

## Step 4: implement, in order

Core first, then adapters, then `@cookieyes/test`, then docs, then the changeset. One logical
change per commit. Finish with the checklist in the root `AGENTS.md`.

## Step 5: leave a design note

For a change that adds a guarantee others must protect, add or update a note in `docs/design/`:
what to protect, why, and how it has broken before. Short. Public. No internal references.

## Do not

- write code before Step 3 is approved
- widen the scope while implementing; park new ideas in the plan's "not doing" list
- answer compliance questions yourself
- lower a test threshold, raise a budget or change a Vitest environment to get green

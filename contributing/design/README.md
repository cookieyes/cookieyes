# Design notes

Notes for whoever changes a sensitive part of this repository next: what the code guarantees, why
that guarantee exists, and how it has been broken before. They are for contributors and are not
published on the docs site.

A note is added or updated when a change introduces a guarantee others must protect. Keep it
short and factual, and remember the repository is public: no internal references.

| Note | Covers |
|---|---|
| [banner-first-paint.md](./banner-first-paint.md) | What the banner must hold at first paint, and the regressions that taught us |
| [ai-guidance.md](./ai-guidance.md) | The skills and Context7 rules that steer users' AI tools: one copy, internal contributor skills, code that compiles, and the questions that check Context7 |
| [announcement-bar.md](./announcement-bar.md) | The docs site's announcement strip: decided before paint, dismissed per id, consent first, sticky offsets, and the collapse bug that taught us |

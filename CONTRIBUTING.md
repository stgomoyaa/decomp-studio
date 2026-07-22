# Contributing

Decomp Studio is early-stage. Contributions should stay inside the active roadmap milestone and avoid expanding scope without an issue or maintainer decision.

## Rules

- TypeScript must stay strict when code is added.
- Do not commit ROMs, saves, extracted Nintendo assets, generated builds, or anything inside `projects/`.
- Do not copy or port code from incompatible licenses. Porymap is LGPL-3.0; use it only to understand behavior and document facts, not as source code to translate.
- Parser work requires round-trip tests: parse, serialize, and produce an empty diff against the pinned vanilla source file.
- UI code must not touch the filesystem or spawn processes directly. Use the server/core boundary.

## Milestone Flow

1. Read `ARCHITECTURE.md`, `ROADMAP.md`, and the relevant `docs/specs/*.md` file.
2. Work only on the active milestone.
3. Add or update tests for behavior changes.
4. Mark the matching roadmap checkbox only after verification is complete.

## Local Projects

Use `projects/` for local decomp clones and test hacks. The directory is gitignored on purpose.

# Decomp Studio

A local, cross-platform toolkit for building Pokemon GBA hackroms on top of
[pret](https://github.com/pret) decompilation projects. One safe workflow for
editing game data, building, and launching an emulator, with a shared core
that a UI, a CLI, and (planned) an MCP server all drive.

> **Status: pre-alpha — published as an architecture showcase.** The core engine
> and the pokeemerald adapter are in place; the desktop UI and the MCP server
> are still being built. This repo is public to document the design decisions
> (shared core, adapter pattern, legal policy around ROMs) more than to ship a
> finished product. See [ROADMAP.md](ROADMAP.md) for milestones.

## Why

Editing a decomp hackrom project by hand means juggling C source, build
scripts, an emulator, and a pile of community tools, with no guardrails against
corrupting the project. Decomp Studio wraps that into one validated workflow
built around a single engine, so the same edit is safe whether it comes from a
person clicking a button, a CLI in CI, or an AI agent calling a tool.

## What it works on

- Decomp source projects, never commercial ROM binaries.
- `pret/pokeemerald` first, for canonical round-trip tests.
- `rh-hideout/pokeemerald-expansion` compatibility is planned before 1.0.

## Architecture

A pnpm + TypeScript (strict) monorepo. One core, many front-ends:

```txt
packages/core                project model, build, validation, command stack
packages/adapter-pokeemerald  read/write layer for pokeemerald sources
packages/cli                  headless workflows and CI smoke tests
packages/schemas              shared data schemas
apps/server                   Fastify + tRPC bridge over the core
apps/desktop                  Electron shell
apps/web                      local UI (early)
packages/mcp                  MCP tools over the same core (planned)
```

The point of the shared core is that the UI, the CLI, and the agent-facing MCP
server never reimplement editing logic; they all call the same validated
services.

## Assets and legal policy

MIT licensed, original code and documentation only. This repository must never
contain ROMs, saves, extracted Nintendo assets, or user projects. Those paths
(`*.gba`, `*.ups`, `*.bps`, `examples/`, `projects/`) are gitignored by design.
Users generate their own patches locally against a legally obtained ROM; the
project distributes tooling, not game data.

## Getting started

Requires Node and pnpm.

```bash
pnpm install
pnpm dev:server     # run the core server
pnpm dev:desktop    # run the Electron app
pnpm check          # lint + typecheck + test
```

## Contributing

Architecture decisions live in [ARCHITECTURE.md](ARCHITECTURE.md) and the plan
in [ROADMAP.md](ROADMAP.md); both are worth reading before opening a PR. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## References

- pokeemerald: <https://github.com/pret/pokeemerald>
- pokeemerald-expansion: <https://github.com/rh-hideout/pokeemerald-expansion>
- Porymap: <https://github.com/huderlem/porymap>
- Poryscript: <https://github.com/huderlem/poryscript>
- mGBA: <https://github.com/mgba-emu/mgba>

## License

MIT. See [LICENSE](LICENSE).

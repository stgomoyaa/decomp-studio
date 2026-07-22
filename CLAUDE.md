# Decomp Studio — Overrides del repo

Convenciones completas del proyecto: ver `AGENTS.md` (compartidas con Codex). Arquitectura: `ARCHITECTURE.md`. Plan: `ROADMAP.md`.

## Git (OVERRIDE del global, específico Claude)

- Commits SOLO con autoría de Santiago. NUNCA `Co-Authored-By: Claude` ni "Generated with Claude Code" en commits, PRs o docs (reforzado por `.claude/settings.json` → `includeCoAuthoredBy: false`).
- No agregar remotos ni hacer push sin pedido explícito en la sesión.
- NO commitear ROMs (`*.gba`, `*.nds`, `*.sav`), assets de Nintendo, ni `projects/`. Solo se distribuyen patches `.bps`.

# AGENTS.md — Decomp Studio

Instrucciones para agentes de código (Codex, Claude Code, etc.) trabajando en este repo.

## Qué es esto

AIO multiplataforma open source para crear hackroms de Pokemon GBA sobre decomps de pret, con map editor integrado y MCP server como agregado. Leer SIEMPRE antes de implementar:

1. `ARCHITECTURE.md` — diseño del sistema y decisiones de stack (cerradas, no re-litigar)
2. `ROADMAP.md` — milestones con DoD; trabajar el milestone activo, no adelantar fases
3. `docs/specs/*.md` — spec del subsistema que estés tocando

## Reglas duras

- TypeScript `strict: true`. Nada de `any` (usar `unknown` + narrowing). Imports con `@/`.
- pnpm workspaces. Node LTS. Vitest para tests.
- **Round-trip obligatorio**: ningún parser del adapter se considera terminado sin su test parse → serialize → diff vacío contra pokeemerald vanilla pinneado. Ver `docs/specs/decomp-adapter.md`.
- Edición quirúrgica de archivos C (reemplazo por spans), nunca regenerar archivos completos.
- La UI (`apps/web`) jamás toca filesystem ni spawnea procesos: todo vía tRPC → `packages/core`.
- Multiplataforma siempre: nada de paths hardcodeados, usar `node:path`; comandos de build/emulador solo vía `ToolchainProvider` (ver `docs/specs/toolchain.md`).
- NUNCA commitear ROMs (`*.gba`, `*.sav`), assets de Nintendo, ni contenido de `projects/`.
- Licencia MIT: prohibido copiar, portar o "traducir" código de Porymap (LGPL-3.0) u otros proyectos con licencia incompatible — un port a TS sigue siendo trabajo derivado. Flujo permitido: leer para entender → anotar el HECHO (formato, bit layout, constante) en `docs/specs/` → implementar desde el spec, nunca con el código ajeno abierto al lado. Fuente primaria de constantes: el propio decomp (`include/fieldmap.h`, `include/constants/`), no Porymap.

## Git

- Commits SOLO con autoría de Santiago. Sin `Co-Authored-By` de IA, sin "Generated with", sin referencias a agentes en commits/PRs/código.
- Sin comentarios tipo `// added by AI` ni referencias a tasks.
- Feature branches `feat/<scope>`; no force-push a `main`.
- No commitear `.env` ni credenciales.

## Definition of Done de cualquier tarea

1. Typecheck + lint + tests verdes (incluida round-trip suite si tocaste el adapter).
2. Verificación real del flujo, no solo compilación: si tocaste build/emulador, correr contra un proyecto pokeemerald real; si tocaste UI, abrirla y ejercitar la vista.
3. Marcar el checkbox correspondiente en `ROADMAP.md`.
4. No abrir scope nuevo: si detectas trabajo extra, anotarlo en `ROADMAP.md` como pendiente, no implementarlo.

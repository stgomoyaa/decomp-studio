# Arquitectura — Decomp Studio (AIO multiplataforma)

Plataforma centralizada open source para crear hackroms de Pokemon GBA sobre decomps de pret: editar Pokemon, moves, trainers, textos, encounters, **mapas**, sprites; compilar, testear en emulador y generar patches — todo en una sola app. MCP server como agregado para que cualquier agente IA opere sobre el mismo motor.

## Goals / Non-goals

**Goals**
- Multiplataforma real: macOS, Windows, Linux.
- Todo-en-uno: nada de saltar entre 6 herramientas; map editor incluido.
- Trabajo sobre decomp (source C + assets), nunca edición binaria de ROM.
- Open source (MIT), repo público, sin un solo asset de Nintendo en el repo.
- Motor único: la UI, el MCP y la CLI usan exactamente los mismos servicios.

**Non-goals (por ahora)**
- NDS (congelado hasta cerrar GBA).
- Edición binaria de ROMs comerciales.
- Backend cloud / multiusuario: es una app local.
- Scripting visual de eventos (los scripts se editan como texto con validación; editor visual es futuro).

## Diagrama

```txt
        apps/web (React + PixiJS)          agente IA (Codex/Claude/etc)
                 |                                   |
            tRPC + WS                           MCP (stdio)
                 |                                   |
        apps/server (Fastify) ──────────── packages/mcp
                 \                              /
                  \                            /
                   +──── packages/core ───────+──── packages/cli
                              |
     +---------+---------+----+----+----------+-----------+
     |         |         |         |          |           |
  project   adapter    build    emulator   patcher    validation
  service   (pret)    service   service    (BPS)      service
                |
        parsers/serializers (round-trip)
                |
   proyecto hackrom del usuario (clone de pokeemerald + git propio)
```

Regla de oro: **la UI nunca toca el filesystem ni spawnea procesos**. Todo pasa por `core` vía el server. El MCP es otra cara del mismo `core` — mismo código de validación, mismos backups, mismo undo. Por eso un agente IA no puede romper nada que la UI no pueda romper.

## Monorepo

```txt
decomp-studio/
  apps/
    server/        # Fastify + tRPC v11: HTTP + WebSocket (logs de build, progreso)
    web/           # Vite + React + TS + Tailwind; PixiJS v8 para el map canvas
    desktop/       # Electron shell (milestone de release; envuelve server+web)
  packages/
    core/          # Motor: services, command stack (undo/redo), event bus. Puro Node, cero deps de UI
    schemas/       # Zod schemas de TODO el dominio (species, move, trainer, map, project.json)
    adapter-pokeemerald/  # Parsers/serializers de los archivos del decomp, pinneado a commit
    mcp/           # MCP server stdio (@modelcontextprotocol/sdk), capa delgada sobre core
    cli/           # CLI headless: útil para CI y para que el agente verifique sin UI
  docs/
    specs/         # Specs por subsistema (ver abajo)
  projects/        # gitignored — proyectos hackrom del usuario viven acá
```

## Decisiones de stack (con trade-offs)

| Decisión | Elección | Por qué / trade-off |
|---|---|---|
| Lenguaje | TypeScript strict en todo | Un solo lenguaje = iteración con IA sin fricción. Rust (Tauri core) daría binarios más chicos pero parte el codebase en dos lenguajes |
| App shell | **Web-first** (server local + browser), Electron al final | Desarrollar como web app local = hot reload, cero packaging pain durante meses de iteración. Electron se agrega en el milestone de release como cáscara. Si el peso del binario molesta después, la misma arquitectura permite migrar la cáscara a Tauri sin tocar core/web |
| RPC | tRPC v11 + WebSocket | Tipos end-to-end desde `schemas` sin codegen. Alternativa REST+OpenAPI es más interoperable pero acá el único cliente es nuestra web |
| Render de mapas | PixiJS v8 (WebGL) | Pintar/zoom/pan fluido en mapas grandes (hasta ~100x100 metatiles con overlays). Canvas 2D serviría para un viewer, pero migrar después obliga a rewrite |
| Estado UI | Zustand + TanStack Query | Simple, estándar, la IA lo conoce de memoria |
| Índice/búsqueda | En memoria + chokidar (file watching) | SQLite solo si la búsqueda de texto global se pone lenta. Menos piezas móviles |
| Undo/redo | Command pattern en `core` | Cada mutación es un Command con inverse. Checkpoints git del proyecto antes de operaciones grandes (rollback grueso) + command stack (rollback fino) |
| Validación | Zod en `schemas`, única fuente | El mismo schema valida en UI (forms), server (tRPC input) y MCP (tool input) |
| Patches | BPS (Flips como binario embebido o lib JS) | Estándar de la comunidad; nunca se distribuye ROM |
| Licencia | MIT | Máxima adopción. ⚠️ Porymap es LGPL-3.0: se usa como referencia de formatos, **prohibido portar su código** — implementación limpia desde los formatos (los formatos no tienen copyright) |

## Core: conceptos

- **Project**: un clone de `pokeemerald` + `project.json` + git propio (para checkpoints/rollback). El Studio nunca modifica nada fuera del directorio del proyecto.
- **Adapter**: sabe leer/escribir los archivos de UNA base decomp pinneada a commit/tag. `adapter-pokeemerald` primero; `adapter-pokeemerald-expansion` (rh-hideout) es el segundo adapter, no un `if` dentro del primero. Interface común en `core`.
- **Services** (uno por dominio): `species`, `moves`, `trainers`, `encounters`, `text`, `maps`, `tilesets`, `sprites`, `build`, `emulator`, `patcher`, `validation`. Cada service expone operaciones tipadas; los tres frontends (web, MCP, CLI) las consumen tal cual.
- **Round-trip como contrato**: todo parser debe cumplir parse → serialize → diff vacío contra el archivo original del decomp vanilla completo. Es EL test de regresión del proyecto y lo que permite que una IA edite sin miedo. Detalle en `docs/specs/decomp-adapter.md`.
- **Event bus**: `core` emite eventos (build progress, file changed, validation result); el server los puentea a WS para la UI y el MCP los expone como notificaciones.

## Subsistemas con spec propia

| Spec | Qué cubre |
|---|---|
| `docs/specs/decomp-adapter.md` | Mapa archivo→service, reglas de parsing (edición quirúrgica, no regeneración), charmap, round-trip testing |
| `docs/specs/map-editor.md` | Formatos verificados (map.json, layouts.json, map.bin, tilesets), pipeline de render, operaciones de edición, undo |
| `docs/specs/toolchain.md` | Estrategia por OS (nativo mac/linux, WSL2 en Windows, Docker como fallback y para CI), mGBA |
| `docs/specs/mcp-server.md` | Tools/resources/prompts, mapeo 1:1 a core services |

## Testing

1. **Round-trip suite** (la crítica): corre parse→serialize→diff sobre TODOS los archivos soportados de un pokeemerald vanilla pinneado. CI la ejecuta clonando pret/pokeemerald (público).
2. Unit tests de parsers con fixtures mínimas (casos borde: comentarios, macros, ifdefs).
3. Integration en CI con Docker (`devkitpro/devkitarm`): compilar la ROM tras una edición programática y verificar que el build pasa. Job pesado: solo en main/nightly.
4. E2E smoke vía `cli`: crear proyecto → editar species → build → verificar hash cambia.

## CI / open source

- GitHub Actions: lint + typecheck + unit + round-trip en matrix (ubuntu/macos/windows); build-ROM integration solo ubuntu con Docker.
- Repo público desde el día 1: `LICENSE` (MIT), `README` con screenshot temprano, `CONTRIBUTING.md`, issues con labels `good-first-issue`.
- Política de contenido: cero ROMs, cero assets extraídos, cero bytes de Nintendo en el repo. Los decomps los clona el usuario en su máquina. Se distribuyen `.bps`, jamás ROMs parcheadas.
- Commits sin atribución de IA (regla en `AGENTS.md`).

# Spec — MCP server (agregado)

El MCP no es el producto: es una cara más del motor. `packages/mcp` es una capa DELGADA: cada tool llama al mismo service de `core` que usa la UI. Cero lógica propia — así el agente tiene exactamente los mismos límites y validaciones que un humano en la UI, y ambos comparten undo stack y checkpoints.

## Transporte y registro

- stdio con `@modelcontextprotocol/sdk` (TypeScript oficial).
- Binario: `decomp-studio mcp --project <dir>` (subcomando de la CLI).
- Registrable en cualquier cliente MCP (Claude Code, Codex, Cursor, etc.).

## Tools (mapeo 1:1 a core services)

| Tool | Service |
|---|---|
| `project_inspect`, `toolchain_check` | project |
| `species_list` / `species_get` / `species_update` | species |
| `moves_list` / `moves_get` / `moves_update` | moves |
| `trainers_list` / `trainers_get` / `trainers_update` | trainers |
| `encounters_list` / `encounters_update` | encounters |
| `text_search` / `text_replace` | text |
| `maps_list` / `maps_get` / `maps_update_metadata` / `maps_update_events` | maps |
| `build_run` / `build_clean` | build |
| `emulator_launch` | emulator |
| `patch_create` | patcher |
| `validation_run` | validation |
| `checkpoint_create` / `checkpoint_rollback` | project (git) |

Input schemas = los mismos Zod de `packages/schemas` (zod → JSON Schema). Nota: edición de blockdata (pintar mapas) NO se expone por MCP en v1 — es interacción visual; el agente edita metadata/eventos/encounters de mapas, no pinta tiles.

## Resources

- `hackrom://project/config`, `hackrom://project/build-log`, `hackrom://project/validation-report`
- `hackrom://species/{id}`, `hackrom://trainers/{id}`, `hackrom://maps/{id}`

## Prompts

`balance_trainer_party`, `design_starter_trio`, `rewrite_dialogue`, `validate_progression_curve`, `explain_build_error` — plantillas que combinan tools; se definen al final, cuando los tools estén estables.

## Seguridad

- El server MCP opera SOLO dentro del directorio del proyecto abierto (path traversal bloqueado en core, no en el MCP).
- Toda mutación pasa por validation + checkpoint git automático (heredado de core).
- Sin tools de shell arbitrario: `build_run` ejecuta make del proyecto y punto.

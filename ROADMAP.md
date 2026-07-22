# Roadmap — Decomp Studio

Plan por milestones para construir el AIO iterando con agentes de código (Codex). Cada milestone = 1–4 sesiones, cierra con su DoD verificado antes de pasar al siguiente. Arquitectura y decisiones: `ARCHITECTURE.md`. Specs: `docs/specs/`.

Factibilidad verificada contra los repos reales (2026-07-01): pokeemerald compila oficial en macOS/Linux/Windows-WSL ([INSTALL.md](https://github.com/pret/pokeemerald/blob/master/INSTALL.md)); species/moves/trainers son C regular parseable; encounters, mapas y layouts ya son JSON; blockdata y tilesets son binarios simples documentados; sprites son PNG; mGBA y MCP SDK existen para los 3 OS.

## M0 audit del ecosistema — conclusiones (2026-07-01)

Fuentes revisadas: GitHub, PokéCommunity, r/PokemonROMhacks y docs/repos de tools. No hay censo oficial de adopción; las conclusiones usan proxies verificables (actividad de repos, releases, forks/stars, créditos/README y threads de comunidad).

### Hallazgos

- **Base moderna dominante:** `rh-hideout/pokeemerald-expansion` está activo y es el punto de partida más importante para hacks GBA decomp modernos. Release `1.16.1` publicada el 2026-06-06; repo activo al 2026-07-01. Fuente: <https://github.com/rh-hideout/pokeemerald-expansion>.
- **Base canónica para round-trip:** `pret/pokeemerald` sigue siendo el upstream estable para probar parsers contra vanilla y fijar contratos de adapter. Fuente: <https://github.com/pret/pokeemerald>.
- **FireRed decomp existe, pero menor prioridad:** `pret/pokefirered` y `cawtds/pokefirered-expansion` están activos, pero la señal pública es menor que Emerald/RHH. Fuentes: <https://github.com/pret/pokefirered>, <https://github.com/cawtds/pokefirered-expansion>.
- **Binary hacking sigue vivo, pero es otro mercado:** `HexManiacAdvance`, CFRU y DPE siguen activos/útiles para FireRed binario y hacks legacy-activos. No entran al core de este producto. Fuentes: <https://github.com/haven1433/HexManiacAdvance>, <https://github.com/Skeli789/Complete-Fire-Red-Upgrade>, <https://github.com/Skeli789/Dynamic-Pokemon-Expansion>.
- **Tooling estándar vivo:** Porymap (`6.3.1`, 2026-04-12), Poryscript (`3.6.1`, 2026-05-31), Porytiles (`1.0.0`, 2026-06-05) y mGBA (`0.10.5`, 2025-03-09) son piezas centrales. Fuentes: <https://github.com/huderlem/porymap>, <https://github.com/huderlem/poryscript>, <https://github.com/grunt-lucas/porytiles>, <https://github.com/mgba-emu/mgba>.
- **Competencia directa existe:** `TORCH` es un IDE web self-hosted para `pokeemerald-expansion` con mapas, NPCs, encounters, trainers, scripts y build pipeline. No usar claim de “no existe AIO”. Diferencial de Decomp Studio: MIT/open source real, desktop multiplataforma, MCP, safety por round-trip y command/checkpoint stack. Fuente: <https://github.com/eagredev/TORCH>.
- **Pain points rankeados:** setup decomp/toolchain, fragmentación entre herramientas, tilesets/paletas/assets, scripting/eventos, species/trainers multi-archivo, tools Windows-only. Fuentes representativas: <https://github.com/pret/pokeemerald/blob/master/INSTALL.md>, <https://github.com/jschoeny/PorySuite>, <https://www.pokecommunity.com/threads/porypal-palette-and-tileset-editor-for-gen-3-rom-hacking-projects.535747/>.
- **Hacks trending mezclan generaciones de tooling:** Radical Red confirma CFRU+DPE; Elite Redux declara pokeemerald decomp; Emerald Seaglass se presenta como basado en `pokeemerald-expansion`; Emerald Legacy tiene repo público. Fuentes: <https://www.pokecommunity.com/threads/pok%C3%A9mon-radical-red-version-4-1-released-gen-9-dlc-pokemon-character-customization-now-available.437688/>, <https://github.com/Elite-Redux/eliteredux>, <https://www.reddit.com/r/PokemonROMhacks/comments/1dralmx/pokemon_emerald_seaglass_my_wip_emerald_hack/>, <https://github.com/cRz-Shadows/Pokemon_Emerald_Legacy>.

### Ajustes al backlog

- Mantener `pret/pokeemerald` como primer adapter y fixture vanilla para round-trip, pero **no dejar `pokeemerald-expansion` post-1.0**. Agregar un milestone de compatibilidad RHH antes del MCP/release.
- Subir prioridad de `toolchain.check/doctor`: setup es el bloqueo más frecuente. La UI debe guiar build/run desde M2, no recién en release.
- No construir un lenguaje propio de scripting en 1.0. Interop/validación con Poryscript gana por estándar y menor riesgo.
- No competir con HexManiacAdvance ni CFRU/DPE en edición binaria. El foco sigue siendo decomp + safety.
- No bundlear assets comunitarios. Soportar import + metadata de créditos/URL.

## M0 — Entorno + repo público (1 sesión) 🔴 BLOQUEANTE

- [x] **Deep audit del ecosistema.** Conclusiones volcadas arriba (bases, tools, competencia, pain points) y backlog ajustado antes de escribir código.
- [x] Clonar pret/pokeemerald, instalar toolchain (INSTALL.md macOS), `make` → ROM vanilla boota en mGBA. Verificado local: `projects/pokeemerald-vanilla`, SHA1 vanilla `f3ae088181bf583e55daf962a92bb46f4f1d07b7`, launch con mGBA.
- [x] Editar un stat a mano, recompilar, verificar en juego (de-risk del pipeline completo). Verificado local: Treecko `.baseAttack` `45` → `99`, build incremental OK, SHA1 modificado `4a0cab7f1b0991556377a107becd28584385c5f2`, launch con mGBA.
- [ ] Repo público GitHub: LICENSE MIT, README con pitch, .gitignore, CONTRIBUTING mínimo. Archivos listos localmente; falta crear remoto/push cuando se pida explícitamente.
- [x] Elegir y pinnear commit de pokeemerald para el adapter: `pret/pokeemerald@83df84e40623b79281f2397faa611cbf044170bd`.

**DoD:** ROM propia bootea; repo público en línea. Estado local: boot/build listo; falta remoto GitHub.

## M1 — Core + CLI headless (2–3 sesiones)

- [x] Monorepo pnpm: `packages/{core,schemas,adapter-pokeemerald,cli}` + tooling (tsconfig strict, eslint, vitest, CI lint+test). Local: `pnpm check` verde.
- [x] `project.json` (schema Zod), project service: create/open/detect (identificar `pokeemerald` + commit; detectar `pokeemerald-expansion` como perfil conocido aunque el adapter completo llegue en M8.5), checkpoints git. Estado: `project init/open/inspect` + checkpoints internos en `refs/decomp-studio/checkpoints/*` antes de mutaciones.
- [x] `ToolchainProvider` native (mac/linux) + `toolchain.check/doctor` con instrucciones accionables por OS. Estado: native macOS check OK.
- [x] Build service (make wrapper, streaming de logs, parsing de errores gcc) + emulator service (mGBA launch). Estado: build streaming + SHA1 + diagnostics básicos gcc/ld + mGBA launch OK.
- [x] Encounters service sobre `wild_encounters.json` (el más barato: JSON puro, valida la cadena entera sin parser de C). Estado: list/get/update-slot con edición quirúrgica de slots.
- [x] CLI: `hackrom project inspect|build|run|encounters ...`. Verificado contra `projects/pokeemerald-vanilla`.
- [x] Checkpoints git automáticos antes de mutaciones (`encounters.update`, futuros services) y parser de errores gcc/ld estructurado.

**DoD:** desde terminal: editar encounters de una ruta → build → mGBA abre → cambio visible en juego. Verificado local: `MAP_ROUTE101 land_mons[0]` Wurmple→Treecko lvl 5, build SHA1 `f745de3ecd95e7ab768d0c97aa77889f93a5327b`, launch mGBA; luego revertido a vanilla SHA1 `f3ae088181bf583e55daf962a92bb46f4f1d07b7`.

## M2 — Server + Web shell (2 sesiones)

- [x] `apps/server`: Fastify + tRPC v11 + WS (event bus → UI). Estado: health OK, tRPC `projectInspect`/`encountersGet`/`buildRun` verificados contra `projects/pokeemerald-vanilla`.
- [x] `apps/web`: Vite + React + Tailwind; layout base (sidebar de secciones, project switcher). Estado: build Vite OK y dev server responde `200`.
- [x] Dashboard/onboarding liviano: estado del proyecto, toolchain doctor, botón build con logs en vivo, botón emulador.
- [x] Vista encounters (primera vista de edición end-to-end en UI).
- [x] Shell desktop Electron adelantado: `apps/desktop` arranca el server interno, carga la UI build y empaqueta app Mac sin depender de browser/server externo. Incluye selector nativo de carpeta de proyecto vía preload/IPC y persistencia local del último proyecto. Estado: `pnpm dist:desktop:dir` genera `apps/desktop/release/mac-arm64/Decomp Studio.app`; `pnpm dist:desktop` genera `.dmg` + `.zip` Mac sin firmar; smoke test de arranque OK.

**DoD:** flujo del M1 completo pero desde la app desktop. Estado técnico: `pnpm check` + `pnpm build` verde; server+tRPC build verificado; `.app` local abre sin server externo. Falta ejercitar manualmente en la UI: editar encounter, build y run desde la ventana Electron.

## M3 — Editores de datos I: species + moves (2–3 sesiones)

- [x] Parser quirúrgico `species_info.h` + round-trip suite (411 species, diff vacío). Estado: adapter con spans para stats/types/abilities, round-trip byte-for-byte contra vanilla, mutation/revert Treecko `baseAttack` deja diff vacío; core/server/CLI mínimo `species list|get|update-stat`.
- [x] Parser `battle_moves.h` + round-trip. Estado: adapter con spans para effect/power/type/accuracy/pp, round-trip byte-for-byte contra vanilla, mutation/revert `MOVE_POUND.power` deja diff vacío; core/server/CLI mínimo `moves list|get|update-field`.
- [x] Species editor UI: lista editable + form de stats/tipos/abilities. Estado: vista React consume tRPC `speciesList/speciesGet/speciesUpdate` y guarda con checkpoint. Learnsets read-only queda para endurecimiento posterior de M3.
- [x] Move editor UI. Estado: vista React consume tRPC `movesList/movesGet/movesUpdate` y edita effect/power/type/accuracy/pp con checkpoint.
- [x] Validation service v1 (rangos + referencias a constantes). Estado: valida species/moves/types/abilities/effects contra `include/constants/*.h`; bloquea updates inválidos antes de checkpoint/write; CLI/tRPC `validation check`; vanilla devuelve `[]`.

**DoD:** cambiar stats/tipos de un Pokemon y power/accuracy de un move desde UI, build, verificar en juego. Estado técnico: parsers round-trip + UI + validation verdes; falta ejecutar el flujo completo desde Electron y verificar en mGBA.

## M4 — Editores de datos II: trainers + texto (2 sesiones)

- [ ] Parser `trainers.h` + `trainer_parties.h` + round-trip.
- [ ] Trainer editor UI (party, niveles, moves, items, IA flags).
- [ ] Text service: índice global, `search` + `replace` con validación charmap y control codes.
- [ ] Detectar `.pory`/Poryscript si existe; validar/compilar vía tool externo cuando esté instalado, sin DSL propio.
- [ ] Vista search/replace de textos.

**DoD:** rebalancear un líder de gimnasio completo (party + diálogo) desde UI y verificarlo en juego.

## M5 — Map viewer (2–3 sesiones)

- [ ] Decode de tilesets: tiles.png + paletas JASC + metatiles.bin → metatiles compuestos (cache de texturas).
- [ ] Parser map_groups.json / map.json / layouts.json / map.bin (schemas Zod + round-trip de los ~430 mapas).
- [ ] Canvas PixiJS: render de mapa completo, zoom/pan, culling.
- [ ] Overlays: grid, collision, elevation, eventos (read-only), border, connections ghosted.
- [ ] Lista de mapas por grupo con preview.

**DoD:** abrir cualquier mapa de vanilla y verse idéntico a Porymap/juego. Guardar sin editar = diff vacío.

## M6 — Map editing: blockdata (2–3 sesiones)

- [ ] Metatile picker (paleta de metatiles del tileset del mapa).
- [ ] Herramientas: brush, rect, bucket, selección/copy/paste; modo collision/elevation.
- [ ] Undo/redo (command stack) integrado con el resto del Studio.
- [ ] Save de map.bin/border.bin + build + verificación en juego.

**DoD:** modificar el pueblo inicial (pintar casas/árboles/collision), jugar el cambio en mGBA, undo/redo confiable.

## M7 — Map editing: eventos, connections, metadata (2 sesiones)

- [ ] Eventos: crear/mover/editar/borrar NPCs, warps, triggers, bg_events (inspector desde schema, constantes válidas en dropdowns).
- [ ] Connections editor con preview.
- [ ] Metadata del mapa (música, weather, flags) + resize de layout.

**DoD:** mover un NPC y un warp, cambiar la música de un mapa, verificar en juego.

## M8 — Assets: sprites (1–2 sesiones)

- [ ] Export/import de sprites de Pokemon (PNG indexed, validación de paleta 16 colores y dimensiones).
- [ ] Vista de galería con preview de front/back/shiny + icons.

**DoD:** reemplazar el sprite de un starter y verlo en juego.

## M8.5 — Compatibilidad pokeemerald-expansion / RHH (1–2 sesiones)

- [ ] Pinnear commit/tag de `rh-hideout/pokeemerald-expansion` y fixture de CI sin assets externos al repo.
- [ ] `adapter-pokeemerald-expansion` como adapter hermano, no `if` dentro del vanilla.
- [ ] Soportar los dominios ya implementados en 1.0: encounters, species, moves, trainers, textos, mapas y sprites, preservando campos no soportados por edición quirúrgica/spans.
- [ ] Round-trip suite contra RHH para archivos soportados.
- [ ] Project detection muestra capacidades soportadas/no soportadas y bloquea ediciones inseguras.

**DoD:** abrir un proyecto RHH, editar un encounter/species/mapa soportado, build/run en mGBA, y guardar sin editar deja diff vacío en archivos soportados.

## M9 — MCP server (1–2 sesiones)

- [ ] `packages/mcp` según `docs/specs/mcp-server.md` (capa delgada sobre core).
- [ ] Subcomando `hackrom mcp --project <dir>`; probado registrado en Codex y Claude Code.
- [ ] Resources + 2–3 prompts iniciales.

**DoD:** un agente externo edita species/trainers/encounters vía MCP, compila y abre el emulador — con checkpoints automáticos.

## M10 — Release 1.0 (2–3 sesiones)

- [ ] Patcher BPS + builds versionados con metadata.
- [ ] `apps/desktop`: Electron empaquetando server+web; shell Mac + `.dmg`/`.zip` sin firmar ya validado en M2. Falta firma/notarización macOS y builds Windows/Linux en CI (electron-builder + GitHub Actions release).
- [ ] Onboarding: wizard de primer proyecto + toolchain check guiado por OS.
- [ ] Docs de usuario (README con GIFs, guía de instalación por OS) + primera release pública con `.bps` de ejemplo.

**DoD = 1.0 shippeable:** una persona en Windows/Mac/Linux descarga el instalador, abre su clone de pokeemerald, edita Pokemon/trainers/textos/encounters/mapas, compila, juega y exporta un `.bps`. **Acá se cierra el scope de 1.0 — todo lo de abajo es post-1.0.**

## Post-1.0 — camino a hacks nivel HnS/Odyssey (backlog ordenado, NO abrir antes de 1.0)

Con 1.0 se puede hacer un hack completo sobre Hoenn vanilla (nivel Crystal Legacy: rebalance total, trainers, textos, mapas editados, encounters, sprites). Los hacks tipo HnS (demake de región completa) se construyen sobre `pokeemerald-expansion` / Modern Emerald con tilesets y mapas custom — eso requiere, en este orden:

1. **Adapter `pokeemerald-expansion`** (y Modern Emerald como variante) — la mayoría de los hacks modernos viven ahí; es también lo que más amplía el público del tool. Formatos de species/trainers difieren del vanilla: adapter hermano, misma interface.
2. **Import de tilesets custom** (tiles.png + paletas + metatiles) con validación, y luego tileset editor in-app.
3. **Crear mapas desde cero** (registrar en map_groups/layouts) + OW sprites custom — con esto ya se puede construir una región nueva completa.
4. **Editor de scripts de eventos** con validación (evaluar poryscript como formato) — historia y eventos custom.
5. Cries y música. Smoke tests con mGBA Lua en CI. NDS (congelado).

Estimación del tramo 1–4: ~15–20 sesiones adicionales sobre la 1.0.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Toolchain falla en algún OS | M0 lo prueba en Mac; provider Docker es fallback universal; Windows usa WSL como el propio INSTALL.md |
| Parsers de C rompen archivos | Edición quirúrgica por spans + round-trip suite en CI + checkpoint git antes de cada escritura |
| Map editor se estira | Está partido en 3 milestones con DoD propio (viewer → blockdata → eventos); el viewer solo ya valida el 70% del riesgo técnico |
| Formatos difieren en expansion | Adapter separado post-1.0, no ifs en el de vanilla |
| Scope creep | El corte de 1.0 está en M10; backlog explícito para todo lo demás |

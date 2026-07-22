# Spec — Map Editor

El subsistema más pesado del Studio. Objetivo: ver y editar mapas de `pokeemerald` dentro de la app (pintar metatiles, collision/elevation, eventos, connections), guardando en los formatos nativos del decomp con round-trip perfecto.

Referencia de formatos: pret/pokeemerald + código de Porymap (LGPL-3.0 — **solo referencia de lectura, no portar código**; implementación limpia).

## Formatos (verificados contra pret/pokeemerald master, 2026-07-01)

### Registro de mapas y layouts (JSON nativo — sin parsing de C)

- `data/maps/map_groups.json` — índice de todos los mapas por grupo.
- `data/maps/<MapName>/map.json` — verificado; contiene:
  - metadata: `id`, `name`, `layout`, `music`, `weather`, `map_type`, `region_map_section`, flags (`allow_cycling`, `show_map_name`, etc.)
  - `connections[]`: `{ map, offset, direction }` (up/down/left/right)
  - `object_events[]`: NPCs/objetos — `graphics_id`, `x`, `y`, `elevation`, `movement_type`, `trainer_type`, `script`, `flag`
  - `warp_events[]`, `coord_events[]`, `bg_events[]` (warps, triggers, señales/items ocultos)
- `data/layouts/layouts.json` — verificado; por layout: `id`, `name`, `width`, `height`, `primary_tileset`, `secondary_tileset`, `border_filepath`, `blockdata_filepath`.

Todo esto se modela con Zod en `packages/schemas` y se edita como JSON. El build del decomp (`jsonproc`) los convierte a C — no tocamos esa parte.

### Blockdata (binario simple)

- `data/layouts/<Name>/map.bin`: grilla `width × height` de u16 little-endian, uno por metatile:
  - bits 0–9: metatile id (0–1023; <512 = tileset primario, ≥512 = secundario)
  - bits 10–11: collision
  - bits 12–15: elevation
- `border.bin`: bloque 2×2 de metatiles (4 u16) que rellena fuera del mapa.

### Tilesets (`data/tilesets/{primary,secondary}/<name>/`)

- `tiles.png`: tiles de 8×8 px, 4bpp indexed.
- `palettes/00.pal` … : formato JASC-PAL (texto), 16 colores c/u.
- `metatiles.bin`: por metatile, 8 u16 (2 capas × 4 cuadrantes de 8×8). Cada u16: bits 0–9 tile id, bit 10 hflip, bit 11 vflip, bits 12–15 palette.
- `metatile_attributes.bin`: u16 por metatile (behavior + layer type).

⚠️ Constantes exactas (metatiles por tileset primario/secundario, número de paletas primarias/secundarias, encoding fino de attributes) se confirman contra `include/fieldmap.h` del decomp al implementar — no asumir, leer el header y dejar las constantes en el adapter.

## Pipeline de render (PixiJS v8)

1. **Decode tileset**: cargar `tiles.png` (indexed) + paletas JASC → generar texture atlas por (tile, palette) bajo demanda con cache.
2. **Compose metatiles**: por cada metatile id, componer 2 capas × 4 cuadrantes con flips → RenderTexture cacheada de 16×16 px.
3. **Grilla**: sprite/tilemap de `width × height` metatiles desde `map.bin`. Redibujar solo celdas sucias al editar.
4. **Overlays toggleables**: collision (rojo semi-transparente), elevation (número), grid, eventos (markers arrastrables), border, connections (mapas vecinos renderizados ghosted en los bordes).
5. Zoom (25%–400%) y pan (spacebar/middle-drag). Viewport culling para mapas grandes.

## Operaciones de edición

Todas como Commands (con inverse) sobre el command stack de `core`:

- **Paint**: brush 1×1 y N×N, rectángulo, bucket fill, selección-copia-pega de regiones (estilo Porymap: right-click copia el metatile bajo el cursor).
- **Collision/elevation**: modo aparte que pinta bits 10–15 sin tocar el metatile id.
- **Eventos**: crear/mover (drag)/editar/borrar object_events, warps, triggers, bg_events. Inspector de propiedades generado desde el schema Zod (dropdowns con constantes válidas del decomp: `OBJ_EVENT_GFX_*`, `FLAG_*`, scripts existentes).
- **Connections**: editar mapa vecino/offset/dirección con preview visual.
- **Layout**: resize del mapa (rellena con metatile configurable), cambio de tilesets, edición del border.
- **Metadata**: música, weather, map_type, flags — form simple.

Guardar = serializar `map.json` (JSON estable, mismo orden de keys que el decomp) + `map.bin`/`border.bin` (bytes). Round-trip test: abrir y guardar los ~430 mapas de vanilla sin producir ni un byte de diff.

## Qué NO entra en v1 del map editor

- Tileset editor (editar tiles.png/paletas dentro de la app) — v2; mientras tanto se editan con un editor de imágenes y el Studio los recarga.
- Editor visual de scripts de eventos (los `script` se referencian por nombre; edición de `scripts.inc` es texto con validación).
- Crear mapas nuevos desde cero — v1.5 (requiere registrar en map_groups.json, layouts.json, headers; hacerlo después de que editar mapas existentes esté sólido).

## Orden de implementación (mapea a milestones M5–M7 del ROADMAP)

1. Viewer read-only: decode tilesets → render mapa → overlays → zoom/pan. (Valida todo el pipeline sin riesgo de escribir.)
2. Edición de blockdata: paint + collision/elevation + undo + save round-trip.
3. Eventos + connections + metadata + resize.

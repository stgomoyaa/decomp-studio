# Spec — Adapter pokeemerald (parsers/serializers)

El adapter es la única pieza que conoce los archivos del decomp. Expone lectura/escritura tipada a los services de `core`. Pinneado a un commit/tag de `pret/pokeemerald`; `pokeemerald-expansion` será un adapter hermano (formatos difieren — no mezclar con ifs).

## Mapa archivo → service (verificado contra pret/pokeemerald)

| Service | Archivos | Formato |
|---|---|---|
| species | `src/data/pokemon/species_info.h`, `evolution.h`, `level_up_learnsets.h`, `tmhm_learnsets.h`, `egg_moves.h`, `pokedex_text.h` | C |
| moves | `src/data/battle_moves.h` | C |
| trainers | `src/data/trainers.h`, `src/data/trainer_parties.h` | C |
| encounters | `src/data/wild_encounters.json` | **JSON** |
| items | `src/data/items.h` | C |
| text | strings `_("...")` en `src/`, `data/text/`, `*.inc` + `charmap.txt` | C/asm |
| maps | `data/maps/**`, `data/layouts/**`, `data/tilesets/**` | JSON + bin (ver map-editor.md) |
| sprites | `graphics/pokemon/<species>/*.png` + paletas | PNG indexed |
| constants | `include/constants/*.h` | C (solo lectura: fuente de enums válidos) |

## Regla central: edición quirúrgica, no regeneración

Los archivos C NO se regeneran desde un modelo. El parser construye un AST liviano **con spans de posición** (offset inicio/fin de cada valor), y `update` reemplaza solo los bytes del span afectado. Consecuencias:

- Comentarios, whitespace, macros e `#ifdef` del archivo original quedan intactos.
- El round-trip es trivialmente perfecto para todo lo no tocado.
- Un diff de git tras editar un stat muestra UNA línea cambiada — legible para humanos y para el propio agente.

Parsing: los archivos objetivo son C **regular y generado por patrones** (arrays de designated initializers). Parser propio por familia de archivo (regex estructurada + tracking de spans) es suficiente y más controlable que tree-sitter para v1. Si un archivo trae una construcción inesperada, el parser FALLA explícito (error tipado `UnsupportedConstruct`) — jamás adivinar.

## Round-trip testing (contrato del repo)

- Suite `roundtrip.test.ts` por parser: lee TODOS los datos del vanilla pinneado, serializa, exige diff vacío byte a byte.
- Además: mutation round-trip — editar un campo, revertirlo, exigir diff vacío.
- CI clona pret/pokeemerald al commit pinneado (repo público) y corre la suite completa. Un parser sin round-trip verde no se mergea.

## Texto y charmap

- Strings del juego usan encoding propio definido en `charmap.txt` del decomp.
- `text.replace` valida: todos los caracteres existen en el charmap, control codes (`{PLAYER}`, `{STR_VAR_1}`, saltos `\n`/`\l`/`\p`) balanceados, y advierte por largo de línea (ancho de textbox).
- Búsqueda global indexada en memoria (chokidar invalida el índice por archivo).

## Validation service (transversal)

- Referencias cruzadas: species/moves/items/flags/scripts referenciados existen en `include/constants/`.
- Rangos: stats 1–255, niveles 1–100, PP/accuracy/power en rango, party size 1–6.
- Encounters: species válidas, rates coherentes.
- Curva de progresión: niveles de trainers por orden de badges (warning, no error).
- Todo `update` de cualquier service pasa por validation ANTES de escribir; la escritura va precedida de checkpoint git del proyecto.

## Interface (esqueleto)

```ts
interface DecompAdapter {
  readonly base: 'pokeemerald'
  readonly pinnedCommit: string
  detect(projectDir: string): Promise<DetectResult>
  species: EntityStore<Species>
  moves: EntityStore<Move>
  trainers: EntityStore<Trainer>
  encounters: EncounterStore
  maps: MapStore
  text: TextStore
  constants: ConstantsReader
}

interface EntityStore<T> {
  list(): Promise<EntitySummary[]>
  get(id: string): Promise<T>
  update(id: string, patch: Partial<T>): Promise<ChangeSet>  // valida + checkpoint + edición quirúrgica
}
```

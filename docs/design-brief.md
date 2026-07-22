# Design Brief — Decomp Studio (pegar completo en Claude para diseñar la UX/UI)

Eres el diseñador de producto de **Decomp Studio**: una app de escritorio open source, multiplataforma, para crear ROM hacks de Pokemon GBA sobre decomps (pokeemerald). Todo-en-uno: editor de Pokemon, ataques, entrenadores, textos, encounters salvajes, **mapas (tile por tile)** y sprites; compila la ROM, la abre en emulador y exporta patches. Compite contra un flujo fragmentado de 6 herramientas de los 2000s (AdvanceMap, HMA, Porymap, hex editors).

Tu entregable: sistema de diseño + mockups high-fidelity de las 6 pantallas listadas abajo, implementables en React + Tailwind (el canvas de mapas es PixiJS). Genera los mockups como HTML/React funcional, no como descripción.

## Usuarios

1. **Romhacker veterano** (viene de Porymap/HMA): quiere densidad, atajos de teclado, cero fricción. Sesiones de 3+ horas.
2. **Creador nuevo**: sabe lo que quiere hacer ("subir la dificultad del gimnasio 3") pero no conoce los formatos. Necesita que la herramienta le muestre el camino sin tratarlo como niño.

## Dirección estética — LEER CON CUIDADO

Esto es una **herramienta profesional de escritorio**, no un sitio web ni un SaaS. La referencia de clase es: **Aseprite, Tiled, Blender, Figma, VS Code, Linear**. Especialmente Aseprite y Tiled — herramientas de pixel art/tiles queridas por su oficio.

**Prohibido (estética "AI slop" — descalifica el trabajo):**
- Gradientes morados/índigo/rosa, glassmorphism, blobs 3D flotantes, glows.
- Hero sections, landing-page layouts, cards con `rounded-2xl shadow-soft` por todos lados.
- Emojis como iconografía. Iconos de "sparkles/magia" para features de IA.
- Ilustraciones genéricas en empty states. Texto con gradiente. Excesivo whitespace decorativo.
- Onboarding con confetti, tooltips invasivos, tono infantil.

**En su lugar:**
- **Workbench oscuro y neutro por defecto** (light mode como variante): el contenido del juego (sprites, tiles, mapas GBA a color) ES el color de la interfaz; el chrome se queda atrás en grises fríos calibrados. UN solo color de acento funcional (elige tú; ni morado ni el rojo Pokemon).
- Densidad de información tipo IDE: paneles acoplables, filas compactas, tablas reales.
- Bordes de 1px y jerarquía por contraste/tipografía, no por sombras.
- Tipografía: una sans neutra para UI + **monospace para IDs, constantes del decomp (`SPECIES_TREECKO`, `MAP_PETALBURG_CITY`), coordenadas, offsets y logs**. Los datos técnicos se ven como datos técnicos.
- Pixel art renderizado crisp (`image-rendering: pixelated`), nunca suavizado; checkerboard sutil para transparencia; los sprites GBA se muestran a escala entera (2x, 3x), jamás escalados fraccional.
- Micro-detalles de oficio: estados de foco visibles, hit targets ≥28px en toolbars, scrollbars finos estilizados, atajos visibles en tooltips y menús.

## Arquitectura de información

Shell persistente:
- **Sidebar izquierda** (iconos + labels, colapsable): Dashboard, Pokemon, Moves, Trainers, Maps, Encounters, Text, Sprites, Builds & Patches, Settings.
- **Barra superior**: project switcher, indicador de toolchain (verde/rojo), botón **Build & Run** (siempre visible, con estado: idle/compilando con progreso/error), indicador de validación, historial de checkpoints (undo grueso).
- **Command palette** (Cmd/Ctrl+K): saltar a cualquier entidad ("tree" → Treecko, Route 101…), acciones.
- **Status bar inferior**: contexto de la vista activa (en mapas: coordenadas, metatile id bajo cursor, zoom).

## Pantallas a diseñar (mockup high-fi de cada una)

1. **Dashboard**: estado del proyecto (base, commit pinneado, toolchain check con fix sugerido si falla), últimos cambios (desde git), accesos rápidos, último build (hash, fecha, botón re-run).
2. **Species editor**: master-detail. Lista virtual (411 filas) con sprite icon, nombre, tipos, BST; búsqueda y filtros por tipo/stats. Detalle: sprite front/back/shiny a escala entera, stats con inputs + barras comparativas, tipos/abilities/items con dropdowns de constantes válidas, learnset como tabla. Todo editable inline, indicador de "dirty" y guardado.
3. **Trainer editor**: lista de trainers con filtros (clase, mapa, badge). Detalle: 6 slots de party visuales (sprite + nivel + item + 4 moves cada uno), IA flags, prize money. Warnings de validación inline (ej: nivel fuera de curva).
4. **Map editor** (la pantalla más importante — trátala como Tiled/Aseprite):
   - Izquierda: árbol de mapas por grupo, con búsqueda.
   - Centro: canvas del mapa con zoom/pan, toolbar vertical de herramientas (pointer, brush, rect, bucket, selección; modo metatile/collision/elevation/eventos), toggles de overlays (grid, collision, elevation, eventos, border, connections).
   - Derecha: inspector contextual — propiedades del mapa (música, weather, tipo) o del evento seleccionado (NPC: gfx, movimiento, script, flag).
   - Dock inferior: **metatile picker** — la paleta de tiles del tileset del mapa, con selección visible y recientes.
   - Status bar: x/y, metatile id, zoom.
5. **Build & Patches**: log de build en vivo (monospace, colapsable por etapa, errores clickeables con file:line), historial de builds versionados, exportar `.bps`.
6. **Text search/replace**: búsqueda global con resultados agrupados por archivo, preview con highlight, replace con validación (charmap/largo) y diff antes de aplicar.

## Flujos clave que el diseño debe hacer evidentes

- **El loop sagrado: editar → Build & Run → ver en emulador.** Debe sentirse a un click/atajo desde CUALQUIER vista. Feedback de progreso honesto (el primer build tarda minutos; los incrementales, segundos).
- **Confianza para experimentar**: undo/redo por vista + checkpoints del proyecto visibles y restaurables. El usuario nunca debe temer romper su hack.
- **Validación no bloqueante**: warnings inline y un panel agregado, nunca modales que interrumpen.
- **Estados**: proyecto cargando (parsing), build corriendo, error de build, cambios sin guardar, archivo cambiado en disco por otra herramienta (ofrecer recargar).

## Entregables, en orden

1. **Design tokens**: paleta dark + light (grises calibrados, acento, semánticos error/warning/success), escala tipográfica, spacing en grilla de 4px, radios (contenidos: 4–6px máx), definidos como variables CSS/Tailwind.
2. **Inventario de componentes**: sidebar, toolbar, inspector panel, tabla/lista virtual, form controls (input numérico con stepper, dropdown de constantes con búsqueda, tag de tipo Pokemon), tabs, tooltip con atajo, toast, diff viewer, log viewer, canvas chrome (zoom controls, minimap opcional).
3. **Los 6 mockups** en HTML/React con datos realistas de pokeemerald (Treecko, Route 101, Roxanne — nada de lorem ipsum).
4. **Notas de interacción**: atajos de teclado por vista, comportamiento de drag en canvas, focus management.

Empieza por los tokens y el shell (sidebar + topbar + una vista vacía) para fijar el lenguaje visual, y sigue con el Map editor, que es donde se gana o pierde la credibilidad de la herramienta.

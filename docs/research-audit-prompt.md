# Prompt — Deep audit del ecosistema romhacking (pegar en GPT deep research)

Investiga el ecosistema de Pokémon ROM hacking a hoy (2026), con fuentes citadas. Contexto: estoy construyendo un tool desktop open source todo-en-uno para hacking sobre decomps GBA (pret/pokeemerald): editores de mapas/trainers/species/textos/sprites + build + emulador + MCP server. Necesito validar el alcance contra la práctica real antes de construir.

Responde estas 5 preguntas, cada claim con URL y fecha de la fuente, distinguiendo hecho verificado vs opinión de foro:

1. **Bases/engines**: adopción real de `pokeemerald-expansion` (rh-hideout, última versión y cadencia) vs `pokeemerald` vanilla vs `pokefirered`/expansion; Modern Emerald (Resetes12) y otras QoL bases usadas como punto de partida; ¿la ruta binaria (CFRU+DPE, HexManiacAdvance) sigue usándose para hacks NUEVOS o es legacy?; bases nuevas 2025–2026.

2. **Tooling estándar y su mantención**: Porymap, Poryscript, Porytiles (¿es el estándar para tilesets custom?), Tilemap Studio, HexManiacAdvance, mGBA (versión, scripting), música (midi2agb / motor m4a), y repositorios canónicos de assets (DS-style 64x64 Sprite Repository, packs gen 6+, overworlds). Por cada uno: versión, ¿mantenido en 2025–2026?, plataformas (Windows/Mac/Linux), rol en el workflow.

3. **Créditos de hacks 2024–2026**: base y tools que acreditan Unbound, Radical Red, Emerald Rogue, HnS, Odyssey, Lazarus, Crystal/Emerald Legacy, Inclement Emerald, Elite Redux, Emerald Seaglass y los destacados de los threads "hack of the year" de r/PokemonROMhacks. Proporción aproximada GBA decomp vs GBA binario vs NDS vs GBC en lo que está trending.

4. **Tooling emergente y competencia**: ¿existe algún all-in-one (GUI que unifique mapas+trainers+species+build para decomp) publicado o en desarrollo? Buscar en GitHub ("pokeemerald GUI/editor", "decomp editor"), PokéCommunity tool showcase, itch.io. ¿Herramientas con IA/LLM/MCP para romhacking 2025–2026? ¿Editores web? Si NO existe competencia all-in-one, decirlo explícito — es un hallazgo clave.

5. **Pain points de la comunidad**: fricción del setup decomp (WSL/devkitARM/agbcc — ¿cuánta gente abandona ahí?), workflow de tilesets, curva de scripting, tools esenciales que siguen siendo Windows-only, quejas por fragmentación de herramientas, y qué recomiendan las guías "cómo empezar en 2025/2026" (¿decomp o binario para novatos?). Rankear por frecuencia. Wishlists explícitas de "herramienta soñada" si existen.

Fuentes prioritarias: PokéCommunity (ROM Hacking), r/PokemonROMhacks, GitHub de pret/rh-hideout/huderlem, Team Aqua's Hideout, docs y créditos de los hacks.

Entregable: reporte en español con las 5 secciones + una sección final "Implicancias para el scope del tool" (qué agregar, qué cortar, qué priorizar distinto).

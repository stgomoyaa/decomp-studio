# Spec — Toolchain y emulador multiplataforma

Compilar pokeemerald requiere entorno unix (make, agbcc/devkitARM, libpng). La app NO auto-instala en v1: `toolchain.check` diagnostica y guía; la instalación la hace el usuario siguiendo el INSTALL.md del decomp (o nuestro doc con los mismos pasos).

## Estrategia por OS: interface ToolchainProvider

```ts
interface ToolchainProvider {
  id: 'native' | 'wsl' | 'docker'
  check(): Promise<ToolchainStatus>        // qué falta, versiones, instrucciones
  exec(projectDir: string, cmd: string[], onOutput: (line: string) => void): Promise<ExecResult>
  translatePath(hostPath: string): string  // identidad en native; /mnt/c/... en WSL; /work en docker
}
```

| OS | Provider default | Detalle |
|---|---|---|
| macOS | `native` | Homebrew + libpng + devkitARM según INSTALL.md oficial (sección macOS verificada). `make -j$(sysctl -n hw.ncpu)` |
| Linux | `native` | apt/pacman deps según INSTALL.md |
| Windows | `wsl` | pokeemerald oficialmente se compila vía WSL1/2 o msys2. El Studio (proceso Windows) detecta WSL (`wsl.exe -l`), ejecuta `wsl.exe -e make ...` dentro del distro, traduce paths (`C:\...` ↔ `/mnt/c/...`). Proyectos DEBEN vivir en el FS de Windows para que la UI los lea directo |
| Cualquiera / CI | `docker` | Imagen `devkitpro/devkitarm` + deps; monta el proyecto en `/work`. Fallback universal si native/wsl fallan, y el provider que usa GitHub Actions |

`project.json` guarda el provider elegido; `toolchain.check` corre al abrir proyecto y el dashboard muestra estado (verde/rojo con fix sugerido).

## Build service

- `build.run`: spawnea make vía provider, streamea stdout/stderr por event bus (WS a la UI, notificación en MCP), parsea errores de gcc/ld a estructura `{ file, line, message }` clickeable.
- `build.clean`, `build.rom_path`, hash SHA1 del artefacto para versionado.
- Primer build es lento (minutos); incrementales son rápidos. Mostrar progreso, no congelar UI.

## Emulator service (mGBA)

- mGBA tiene builds oficiales para los 3 OS.
- Launch: macOS `open -a mGBA <rom>` o binario directo; Windows/Linux path al ejecutable (configurable en settings, con autodetección en paths típicos).
- Futuro (no v1): mGBA ≥0.10 trae scripting Lua — habilita smoke tests automatizados (bootea, llega al overworld) en CI.

## Patcher service

- BPS: vanilla ROM del usuario (la provee él, nunca la app) vs build actual → `.bps`.
- Implementación: binario de Flips embebido por plataforma o lib JS de encoding BPS — decidir en el milestone según qué esté más maduro; la interface no cambia.
- `builds/` versionado: `{ fecha, git ref del proyecto, sha1 rom, notas }`.

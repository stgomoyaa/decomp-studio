import path from "node:path";
import { getRomPath } from "./build.js";
import { pathExists } from "./fs.js";
import { execFile } from "./process.js";

export async function launchEmulator(projectDir: string): Promise<string> {
  const romPath = await getRomPath(projectDir);
  if (romPath === null || !(await pathExists(romPath))) {
    throw new Error("No pokeemerald.gba found. Run build first.");
  }

  if (process.platform === "darwin") {
    const result = await execFile(["open", "-a", "mGBA", romPath], {
      cwd: path.resolve(projectDir),
    });
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || "Failed to open mGBA.");
    }
    return romPath;
  }

  const result = await execFile(["mgba", romPath], { cwd: path.resolve(projectDir) });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to launch mgba.");
  }
  return romPath;
}

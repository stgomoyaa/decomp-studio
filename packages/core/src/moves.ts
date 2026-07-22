import { readFile, writeFile } from "node:fs/promises";
import {
  BATTLE_MOVES_PATH,
  parseBattleMovesFile,
  patchBattleMovesText,
  type BattleMoveFields,
  type BattleMovePatch,
} from "@decomp-studio/adapter-pokeemerald";
import { resolveInside } from "./fs.js";
import { createGitCheckpoint } from "./project.js";
import { assertValidMovePatch } from "./validation.js";

export interface MoveSummary extends BattleMoveFields {
  readonly id: string;
}

export async function listMoves(projectDir: string): Promise<MoveSummary[]> {
  const parsed = parseBattleMovesFile(await readBattleMoves(projectDir));
  return parsed.entries.map((entry) => ({ id: entry.id, ...entry.fields }));
}

export async function getMove(projectDir: string, id: string): Promise<MoveSummary | null> {
  const parsed = parseBattleMovesFile(await readBattleMoves(projectDir));
  const entry = parsed.entries.find((candidate) => candidate.id === id);
  if (entry === undefined) {
    return null;
  }
  return { id: entry.id, ...entry.fields };
}

export async function updateMove(projectDir: string, patch: BattleMovePatch): Promise<MoveSummary> {
  await assertValidMovePatch(projectDir, patch);
  const filePath = resolveInside(projectDir, BATTLE_MOVES_PATH);
  const raw = await readFile(filePath, "utf8");
  const nextRaw = patchBattleMovesText(raw, patch);
  parseBattleMovesFile(nextRaw);

  await createGitCheckpoint(projectDir, `moves.update ${patch.id}`);
  await writeFile(filePath, nextRaw, "utf8");

  const updated = await getMove(projectDir, patch.id);
  if (updated === null) {
    throw new Error(`Move not found after update: ${patch.id}`);
  }
  return updated;
}

async function readBattleMoves(projectDir: string): Promise<string> {
  return readFile(resolveInside(projectDir, BATTLE_MOVES_PATH), "utf8");
}

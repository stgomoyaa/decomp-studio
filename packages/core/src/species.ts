import { readFile, writeFile } from "node:fs/promises";
import {
  patchSpeciesInfoText,
  parseSpeciesInfoFile,
  SPECIES_INFO_PATH,
  type SpeciesInfoFields,
  type SpeciesInfoPatch,
} from "@decomp-studio/adapter-pokeemerald";
import { resolveInside } from "./fs.js";
import { createGitCheckpoint } from "./project.js";
import { assertValidSpeciesPatch } from "./validation.js";

export interface SpeciesSummary extends SpeciesInfoFields {
  readonly id: string;
  readonly editable: boolean;
}

export async function listSpecies(projectDir: string): Promise<SpeciesSummary[]> {
  const parsed = parseSpeciesInfoFile(await readSpeciesInfo(projectDir));
  return parsed.entries.map((entry) => ({
    id: entry.id,
    editable: entry.initializerKind === "object",
    ...entry.fields,
  }));
}

export async function getSpecies(projectDir: string, id: string): Promise<SpeciesSummary | null> {
  const parsed = parseSpeciesInfoFile(await readSpeciesInfo(projectDir));
  const entry = parsed.entries.find((candidate) => candidate.id === id);
  if (entry === undefined) {
    return null;
  }
  return {
    id: entry.id,
    editable: entry.initializerKind === "object",
    ...entry.fields,
  };
}

export async function updateSpecies(projectDir: string, patch: SpeciesInfoPatch): Promise<SpeciesSummary> {
  await assertValidSpeciesPatch(projectDir, patch);
  const filePath = resolveInside(projectDir, SPECIES_INFO_PATH);
  const raw = await readFile(filePath, "utf8");
  const nextRaw = patchSpeciesInfoText(raw, patch);
  parseSpeciesInfoFile(nextRaw);

  await createGitCheckpoint(projectDir, `species.update ${patch.id}`);
  await writeFile(filePath, nextRaw, "utf8");

  const updated = await getSpecies(projectDir, patch.id);
  if (updated === null) {
    throw new Error(`Species not found after update: ${patch.id}`);
  }
  return updated;
}

async function readSpeciesInfo(projectDir: string): Promise<string> {
  return readFile(resolveInside(projectDir, SPECIES_INFO_PATH), "utf8");
}

import { readFile } from "node:fs/promises";
import {
  BATTLE_MOVES_PATH,
  parseBattleMovesFile,
  parseSpeciesInfoFile,
  SPECIES_INFO_PATH,
  type BattleMoveFields,
  type BattleMovePatch,
  type SpeciesInfoFields,
  type SpeciesInfoPatch,
} from "@decomp-studio/adapter-pokeemerald";
import { resolveInside } from "./fs.js";

export type ValidationSeverity = "error" | "warning";

export interface ValidationDiagnostic {
  readonly severity: ValidationSeverity;
  readonly file: string;
  readonly entityId: string;
  readonly field: string;
  readonly message: string;
}

interface ConstantSets {
  readonly species: ReadonlySet<string>;
  readonly moves: ReadonlySet<string>;
  readonly types: ReadonlySet<string>;
  readonly abilities: ReadonlySet<string>;
  readonly effects: ReadonlySet<string>;
}

export async function validateProject(projectDir: string): Promise<ValidationDiagnostic[]> {
  const constants = await readConstantSets(projectDir);
  const diagnostics: ValidationDiagnostic[] = [];
  const speciesRaw = await readFile(resolveInside(projectDir, SPECIES_INFO_PATH), "utf8");
  const movesRaw = await readFile(resolveInside(projectDir, BATTLE_MOVES_PATH), "utf8");

  for (const entry of parseSpeciesInfoFile(speciesRaw).entries) {
    diagnostics.push(...validateSpeciesFields(constants, entry.id, entry.fields));
  }
  for (const entry of parseBattleMovesFile(movesRaw).entries) {
    diagnostics.push(...validateMoveFields(constants, entry.id, entry.fields));
  }

  return diagnostics;
}

export async function validateSpeciesPatch(projectDir: string, patch: SpeciesInfoPatch): Promise<ValidationDiagnostic[]> {
  return validateSpeciesFields(await readConstantSets(projectDir), patch.id, patch);
}

export async function validateMovePatch(projectDir: string, patch: BattleMovePatch): Promise<ValidationDiagnostic[]> {
  return validateMoveFields(await readConstantSets(projectDir), patch.id, patch);
}

export async function assertValidSpeciesPatch(projectDir: string, patch: SpeciesInfoPatch): Promise<void> {
  throwIfErrors(await validateSpeciesPatch(projectDir, patch));
}

export async function assertValidMovePatch(projectDir: string, patch: BattleMovePatch): Promise<void> {
  throwIfErrors(await validateMovePatch(projectDir, patch));
}

function validateSpeciesFields(constants: ConstantSets, id: string, fields: SpeciesInfoFields & { readonly id?: string }): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!constants.species.has(id)) {
    diagnostics.push(error(SPECIES_INFO_PATH, id, "id", `Unknown species constant: ${id}`));
  }

  pushRangeDiagnostics(diagnostics, SPECIES_INFO_PATH, id, "baseHP", fields.baseHP, 1, 255);
  pushRangeDiagnostics(diagnostics, SPECIES_INFO_PATH, id, "baseAttack", fields.baseAttack, 1, 255);
  pushRangeDiagnostics(diagnostics, SPECIES_INFO_PATH, id, "baseDefense", fields.baseDefense, 1, 255);
  pushRangeDiagnostics(diagnostics, SPECIES_INFO_PATH, id, "baseSpeed", fields.baseSpeed, 1, 255);
  pushRangeDiagnostics(diagnostics, SPECIES_INFO_PATH, id, "baseSpAttack", fields.baseSpAttack, 1, 255);
  pushRangeDiagnostics(diagnostics, SPECIES_INFO_PATH, id, "baseSpDefense", fields.baseSpDefense, 1, 255);

  for (const type of fields.types ?? []) {
    if (!constants.types.has(type)) {
      diagnostics.push(error(SPECIES_INFO_PATH, id, "types", `Unknown type constant: ${type}`));
    }
  }
  for (const ability of fields.abilities ?? []) {
    if (!constants.abilities.has(ability)) {
      diagnostics.push(error(SPECIES_INFO_PATH, id, "abilities", `Unknown ability constant: ${ability}`));
    }
  }

  return diagnostics;
}

function validateMoveFields(constants: ConstantSets, id: string, fields: BattleMoveFields & { readonly id?: string }): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!constants.moves.has(id)) {
    diagnostics.push(error(BATTLE_MOVES_PATH, id, "id", `Unknown move constant: ${id}`));
  }

  pushRangeDiagnostics(diagnostics, BATTLE_MOVES_PATH, id, "power", fields.power, 0, 255);
  pushRangeDiagnostics(diagnostics, BATTLE_MOVES_PATH, id, "accuracy", fields.accuracy, 0, 100);
  pushRangeDiagnostics(diagnostics, BATTLE_MOVES_PATH, id, "pp", fields.pp, 0, 64);

  if (fields.effect !== undefined && !constants.effects.has(fields.effect)) {
    diagnostics.push(error(BATTLE_MOVES_PATH, id, "effect", `Unknown move effect constant: ${fields.effect}`));
  }
  if (fields.type !== undefined && !constants.types.has(fields.type)) {
    diagnostics.push(error(BATTLE_MOVES_PATH, id, "type", `Unknown type constant: ${fields.type}`));
  }

  return diagnostics;
}

function pushRangeDiagnostics(
  diagnostics: ValidationDiagnostic[],
  file: string,
  entityId: string,
  field: string,
  value: number | undefined,
  min: number,
  max: number,
): void {
  if (value === undefined) {
    return;
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    diagnostics.push(error(file, entityId, field, `${field} must be an integer between ${String(min)} and ${String(max)}.`));
  }
}

async function readConstantSets(projectDir: string): Promise<ConstantSets> {
  const [species, moves, types, abilities, effects] = await Promise.all([
    readConstants(projectDir, "include/constants/species.h", "SPECIES_"),
    readConstants(projectDir, "include/constants/moves.h", "MOVE_"),
    readConstants(projectDir, "include/constants/pokemon.h", "TYPE_"),
    readConstants(projectDir, "include/constants/abilities.h", "ABILITY_"),
    readConstants(projectDir, "include/constants/battle_move_effects.h", "EFFECT_"),
  ]);
  return { species, moves, types, abilities, effects };
}

async function readConstants(projectDir: string, relativePath: string, prefix: string): Promise<ReadonlySet<string>> {
  const raw = await readFile(resolveInside(projectDir, relativePath), "utf8");
  const constants = new Set<string>();
  const pattern = new RegExp(`^\\s*#define\\s+(${prefix}[A-Z0-9_]+)\\b`, "gm");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    if (match[1] !== undefined) {
      constants.add(match[1]);
    }
  }
  return constants;
}

function throwIfErrors(diagnostics: readonly ValidationDiagnostic[]): void {
  const firstError = diagnostics.find((diagnostic) => diagnostic.severity === "error");
  if (firstError !== undefined) {
    throw new Error(firstError.message);
  }
}

function error(file: string, entityId: string, field: string, message: string): ValidationDiagnostic {
  return { severity: "error", file, entityId, field, message };
}

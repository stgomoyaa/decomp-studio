#!/usr/bin/env node
import {
  checkNativeToolchain,
  getEncounter,
  getMove,
  initProject,
  inspectProject,
  launchEmulator,
  listEncounters,
  listMoves,
  listSpecies,
  openProject,
  runBuild,
  updateEncounterSlot,
  updateMove,
  getSpecies,
  updateSpecies,
  validateProject,
} from "@decomp-studio/core";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [section, command, ...rest] = args;

  try {
    if (section === "project" && command === "inspect") {
      printJson(await inspectProject(requiredArg(rest, 0, "projectDir")));
      return;
    }
    if (section === "project" && command === "init") {
      printJson(await initProject(requiredArg(rest, 0, "projectDir"), rest[1]));
      return;
    }
    if (section === "project" && command === "open") {
      printJson(await openProject(requiredArg(rest, 0, "projectDir")));
      return;
    }
    if (section === "toolchain" && command === "check") {
      printJson(await checkNativeToolchain(rest[0]));
      return;
    }
    if (section === "build" && command === "run") {
      const result = await runBuild(requiredArg(rest, 0, "projectDir"), (line) => {
        process.stdout.write(line);
      });
      printJson({
        exitCode: result.exitCode,
        romPath: result.romPath,
        romSha1: result.romSha1,
        diagnostics: result.diagnostics,
      });
      process.exitCode = result.exitCode;
      return;
    }
    if (section === "run") {
      printJson({ romPath: await launchEmulator(requiredArg([command, ...rest], 0, "projectDir")) });
      return;
    }
    if (section === "encounters" && command === "list") {
      printJson(await listEncounters(requiredArg(rest, 0, "projectDir")));
      return;
    }
    if (section === "encounters" && command === "get") {
      printJson(await getEncounter(requiredArg(rest, 0, "projectDir"), requiredArg(rest, 1, "map")));
      return;
    }
    if (section === "encounters" && command === "update-slot") {
      const [projectDir, map, slotType, slotIndex, species, minLevel, maxLevel] = rest;
      printJson(
        await updateEncounterSlot(required(projectDir, "projectDir"), {
          map: required(map, "map"),
          slotType: parseSlotType(required(slotType, "slotType")),
          slotIndex: parseInteger(required(slotIndex, "slotIndex"), "slotIndex"),
          species,
          minLevel: minLevel === undefined ? undefined : parseInteger(minLevel, "minLevel"),
          maxLevel: maxLevel === undefined ? undefined : parseInteger(maxLevel, "maxLevel"),
        }),
      );
      return;
    }
    if (section === "species" && command === "list") {
      printJson(await listSpecies(requiredArg(rest, 0, "projectDir")));
      return;
    }
    if (section === "species" && command === "get") {
      printJson(await getSpecies(requiredArg(rest, 0, "projectDir"), requiredArg(rest, 1, "species")));
      return;
    }
    if (section === "species" && command === "update-stat") {
      const [projectDir, species, field, value] = rest;
      printJson(await updateSpecies(
        required(projectDir, "projectDir"),
        speciesStatPatch(required(species, "species"), parseSpeciesStatField(required(field, "field")), parseInteger(required(value, "value"), "value")),
      ));
      return;
    }
    if (section === "moves" && command === "list") {
      printJson(await listMoves(requiredArg(rest, 0, "projectDir")));
      return;
    }
    if (section === "moves" && command === "get") {
      printJson(await getMove(requiredArg(rest, 0, "projectDir"), requiredArg(rest, 1, "move")));
      return;
    }
    if (section === "moves" && command === "update-field") {
      const [projectDir, move, field, value] = rest;
      printJson(await updateMove(
        required(projectDir, "projectDir"),
        movePatch(required(move, "move"), parseMoveField(required(field, "field")), required(value, "value")),
      ));
      return;
    }
    if (section === "validation" && command === "check") {
      const diagnostics = await validateProject(requiredArg(rest, 0, "projectDir"));
      printJson(diagnostics);
      process.exitCode = diagnostics.some((diagnostic) => diagnostic.severity === "error") ? 1 : 0;
      return;
    }

    printUsage();
    process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

function requiredArg(args: readonly (string | undefined)[], index: number, name: string): string {
  return required(args[index], name);
}

function required(value: string | undefined, name: string): string {
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function parseInteger(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer.`);
  }
  return parsed;
}

function parseSlotType(value: string) {
  if (
    value === "land_mons" ||
    value === "water_mons" ||
    value === "rock_smash_mons" ||
    value === "fishing_mons"
  ) {
    return value;
  }
  throw new Error(`Invalid slotType: ${value}`);
}

type SpeciesStatField = "baseHP" | "baseAttack" | "baseDefense" | "baseSpeed" | "baseSpAttack" | "baseSpDefense";

function parseSpeciesStatField(value: string): SpeciesStatField {
  if (
    value === "baseHP" ||
    value === "baseAttack" ||
    value === "baseDefense" ||
    value === "baseSpeed" ||
    value === "baseSpAttack" ||
    value === "baseSpDefense"
  ) {
    return value;
  }
  throw new Error(`Invalid species stat field: ${value}`);
}

function speciesStatPatch(id: string, field: SpeciesStatField, value: number) {
  switch (field) {
    case "baseHP":
      return { id, baseHP: value };
    case "baseAttack":
      return { id, baseAttack: value };
    case "baseDefense":
      return { id, baseDefense: value };
    case "baseSpeed":
      return { id, baseSpeed: value };
    case "baseSpAttack":
      return { id, baseSpAttack: value };
    case "baseSpDefense":
      return { id, baseSpDefense: value };
  }
}

type MoveField = "effect" | "power" | "type" | "accuracy" | "pp";

function parseMoveField(value: string): MoveField {
  if (value === "effect" || value === "power" || value === "type" || value === "accuracy" || value === "pp") {
    return value;
  }
  throw new Error(`Invalid move field: ${value}`);
}

function movePatch(id: string, field: MoveField, value: string) {
  switch (field) {
    case "effect":
      return { id, effect: value };
    case "power":
      return { id, power: parseInteger(value, "power") };
    case "type":
      return { id, type: value };
    case "accuracy":
      return { id, accuracy: parseInteger(value, "accuracy") };
    case "pp":
      return { id, pp: parseInteger(value, "pp") };
  }
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function printUsage(): void {
  console.error(`Usage:
  hackrom project inspect <projectDir>
  hackrom project init <projectDir> [name]
  hackrom project open <projectDir>
  hackrom toolchain check [cwd]
  hackrom build run <projectDir>
  hackrom run <projectDir>
  hackrom encounters list <projectDir>
  hackrom encounters get <projectDir> <MAP_ID>
  hackrom encounters update-slot <projectDir> <MAP_ID> <slotType> <slotIndex> [SPECIES] [minLevel] [maxLevel]
  hackrom species list <projectDir>
  hackrom species get <projectDir> <SPECIES>
  hackrom species update-stat <projectDir> <SPECIES> <baseHP|baseAttack|baseDefense|baseSpeed|baseSpAttack|baseSpDefense> <value>
  hackrom moves list <projectDir>
  hackrom moves get <projectDir> <MOVE>
  hackrom moves update-field <projectDir> <MOVE> <effect|power|type|accuracy|pp> <value>
  hackrom validation check <projectDir>`);
}

void main();

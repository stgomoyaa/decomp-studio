import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import {
  encounterPatchSchema,
  type EncounterPatch,
  type EncounterSlotType,
  type WildEncounterEntry,
  wildEncountersFileSchema,
} from "@decomp-studio/schemas";
import { readJsonFile, resolveInside } from "./fs.js";
import { createGitCheckpoint } from "./project.js";

const WILD_ENCOUNTERS_PATH = "src/data/wild_encounters.json";

export interface EncounterSummary {
  readonly map: string;
  readonly slots: readonly EncounterSlotType[];
}

export async function listEncounters(projectDir: string): Promise<EncounterSummary[]> {
  const data = await readWildEncounters(projectDir);
  return data.wild_encounter_groups.flatMap((group) =>
    group.encounters
      .filter(hasMap)
      .map((entry) => ({
        map: entry.map,
        slots: (["land_mons", "water_mons", "rock_smash_mons", "fishing_mons"] as const).filter(
          (slotType) => entry[slotType] !== undefined,
        ),
      })),
  );
}

export async function getEncounter(
  projectDir: string,
  map: string,
): Promise<WildEncounterEntry | null> {
  const data = await readWildEncounters(projectDir);
  for (const group of data.wild_encounter_groups) {
    const found = group.encounters.find((entry) => entry.map === map);
    if (found !== undefined) {
      return found;
    }
  }
  return null;
}

export async function updateEncounterSlot(
  projectDir: string,
  rawPatch: EncounterPatch,
): Promise<WildEncounterEntry> {
  const patch = encounterPatchSchema.parse(rawPatch);
  const filePath = resolveInside(projectDir, WILD_ENCOUNTERS_PATH);
  const raw = await readFile(filePath, "utf8");
  const data = wildEncountersFileSchema.parse(JSON.parse(raw) as unknown);

  for (const group of data.wild_encounter_groups) {
    const entry = group.encounters.find((candidate) => candidate.map === patch.map);
    if (entry === undefined) {
      continue;
    }
    const table = entry[patch.slotType];
    if (table === undefined) {
      throw new Error(`${patch.map} has no ${patch.slotType} table.`);
    }
    const mon = table.mons[patch.slotIndex];
    if (mon === undefined) {
      throw new Error(`${patch.slotType}[${String(patch.slotIndex)}] does not exist for ${patch.map}.`);
    }
    if (patch.species !== undefined) {
      mon.species = patch.species;
    }
    if (patch.minLevel !== undefined) {
      mon.min_level = patch.minLevel;
    }
    if (patch.maxLevel !== undefined) {
      mon.max_level = patch.maxLevel;
    }
    if (mon.min_level > mon.max_level) {
      throw new Error("minLevel cannot be greater than maxLevel.");
    }
    await createGitCheckpoint(projectDir, `encounters.update ${patch.map} ${patch.slotType}[${String(patch.slotIndex)}]`);
    const nextRaw = patchEncounterText(raw, patch);
    wildEncountersFileSchema.parse(JSON.parse(nextRaw) as unknown);
    await writeFile(filePath, nextRaw, "utf8");
    return entry;
  }

  throw new Error(`Encounter map not found: ${patch.map}`);
}

async function readWildEncounters(projectDir: string) {
  const raw = await readJsonFile(path.join(projectDir, WILD_ENCOUNTERS_PATH));
  return wildEncountersFileSchema.parse(raw);
}

function hasMap(entry: WildEncounterEntry): entry is WildEncounterEntry & { map: string } {
  return typeof entry.map === "string";
}

function patchEncounterText(raw: string, patch: EncounterPatch): string {
  const mapIndex = raw.indexOf(`"map": "${patch.map}"`);
  if (mapIndex === -1) {
    throw new Error(`Encounter map not found in source text: ${patch.map}`);
  }

  const slotIndex = raw.indexOf(`"${patch.slotType}":`, mapIndex);
  if (slotIndex === -1) {
    throw new Error(`${patch.map} has no ${patch.slotType} table in source text.`);
  }

  const monsIndex = raw.indexOf(`"mons": [`, slotIndex);
  if (monsIndex === -1) {
    throw new Error(`${patch.slotType} has no mons array in source text.`);
  }

  const monRange = findArrayObjectRange(raw, monsIndex, patch.slotIndex);
  let next = raw;
  if (patch.species !== undefined) {
    next = replaceJsonStringField(next, monRange, "species", patch.species);
  }
  if (patch.minLevel !== undefined) {
    next = replaceJsonNumberField(next, monRange, "min_level", patch.minLevel);
  }
  if (patch.maxLevel !== undefined) {
    next = replaceJsonNumberField(next, monRange, "max_level", patch.maxLevel);
  }
  return next;
}

function findArrayObjectRange(
  raw: string,
  monsIndex: number,
  targetObjectIndex: number,
): { start: number; end: number } {
  const arrayStart = raw.indexOf("[", monsIndex);
  if (arrayStart === -1) {
    throw new Error("Could not find mons array start.");
  }

  let depth = 0;
  let currentObjectIndex = -1;
  let objectStart = -1;
  let inString = false;
  let escaped = false;

  for (let index = arrayStart + 1; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === undefined) {
      break;
    }
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (depth === 0) {
        currentObjectIndex += 1;
        objectStart = index;
      }
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0 && currentObjectIndex === targetObjectIndex) {
        return { start: objectStart, end: index + 1 };
      }
      continue;
    }
    if (char === "]" && depth === 0) {
      break;
    }
  }

  throw new Error(`mons[${String(targetObjectIndex)}] does not exist in source text.`);
}

function replaceJsonStringField(
  raw: string,
  range: { start: number; end: number },
  field: string,
  value: string,
): string {
  const pattern = new RegExp(`("${field}"\\s*:\\s*)"[^"]*"`);
  return replaceInRange(raw, range, pattern, `$1"${value}"`);
}

function replaceJsonNumberField(
  raw: string,
  range: { start: number; end: number },
  field: string,
  value: number,
): string {
  const pattern = new RegExp(`("${field}"\\s*:\\s*)\\d+`);
  return replaceInRange(raw, range, pattern, `$1${String(value)}`);
}

function replaceInRange(
  raw: string,
  range: { start: number; end: number },
  pattern: RegExp,
  replacement: string,
): string {
  const before = raw.slice(0, range.start);
  const target = raw.slice(range.start, range.end);
  const after = raw.slice(range.end);
  if (!pattern.test(target)) {
    throw new Error("Expected JSON field not found in encounter slot.");
  }
  return `${before}${target.replace(pattern, replacement)}${after}`;
}

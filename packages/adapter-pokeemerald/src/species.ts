export const SPECIES_INFO_PATH = "src/data/pokemon/species_info.h";

const statFields = [
  "baseHP",
  "baseAttack",
  "baseDefense",
  "baseSpeed",
  "baseSpAttack",
  "baseSpDefense",
] as const;

export type SpeciesStatField = (typeof statFields)[number];

export interface TextSpan {
  readonly start: number;
  readonly end: number;
}

export interface TokenSpan extends TextSpan {
  readonly value: string;
}

export interface SpeciesInfoFields {
  readonly baseHP?: number;
  readonly baseAttack?: number;
  readonly baseDefense?: number;
  readonly baseSpeed?: number;
  readonly baseSpAttack?: number;
  readonly baseSpDefense?: number;
  readonly types?: readonly [string, string];
  readonly abilities?: readonly [string, string];
}

export interface SpeciesInfoFieldSpans {
  readonly stats: ReadonlyMap<SpeciesStatField, TokenSpan>;
  readonly types?: readonly [TokenSpan, TokenSpan];
  readonly abilities?: readonly [TokenSpan, TokenSpan];
}

export interface SpeciesInfoEntry {
  readonly id: string;
  readonly initializerKind: "object" | "macro" | "zero";
  readonly entrySpan: TextSpan;
  readonly valueSpan: TextSpan;
  readonly fields: SpeciesInfoFields;
  readonly fieldSpans: SpeciesInfoFieldSpans;
}

export interface ParsedSpeciesInfoFile {
  readonly raw: string;
  readonly entries: readonly SpeciesInfoEntry[];
}

export interface SpeciesInfoPatch extends Partial<SpeciesInfoFields> {
  readonly id: string;
}

export function parseSpeciesInfoFile(raw: string): ParsedSpeciesInfoFile {
  const entries: SpeciesInfoEntry[] = [];
  const arrayStart = raw.indexOf("const struct SpeciesInfo gSpeciesInfo[]");
  if (arrayStart === -1) {
    throw new Error("Could not find gSpeciesInfo array.");
  }

  const entryPattern = /^\s*\[(SPECIES_[A-Z0-9_]+)\]\s*=/gm;
  entryPattern.lastIndex = arrayStart;
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(raw)) !== null) {
    const id = match[1];
    if (id === undefined) {
      continue;
    }
    const equalsIndex = raw.indexOf("=", match.index);
    const valueStart = skipWhitespace(raw, equalsIndex + 1);
    const valueEnd = findInitializerEnd(raw, valueStart);
    const entryEnd = raw[valueEnd] === "," ? valueEnd + 1 : valueEnd;
    const initializer = raw.slice(valueStart, valueEnd).trim();
    const initializerKind = initializer === "{0}"
      ? "zero"
      : initializer.startsWith("{")
        ? "object"
        : "macro";
    const parsedFields = initializerKind === "object"
      ? parseObjectFields(raw, valueStart, valueEnd)
      : emptyFields();

    entries.push({
      id,
      initializerKind,
      entrySpan: { start: match.index, end: entryEnd },
      valueSpan: { start: valueStart, end: valueEnd },
      fields: parsedFields.fields,
      fieldSpans: parsedFields.spans,
    });
  }

  if (entries.length === 0) {
    throw new Error("No species entries found in gSpeciesInfo.");
  }

  return { raw, entries };
}

export function serializeSpeciesInfoFile(parsed: ParsedSpeciesInfoFile): string {
  return parsed.raw;
}

export function patchSpeciesInfoText(raw: string, patch: SpeciesInfoPatch): string {
  const parsed = parseSpeciesInfoFile(raw);
  const entry = parsed.entries.find((candidate) => candidate.id === patch.id);
  if (entry === undefined) {
    throw new Error(`Species not found: ${patch.id}`);
  }
  if (entry.initializerKind !== "object") {
    throw new Error(`${patch.id} does not have an object initializer.`);
  }

  const replacements: { readonly span: TextSpan; readonly value: string }[] = [];
  for (const field of statFields) {
    const value = patch[field];
    if (value === undefined) {
      continue;
    }
    const span = entry.fieldSpans.stats.get(field);
    if (span === undefined) {
      throw new Error(`${patch.id} is missing .${field}.`);
    }
    replacements.push({ span, value: String(value) });
  }

  if (patch.types !== undefined) {
    if (entry.fieldSpans.types === undefined) {
      throw new Error(`${patch.id} is missing .types.`);
    }
    replacements.push({ span: entry.fieldSpans.types[0], value: patch.types[0] });
    replacements.push({ span: entry.fieldSpans.types[1], value: patch.types[1] });
  }

  if (patch.abilities !== undefined) {
    if (entry.fieldSpans.abilities === undefined) {
      throw new Error(`${patch.id} is missing .abilities.`);
    }
    replacements.push({ span: entry.fieldSpans.abilities[0], value: patch.abilities[0] });
    replacements.push({ span: entry.fieldSpans.abilities[1], value: patch.abilities[1] });
  }

  return applyReplacements(raw, replacements);
}

function parseObjectFields(raw: string, start: number, end: number): { fields: SpeciesInfoFields; spans: SpeciesInfoFieldSpans } {
  const text = raw.slice(start, end);
  const stats = new Map<SpeciesStatField, TokenSpan>();
  const fields: Partial<Record<SpeciesStatField, number>> = {};

  for (const field of statFields) {
    const match = new RegExp(`\\.${field}\\s*=\\s*(\\d+)`).exec(text);
    if (match?.[1] === undefined) {
      continue;
    }
    const valueStart = start + match.index + match[0].lastIndexOf(match[1]);
    stats.set(field, { start: valueStart, end: valueStart + match[1].length, value: match[1] });
    fields[field] = Number.parseInt(match[1], 10);
  }

  const types = parsePairField(raw, text, start, "types", /^TYPE_[A-Z0-9_]+$/);
  const abilities = parsePairField(raw, text, start, "abilities", /^ABILITY_[A-Z0-9_]+$/);

  return {
    fields: {
      ...fields,
      ...(types === undefined ? {} : { types: [types[0].value, types[1].value] as const }),
      ...(abilities === undefined ? {} : { abilities: [abilities[0].value, abilities[1].value] as const }),
    },
    spans: {
      stats,
      ...(types === undefined ? {} : { types }),
      ...(abilities === undefined ? {} : { abilities }),
    },
  };
}

function parsePairField(
  raw: string,
  text: string,
  absoluteStart: number,
  field: string,
  valuePattern: RegExp,
): readonly [TokenSpan, TokenSpan] | undefined {
  const match = new RegExp(`\\.${field}\\s*=\\s*\\{\\s*([A-Z0-9_]+)\\s*,\\s*([A-Z0-9_]+)\\s*,?\\s*\\}`).exec(text);
  if (match?.[1] === undefined || match[2] === undefined) {
    return undefined;
  }
  if (!valuePattern.test(match[1]) || !valuePattern.test(match[2])) {
    throw new Error(`Unsupported .${field} value in species info.`);
  }
  const firstStart = absoluteStart + match.index + match[0].indexOf(match[1]);
  const secondSearchStart = match[0].indexOf(match[1]) + match[1].length;
  const secondStart = absoluteStart + match.index + match[0].indexOf(match[2], secondSearchStart);
  return [
    { start: firstStart, end: firstStart + match[1].length, value: raw.slice(firstStart, firstStart + match[1].length) },
    { start: secondStart, end: secondStart + match[2].length, value: raw.slice(secondStart, secondStart + match[2].length) },
  ];
}

function emptyFields(): { fields: SpeciesInfoFields; spans: SpeciesInfoFieldSpans } {
  return { fields: {}, spans: { stats: new Map() } };
}

function skipWhitespace(raw: string, start: number): number {
  let index = start;
  while (/\s/.test(raw[index] ?? "")) {
    index += 1;
  }
  return index;
}

function findInitializerEnd(raw: string, start: number): number {
  let depth = 0;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
      continue;
    }
    if (char === "," && depth === 0) {
      return index;
    }
  }
  throw new Error("Could not find species initializer end.");
}

function applyReplacements(raw: string, replacements: readonly { readonly span: TextSpan; readonly value: string }[]): string {
  return [...replacements]
    .sort((left, right) => right.span.start - left.span.start)
    .reduce((next, replacement) => `${next.slice(0, replacement.span.start)}${replacement.value}${next.slice(replacement.span.end)}`, raw);
}

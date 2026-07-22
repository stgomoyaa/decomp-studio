export const BATTLE_MOVES_PATH = "src/data/battle_moves.h";

const numericMoveFields = ["power", "accuracy", "pp"] as const;
const tokenMoveFields = ["effect", "type"] as const;

export type NumericMoveField = (typeof numericMoveFields)[number];
export type TokenMoveField = (typeof tokenMoveFields)[number];

export interface MoveTextSpan {
  readonly start: number;
  readonly end: number;
}

export interface MoveTokenSpan extends MoveTextSpan {
  readonly value: string;
}

export interface BattleMoveFields {
  readonly effect?: string;
  readonly power?: number;
  readonly type?: string;
  readonly accuracy?: number;
  readonly pp?: number;
}

export interface BattleMoveFieldSpans {
  readonly numeric: ReadonlyMap<NumericMoveField, MoveTokenSpan>;
  readonly tokens: ReadonlyMap<TokenMoveField, MoveTokenSpan>;
}

export interface BattleMoveEntry {
  readonly id: string;
  readonly entrySpan: MoveTextSpan;
  readonly valueSpan: MoveTextSpan;
  readonly fields: BattleMoveFields;
  readonly fieldSpans: BattleMoveFieldSpans;
}

export interface ParsedBattleMovesFile {
  readonly raw: string;
  readonly entries: readonly BattleMoveEntry[];
}

export interface BattleMovePatch extends Partial<BattleMoveFields> {
  readonly id: string;
}

export function parseBattleMovesFile(raw: string): ParsedBattleMovesFile {
  const arrayStart = raw.indexOf("const struct BattleMove gBattleMoves");
  if (arrayStart === -1) {
    throw new Error("Could not find gBattleMoves array.");
  }

  const entries: BattleMoveEntry[] = [];
  const entryPattern = /^\s*\[(MOVE_[A-Z0-9_]+)\]\s*=/gm;
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
    const parsedFields = parseMoveFields(raw, valueStart, valueEnd);
    entries.push({
      id,
      entrySpan: { start: match.index, end: entryEnd },
      valueSpan: { start: valueStart, end: valueEnd },
      fields: parsedFields.fields,
      fieldSpans: parsedFields.spans,
    });
  }

  if (entries.length === 0) {
    throw new Error("No move entries found in gBattleMoves.");
  }

  return { raw, entries };
}

export function serializeBattleMovesFile(parsed: ParsedBattleMovesFile): string {
  return parsed.raw;
}

export function patchBattleMovesText(raw: string, patch: BattleMovePatch): string {
  const parsed = parseBattleMovesFile(raw);
  const entry = parsed.entries.find((candidate) => candidate.id === patch.id);
  if (entry === undefined) {
    throw new Error(`Move not found: ${patch.id}`);
  }

  const replacements: { readonly span: MoveTextSpan; readonly value: string }[] = [];
  for (const field of numericMoveFields) {
    const value = patch[field];
    if (value === undefined) {
      continue;
    }
    const span = entry.fieldSpans.numeric.get(field);
    if (span === undefined) {
      throw new Error(`${patch.id} is missing .${field}.`);
    }
    replacements.push({ span, value: String(value) });
  }
  for (const field of tokenMoveFields) {
    const value = patch[field];
    if (value === undefined) {
      continue;
    }
    const span = entry.fieldSpans.tokens.get(field);
    if (span === undefined) {
      throw new Error(`${patch.id} is missing .${field}.`);
    }
    replacements.push({ span, value });
  }

  return applyReplacements(raw, replacements);
}

function parseMoveFields(raw: string, start: number, end: number): { fields: BattleMoveFields; spans: BattleMoveFieldSpans } {
  const text = raw.slice(start, end);
  const numeric = new Map<NumericMoveField, MoveTokenSpan>();
  const tokens = new Map<TokenMoveField, MoveTokenSpan>();
  const fields: Partial<Record<NumericMoveField, number> & Record<TokenMoveField, string>> = {};

  for (const field of numericMoveFields) {
    const match = new RegExp(`\\.${field}\\s*=\\s*(-?\\d+)`).exec(text);
    if (match?.[1] === undefined) {
      continue;
    }
    const valueStart = start + match.index + match[0].lastIndexOf(match[1]);
    numeric.set(field, { start: valueStart, end: valueStart + match[1].length, value: match[1] });
    fields[field] = Number.parseInt(match[1], 10);
  }

  for (const field of tokenMoveFields) {
    const match = new RegExp(`\\.${field}\\s*=\\s*([A-Z0-9_]+)`).exec(text);
    if (match?.[1] === undefined) {
      continue;
    }
    const valueStart = start + match.index + match[0].lastIndexOf(match[1]);
    tokens.set(field, { start: valueStart, end: valueStart + match[1].length, value: match[1] });
    fields[field] = match[1];
  }

  return { fields, spans: { numeric, tokens } };
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
  }
  throw new Error("Could not find move initializer end.");
}

function applyReplacements(raw: string, replacements: readonly { readonly span: MoveTextSpan; readonly value: string }[]): string {
  return [...replacements]
    .sort((left, right) => right.span.start - left.span.start)
    .reduce((next, replacement) => `${next.slice(0, replacement.span.start)}${replacement.value}${next.slice(replacement.span.end)}`, raw);
}

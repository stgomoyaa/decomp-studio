export const TRAINERS_PATH = "src/data/trainers.h";
export const TRAINER_PARTIES_PATH = "src/data/trainer_parties.h";

export interface TrainerTextSpan {
  readonly start: number;
  readonly end: number;
}

export interface TrainerTokenSpan extends TrainerTextSpan {
  readonly value: string;
}

export interface TrainerFields {
  readonly trainerClass?: string;
  readonly trainerName?: string;
  readonly doubleBattle?: string;
  readonly aiFlags?: string;
  readonly partyLabel?: string;
}

export interface TrainerEntry {
  readonly id: string;
  readonly entrySpan: TrainerTextSpan;
  readonly valueSpan: TrainerTextSpan;
  readonly fields: TrainerFields;
}

export interface ParsedTrainersFile {
  readonly raw: string;
  readonly entries: readonly TrainerEntry[];
}

export interface TrainerPartyMon {
  readonly iv?: number;
  readonly lvl?: number;
  readonly species?: string;
  readonly heldItem?: string;
  readonly moves?: readonly string[];
  readonly spans: {
    readonly iv?: TrainerTokenSpan;
    readonly lvl?: TrainerTokenSpan;
    readonly species?: TrainerTokenSpan;
    readonly heldItem?: TrainerTokenSpan;
    readonly moves?: readonly TrainerTokenSpan[];
  };
}

export interface TrainerPartyEntry {
  readonly id: string;
  readonly structType: string;
  readonly entrySpan: TrainerTextSpan;
  readonly valueSpan: TrainerTextSpan;
  readonly mons: readonly TrainerPartyMon[];
}

export interface ParsedTrainerPartiesFile {
  readonly raw: string;
  readonly parties: readonly TrainerPartyEntry[];
}

export interface TrainerPartyMonPatch {
  readonly partyId: string;
  readonly monIndex: number;
  readonly lvl?: number;
  readonly species?: string;
}

export function parseTrainersFile(raw: string): ParsedTrainersFile {
  const arrayStart = raw.indexOf("const struct Trainer gTrainers");
  if (arrayStart === -1) {
    throw new Error("Could not find gTrainers array.");
  }

  const entries: TrainerEntry[] = [];
  const entryPattern = /^\s*\[(TRAINER_[A-Z0-9_]+)\]\s*=/gm;
  entryPattern.lastIndex = arrayStart;
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(raw)) !== null) {
    const id = match[1];
    if (id === undefined) {
      continue;
    }
    const equalsIndex = raw.indexOf("=", match.index);
    const valueStart = skipWhitespace(raw, equalsIndex + 1);
    const valueEnd = findBraceInitializerEnd(raw, valueStart);
    const entryEnd = raw[valueEnd] === "," ? valueEnd + 1 : valueEnd;
    entries.push({
      id,
      entrySpan: { start: match.index, end: entryEnd },
      valueSpan: { start: valueStart, end: valueEnd },
      fields: parseTrainerFields(raw.slice(valueStart, valueEnd)),
    });
  }

  if (entries.length === 0) {
    throw new Error("No trainer entries found in gTrainers.");
  }

  return { raw, entries };
}

export function serializeTrainersFile(parsed: ParsedTrainersFile): string {
  return parsed.raw;
}

function parseTrainerFields(text: string): TrainerFields {
  const trainerClass = firstCapture(/\.trainerClass\s*=\s*([A-Z0-9_]+)/, text);
  const trainerName = firstCapture(/\.trainerName\s*=\s*_\("((?:[^"\\]|\\.)*)"\)/, text);
  const doubleBattle = firstCapture(/\.doubleBattle\s*=\s*([A-Z0-9_]+)/, text);
  const aiFlags = firstCapture(/\.aiFlags\s*=\s*([^,\n]+)/, text)?.trim();
  const partyLabel = firstCapture(/\.party\s*=\s*(?:[A-Z_]+\()?\s*(sParty_[A-Za-z0-9_]+)/, text);
  return {
    ...(trainerClass === undefined ? {} : { trainerClass }),
    ...(trainerName === undefined ? {} : { trainerName }),
    ...(doubleBattle === undefined ? {} : { doubleBattle }),
    ...(aiFlags === undefined ? {} : { aiFlags }),
    ...(partyLabel === undefined ? {} : { partyLabel }),
  };
}

function firstCapture(pattern: RegExp, text: string): string | undefined {
  return pattern.exec(text)?.[1];
}

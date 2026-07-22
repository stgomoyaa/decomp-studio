import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { BATTLE_MOVES_PATH, parseBattleMovesFile, patchBattleMovesText, serializeBattleMovesFile } from "./moves.js";

const fixturePath = path.resolve(process.cwd(), "projects/pokeemerald-vanilla", BATTLE_MOVES_PATH);

describe("battle_moves parser", () => {
  test("round-trips vanilla byte-for-byte", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const parsed = parseBattleMovesFile(raw);

    expect(parsed.entries.length).toBeGreaterThan(300);
    expect(serializeBattleMovesFile(parsed)).toBe(raw);
  });

  test("parses editable fields for a standard move", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const parsed = parseBattleMovesFile(raw);
    const pound = parsed.entries.find((entry) => entry.id === "MOVE_POUND");

    expect(pound?.fields.effect).toBe("EFFECT_HIT");
    expect(pound?.fields.power).toBe(40);
    expect(pound?.fields.type).toBe("TYPE_NORMAL");
    expect(pound?.fields.accuracy).toBe(100);
    expect(pound?.fields.pp).toBe(35);
  });

  test("can patch and revert power without touching other bytes", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const changed = patchBattleMovesText(raw, { id: "MOVE_POUND", power: 55 });
    const reverted = patchBattleMovesText(changed, { id: "MOVE_POUND", power: 40 });

    expect(changed).not.toBe(raw);
    expect(reverted).toBe(raw);
  });
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { parseSpeciesInfoFile, patchSpeciesInfoText, serializeSpeciesInfoFile, SPECIES_INFO_PATH } from "./species.js";

const fixturePath = path.resolve(process.cwd(), "projects/pokeemerald-vanilla", SPECIES_INFO_PATH);

describe("species_info parser", () => {
  test("round-trips vanilla byte-for-byte", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const parsed = parseSpeciesInfoFile(raw);

    expect(parsed.entries.length).toBeGreaterThan(400);
    expect(serializeSpeciesInfoFile(parsed)).toBe(raw);
  });

  test("parses editable fields for standard species", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const parsed = parseSpeciesInfoFile(raw);
    const treecko = parsed.entries.find((entry) => entry.id === "SPECIES_TREECKO");

    expect(treecko?.initializerKind).toBe("object");
    expect(treecko?.fields.baseAttack).toBe(45);
    expect(treecko?.fields.types).toEqual(["TYPE_GRASS", "TYPE_GRASS"]);
    expect(treecko?.fields.abilities).toEqual(["ABILITY_OVERGROW", "ABILITY_NONE"]);
  });

  test("can patch and revert a stat without touching other bytes", async () => {
    const raw = await readFile(fixturePath, "utf8");
    const changed = patchSpeciesInfoText(raw, { id: "SPECIES_TREECKO", baseAttack: 99 });
    const reverted = patchSpeciesInfoText(changed, { id: "SPECIES_TREECKO", baseAttack: 45 });

    expect(changed).not.toBe(raw);
    expect(reverted).toBe(raw);
  });
});

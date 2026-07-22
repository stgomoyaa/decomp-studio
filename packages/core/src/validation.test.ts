import path from "node:path";
import { describe, expect, test } from "vitest";
import { validateMovePatch, validateProject, validateSpeciesPatch } from "./validation.js";

const projectDir = path.resolve(process.cwd(), "projects/pokeemerald-vanilla");

describe("validation service", () => {
  test("vanilla species and moves validate cleanly", async () => {
    await expect(validateProject(projectDir)).resolves.toEqual([]);
  });

  test("rejects invalid species references and stat ranges", async () => {
    const diagnostics = await validateSpeciesPatch(projectDir, {
      id: "SPECIES_TREECKO",
      baseAttack: 999,
      types: ["TYPE_GRASS", "TYPE_FAKE"],
      abilities: ["ABILITY_OVERGROW", "ABILITY_FAKE"],
    });

    expect(diagnostics.map((diagnostic) => diagnostic.field)).toEqual(["baseAttack", "types", "abilities"]);
  });

  test("rejects invalid move references and ranges", async () => {
    const diagnostics = await validateMovePatch(projectDir, {
      id: "MOVE_POUND",
      effect: "EFFECT_FAKE",
      power: 300,
      type: "TYPE_FAKE",
      accuracy: 101,
      pp: 99,
    });

    expect(diagnostics.map((diagnostic) => diagnostic.field)).toEqual(["power", "accuracy", "pp", "effect", "type"]);
  });
});

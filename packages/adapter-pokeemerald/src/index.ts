export const POKEEMERALD_PINNED_COMMIT =
  "83df84e40623b79281f2397faa611cbf044170bd";

export const POKEEMERALD_CAPABILITIES = [
  "project.inspect",
  "toolchain.check",
  "build.run",
  "emulator.launch",
  "encounters.list",
  "encounters.update",
  "species.list",
  "species.get",
  "species.update",
  "moves.list",
  "moves.get",
  "moves.update",
] as const;

export const POKEEMERALD_REQUIRED_PATHS = [
  "Makefile",
  "src/data/wild_encounters.json",
  "src/data/pokemon/species_info.h",
  "include/constants/species.h",
] as const;

export const POKEEMERALD_EXPANSION_MARKERS = [
  "include/config/battle.h",
  "src/data/pokemon/species_info/gen_1.h",
] as const;

export * from "./species.js";
export * from "./moves.js";

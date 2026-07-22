import { EventEmitter } from "node:events";
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import {
  checkNativeToolchain,
  getEncounter,
  getMove,
  getSpecies,
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
  updateSpecies,
  validateProject,
} from "@decomp-studio/core";

export interface BuildLogEvent {
  readonly projectDir: string;
  readonly chunk: string;
}

export const buildLogEmitter = new EventEmitter();

const t = initTRPC.create();

const projectDirInput = z.object({ projectDir: z.string().min(1) });
const moveIdInput = projectDirInput.extend({ id: z.string().regex(/^MOVE_[A-Z0-9_]+$/) });
const movePatchInput = moveIdInput.extend({
  effect: z.string().regex(/^EFFECT_[A-Z0-9_]+$/).optional(),
  power: z.number().int().min(0).max(255).optional(),
  type: z.string().regex(/^TYPE_[A-Z0-9_]+$/).optional(),
  accuracy: z.number().int().min(0).max(100).optional(),
  pp: z.number().int().min(0).max(64).optional(),
});
const speciesIdInput = projectDirInput.extend({ id: z.string().regex(/^SPECIES_[A-Z0-9_]+$/) });
const speciesPatchInput = speciesIdInput.extend({
  baseHP: z.number().int().min(1).max(255).optional(),
  baseAttack: z.number().int().min(1).max(255).optional(),
  baseDefense: z.number().int().min(1).max(255).optional(),
  baseSpeed: z.number().int().min(1).max(255).optional(),
  baseSpAttack: z.number().int().min(1).max(255).optional(),
  baseSpDefense: z.number().int().min(1).max(255).optional(),
  types: z.tuple([z.string().regex(/^TYPE_[A-Z0-9_]+$/), z.string().regex(/^TYPE_[A-Z0-9_]+$/)]).optional(),
  abilities: z.tuple([z.string().regex(/^ABILITY_[A-Z0-9_]+$/), z.string().regex(/^ABILITY_[A-Z0-9_]+$/)]).optional(),
});

export const appRouter = t.router({
  projectInspect: t.procedure.input(projectDirInput).query(({ input }) =>
    inspectProject(input.projectDir),
  ),
  projectInit: t.procedure
    .input(projectDirInput.extend({ name: z.string().min(1).optional() }))
    .mutation(({ input }) => initProject(input.projectDir, input.name)),
  projectOpen: t.procedure.input(projectDirInput).query(({ input }) =>
    openProject(input.projectDir),
  ),
  toolchainCheck: t.procedure
    .input(z.object({ cwd: z.string().min(1).optional() }).optional())
    .query(({ input }) => checkNativeToolchain(input?.cwd)),
  buildRun: t.procedure.input(projectDirInput).mutation(({ input }) =>
    runBuild(input.projectDir, (chunk) => {
      buildLogEmitter.emit("build-log", { projectDir: input.projectDir, chunk } satisfies BuildLogEvent);
    }),
  ),
  emulatorLaunch: t.procedure.input(projectDirInput).mutation(({ input }) =>
    launchEmulator(input.projectDir),
  ),
  encountersList: t.procedure.input(projectDirInput).query(({ input }) =>
    listEncounters(input.projectDir),
  ),
  encountersGet: t.procedure
    .input(projectDirInput.extend({ map: z.string().min(1) }))
    .query(({ input }) => getEncounter(input.projectDir, input.map)),
  encountersUpdateSlot: t.procedure
    .input(projectDirInput.extend({
      map: z.string().min(1),
      slotType: z.enum(["land_mons", "water_mons", "rock_smash_mons", "fishing_mons"]),
      slotIndex: z.number().int().min(0),
      species: z.string().min(1).optional(),
      minLevel: z.number().int().min(1).max(100).optional(),
      maxLevel: z.number().int().min(1).max(100).optional(),
    }))
    .mutation(({ input }) => updateEncounterSlot(input.projectDir, input)),
  speciesList: t.procedure.input(projectDirInput).query(({ input }) =>
    listSpecies(input.projectDir),
  ),
  speciesGet: t.procedure.input(speciesIdInput).query(({ input }) =>
    getSpecies(input.projectDir, input.id),
  ),
  speciesUpdate: t.procedure.input(speciesPatchInput).mutation(({ input }) =>
    updateSpecies(input.projectDir, {
      id: input.id,
      ...(input.baseHP === undefined ? {} : { baseHP: input.baseHP }),
      ...(input.baseAttack === undefined ? {} : { baseAttack: input.baseAttack }),
      ...(input.baseDefense === undefined ? {} : { baseDefense: input.baseDefense }),
      ...(input.baseSpeed === undefined ? {} : { baseSpeed: input.baseSpeed }),
      ...(input.baseSpAttack === undefined ? {} : { baseSpAttack: input.baseSpAttack }),
      ...(input.baseSpDefense === undefined ? {} : { baseSpDefense: input.baseSpDefense }),
      ...(input.types === undefined ? {} : { types: input.types }),
      ...(input.abilities === undefined ? {} : { abilities: input.abilities }),
    }),
  ),
  movesList: t.procedure.input(projectDirInput).query(({ input }) =>
    listMoves(input.projectDir),
  ),
  movesGet: t.procedure.input(moveIdInput).query(({ input }) =>
    getMove(input.projectDir, input.id),
  ),
  movesUpdate: t.procedure.input(movePatchInput).mutation(({ input }) =>
    updateMove(input.projectDir, {
      id: input.id,
      ...(input.effect === undefined ? {} : { effect: input.effect }),
      ...(input.power === undefined ? {} : { power: input.power }),
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.accuracy === undefined ? {} : { accuracy: input.accuracy }),
      ...(input.pp === undefined ? {} : { pp: input.pp }),
    }),
  ),
  validationCheck: t.procedure.input(projectDirInput).query(({ input }) =>
    validateProject(input.projectDir),
  ),
});

export type AppRouter = typeof appRouter;

import { z } from "zod";

export const encounterMonSchema = z.object({
  min_level: z.number().int().min(1).max(100),
  max_level: z.number().int().min(1).max(100),
  species: z.string().regex(/^SPECIES_[A-Z0-9_]+$/),
});

export const encounterSlotTypeSchema = z.enum([
  "land_mons",
  "water_mons",
  "rock_smash_mons",
  "fishing_mons",
]);

export const encounterTableSchema = z.object({
  encounter_rate: z.number().int().min(0).max(100),
  mons: z.array(encounterMonSchema),
});

export const wildEncounterEntrySchema = z
  .object({
    map: z.string().regex(/^MAP_[A-Z0-9_]+$/).optional(),
    base_label: z.string().optional(),
    land_mons: encounterTableSchema.optional(),
    water_mons: encounterTableSchema.optional(),
    rock_smash_mons: encounterTableSchema.optional(),
    fishing_mons: encounterTableSchema.optional(),
  })
  .loose();

export const wildEncounterFieldSchema = z
  .object({
    type: encounterSlotTypeSchema,
    encounter_rates: z.array(z.number().int().min(0).max(100)),
    groups: z.record(z.string(), z.array(z.number().int().min(0))).optional(),
  })
  .loose();

export const wildEncounterGroupSchema = z
  .object({
    label: z.string(),
    for_maps: z.boolean().optional(),
    fields: z.array(wildEncounterFieldSchema).optional(),
    encounters: z.array(wildEncounterEntrySchema),
  })
  .loose();

export const wildEncountersFileSchema = z
  .object({
    wild_encounter_groups: z.array(wildEncounterGroupSchema),
  })
  .loose();

export const encounterPatchSchema = z.object({
  map: z.string().regex(/^MAP_[A-Z0-9_]+$/),
  slotType: encounterSlotTypeSchema,
  slotIndex: z.number().int().min(0),
  minLevel: z.number().int().min(1).max(100).optional(),
  maxLevel: z.number().int().min(1).max(100).optional(),
  species: z.string().regex(/^SPECIES_[A-Z0-9_]+$/).optional(),
});

export type EncounterMon = z.infer<typeof encounterMonSchema>;
export type EncounterPatch = z.infer<typeof encounterPatchSchema>;
export type EncounterSlotType = z.infer<typeof encounterSlotTypeSchema>;
export type WildEncounterEntry = z.infer<typeof wildEncounterEntrySchema>;
export type WildEncountersFile = z.infer<typeof wildEncountersFileSchema>;

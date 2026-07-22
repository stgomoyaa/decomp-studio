import { z } from "zod";

export const projectBaseSchema = z.enum([
  "pokeemerald",
  "pokeemerald-expansion",
  "unknown",
]);

export const toolchainProviderSchema = z.enum(["native", "wsl", "docker"]);

export const projectConfigSchema = z.object({
  name: z.string().min(1),
  base: projectBaseSchema,
  rootDir: z.string().min(1),
  pinnedCommit: z.string().min(7).optional(),
  toolchain: z
    .object({
      provider: toolchainProviderSchema.default("native"),
    })
    .default({ provider: "native" }),
});

export const projectInspectSchema = z.object({
  rootDir: z.string(),
  exists: z.boolean(),
  base: projectBaseSchema,
  currentCommit: z.string().nullable(),
  pinnedCommit: z.string().nullable(),
  isPinnedCommit: z.boolean(),
  hasProjectConfig: z.boolean(),
  capabilities: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type ProjectBase = z.infer<typeof projectBaseSchema>;
export type ProjectConfig = z.infer<typeof projectConfigSchema>;
export type ProjectInspect = z.infer<typeof projectInspectSchema>;
export type ToolchainProviderId = z.infer<typeof toolchainProviderSchema>;

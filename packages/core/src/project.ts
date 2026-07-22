import path from "node:path";
import {
  POKEEMERALD_CAPABILITIES,
  POKEEMERALD_EXPANSION_MARKERS,
  POKEEMERALD_PINNED_COMMIT,
  POKEEMERALD_REQUIRED_PATHS,
} from "@decomp-studio/adapter-pokeemerald";
import type { ProjectBase, ProjectInspect } from "@decomp-studio/schemas";
import { projectConfigSchema, type ProjectConfig } from "@decomp-studio/schemas";
import { pathExists, readJsonFile, writeStableJsonFile } from "./fs.js";
import { execFile } from "./process.js";

export interface GitCheckpoint {
  readonly id: string;
  readonly refName: string;
  readonly objectRef: string;
  readonly kind: "head" | "stash";
}

export interface OpenProjectResult {
  readonly config: ProjectConfig;
  readonly inspect: ProjectInspect;
}

export async function initProject(rootDir: string, name?: string): Promise<OpenProjectResult> {
  const inspect = await inspectProject(rootDir);
  if (!inspect.exists || inspect.base === "unknown") {
    throw new Error("Cannot init project: directory is not a supported pokeemerald decomp.");
  }

  const config = projectConfigSchema.parse({
    name: name ?? path.basename(inspect.rootDir),
    base: inspect.base,
    rootDir: inspect.rootDir,
    pinnedCommit: inspect.pinnedCommit ?? undefined,
    toolchain: { provider: "native" },
  });
  await writeStableJsonFile(path.join(inspect.rootDir, "project.json"), config);
  return { config, inspect: await inspectProject(inspect.rootDir) };
}

export async function openProject(rootDir: string): Promise<OpenProjectResult> {
  const inspect = await inspectProject(rootDir);
  if (!inspect.exists) {
    throw new Error("Project directory does not exist.");
  }
  const configPath = path.join(inspect.rootDir, "project.json");
  if (!(await pathExists(configPath))) {
    throw new Error("Missing project.json. Run project init first.");
  }
  const config = projectConfigSchema.parse(await readJsonFile(configPath));
  return { config, inspect };
}

export async function inspectProject(rootDir: string): Promise<ProjectInspect> {
  const resolvedRoot = path.resolve(rootDir);
  const exists = await pathExists(resolvedRoot);
  const warnings: string[] = [];
  if (!exists) {
    return {
      rootDir: resolvedRoot,
      exists: false,
      base: "unknown",
      currentCommit: null,
      pinnedCommit: POKEEMERALD_PINNED_COMMIT,
      isPinnedCommit: false,
      hasProjectConfig: false,
      capabilities: [],
      warnings: ["Project directory does not exist."],
    };
  }

  const hasRequiredPaths = await Promise.all(
    POKEEMERALD_REQUIRED_PATHS.map((requiredPath) =>
      pathExists(path.join(resolvedRoot, requiredPath)),
    ),
  );
  const missingRequiredPaths = POKEEMERALD_REQUIRED_PATHS.filter(
    (_, index) => hasRequiredPaths[index] !== true,
  );

  const hasExpansionMarkers = await Promise.all(
    POKEEMERALD_EXPANSION_MARKERS.map((marker) =>
      pathExists(path.join(resolvedRoot, marker)),
    ),
  );

  const base: ProjectBase = missingRequiredPaths.length > 0
    ? "unknown"
    : hasExpansionMarkers.some(Boolean)
      ? "pokeemerald-expansion"
      : "pokeemerald";

  if (missingRequiredPaths.length > 0) {
    warnings.push(`Missing expected pokeemerald paths: ${missingRequiredPaths.join(", ")}`);
  }
  if (base === "pokeemerald-expansion") {
    warnings.push("pokeemerald-expansion detected; full adapter support is scheduled for M8.5.");
  }

  const currentCommit = await getGitCommit(resolvedRoot);
  const hasProjectConfig = await pathExists(path.join(resolvedRoot, "project.json"));
  if (hasProjectConfig) {
    projectConfigSchema.parse(await readJsonFile(path.join(resolvedRoot, "project.json")));
  }

  return {
    rootDir: resolvedRoot,
    exists,
    base,
    currentCommit,
    pinnedCommit: POKEEMERALD_PINNED_COMMIT,
    isPinnedCommit: currentCommit === POKEEMERALD_PINNED_COMMIT,
    hasProjectConfig,
    capabilities: base === "unknown" ? [] : [...POKEEMERALD_CAPABILITIES],
    warnings,
  };
}

async function getGitCommit(rootDir: string): Promise<string | null> {
  const result = await execFile(["git", "rev-parse", "HEAD"], { cwd: rootDir });
  if (result.exitCode !== 0) {
    return null;
  }
  return result.stdout.trim() || null;
}

export async function createGitCheckpoint(
  projectDir: string,
  reason: string,
): Promise<GitCheckpoint> {
  const root = path.resolve(projectDir);
  const insideWorkTree = await execFile(["git", "rev-parse", "--is-inside-work-tree"], {
    cwd: root,
  });
  if (insideWorkTree.exitCode !== 0 || insideWorkTree.stdout.trim() !== "true") {
    throw new Error("Project is not a git worktree; cannot create checkpoint.");
  }

  const head = await execFile(["git", "rev-parse", "HEAD"], { cwd: root });
  if (head.exitCode !== 0) {
    throw new Error("Project has no git HEAD; cannot create checkpoint.");
  }

  const id = checkpointId();
  const message = `decomp-studio checkpoint ${id}: ${reason}`;
  const stash = await execFile(["git", "stash", "create", message], { cwd: root });
  const stashRef = stash.stdout.trim();
  const objectRef = stashRef.length > 0 ? stashRef : head.stdout.trim();
  const kind = stashRef.length > 0 ? "stash" : "head";
  const refName = `refs/decomp-studio/checkpoints/${id}`;
  const updateRef = await execFile(["git", "update-ref", refName, objectRef], { cwd: root });
  if (updateRef.exitCode !== 0) {
    throw new Error(updateRef.stderr || "Failed to create git checkpoint ref.");
  }

  return { id, refName, objectRef, kind };
}

function checkpointId(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, "");
}

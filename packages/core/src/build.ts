import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathExists, resolveInside } from "./fs.js";
import { execFile, type ExecResult } from "./process.js";

export interface BuildResult extends ExecResult {
  readonly romPath: string;
  readonly romSha1: string | null;
  readonly diagnostics: readonly BuildDiagnostic[];
}

export interface BuildDiagnostic {
  readonly file: string | null;
  readonly line: number | null;
  readonly column: number | null;
  readonly severity: "error" | "warning";
  readonly message: string;
}

export async function runBuild(
  projectDir: string,
  onOutput?: (line: string) => void,
): Promise<BuildResult> {
  const root = path.resolve(projectDir);
  const jobs = String(Math.max(1, Math.min(8, (await cpuCount()) || 1)));
  const execOptions = onOutput === undefined ? { cwd: root } : { cwd: root, onOutput };
  const result = await execFile(["make", `-j${jobs}`], execOptions);
  const romPath = resolveInside(root, "pokeemerald.gba");
  const romSha1 = result.exitCode === 0 && (await pathExists(romPath))
    ? await sha1File(romPath)
    : null;
  return {
    ...result,
    romPath,
    romSha1,
    diagnostics: parseBuildDiagnostics(`${result.stdout}\n${result.stderr}`),
  };
}

export async function cleanBuild(projectDir: string): Promise<ExecResult> {
  return execFile(["make", "clean"], { cwd: path.resolve(projectDir) });
}

export async function getRomPath(projectDir: string): Promise<string | null> {
  const romPath = resolveInside(projectDir, "pokeemerald.gba");
  return (await pathExists(romPath)) ? romPath : null;
}

export async function sha1File(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  return createHash("sha1").update(data).digest("hex");
}

async function cpuCount(): Promise<number> {
  const result = await execFile(["sysctl", "-n", "hw.ncpu"], { cwd: process.cwd() });
  if (result.exitCode === 0) {
    const parsed = Number.parseInt(result.stdout.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 1;
}

export function parseBuildDiagnostics(output: string): BuildDiagnostic[] {
  const diagnostics: BuildDiagnostic[] = [];
  const gccPattern = /^(?<file>[^:\n][^\n]*?):(?<line>\d+):(?:(?<column>\d+):)?\s(?<severity>fatal error|error|warning):\s(?<message>.+)$/;
  const linkerPattern = /^(?<message>arm-none-eabi-ld:.*(?:error|undefined reference).*)$/i;

  for (const line of output.split("\n")) {
    const gccMatch = gccPattern.exec(line);
    if (gccMatch?.groups !== undefined) {
      diagnostics.push({
        file: gccMatch.groups.file ?? null,
        line: parseOptionalInteger(gccMatch.groups.line),
        column: parseOptionalInteger(gccMatch.groups.column),
        severity: gccMatch.groups.severity === "warning" ? "warning" : "error",
        message: gccMatch.groups.message ?? line,
      });
      continue;
    }

    const linkerMatch = linkerPattern.exec(line);
    if (linkerMatch?.groups !== undefined) {
      diagnostics.push({
        file: null,
        line: null,
        column: null,
        severity: "error",
        message: linkerMatch.groups.message ?? line,
      });
    }
  }

  return diagnostics;
}

function parseOptionalInteger(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

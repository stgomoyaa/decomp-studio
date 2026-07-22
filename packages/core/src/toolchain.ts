import os from "node:os";
import { execFile } from "./process.js";

export interface ToolStatus {
  readonly name: string;
  readonly ok: boolean;
  readonly version: string | null;
  readonly fix: string | null;
}

export interface ToolchainStatus {
  readonly provider: "native";
  readonly platform: NodeJS.Platform;
  readonly ok: boolean;
  readonly tools: readonly ToolStatus[];
}

const TOOL_CHECKS: readonly { name: string; command: readonly string[]; fix: string }[] = [
  { name: "git", command: ["git", "--version"], fix: "Install Git." },
  { name: "make", command: ["make", "--version"], fix: "Install GNU Make / Xcode Command Line Tools." },
  { name: "cc", command: ["cc", "--version"], fix: "Install Xcode Command Line Tools or build-essential." },
  { name: "arm-none-eabi-as", command: ["arm-none-eabi-as", "--version"], fix: "Install arm-none-eabi-binutils or devkitARM." },
  { name: "arm-none-eabi-gcc", command: ["arm-none-eabi-gcc", "--version"], fix: "Install arm-none-eabi-gcc or devkitARM." },
  { name: "libpng-config", command: ["libpng-config", "--version"], fix: "Install libpng development headers." },
];

export async function checkNativeToolchain(cwd = process.cwd()): Promise<ToolchainStatus> {
  const tools = await Promise.all(
    TOOL_CHECKS.map(async (tool): Promise<ToolStatus> => {
      const result = await execFile(tool.command, { cwd });
      const output = `${result.stdout}${result.stderr}`.trim();
      return {
        name: tool.name,
        ok: result.exitCode === 0,
        version: result.exitCode === 0 ? firstLine(output) : null,
        fix: result.exitCode === 0 ? null : tool.fix,
      };
    }),
  );
  return {
    provider: "native",
    platform: os.platform(),
    ok: tools.every((tool) => tool.ok),
    tools,
  };
}

function firstLine(value: string): string | null {
  const line = value.split("\n").find((candidate) => candidate.trim().length > 0);
  return line?.trim() ?? null;
}

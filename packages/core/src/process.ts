import { spawn } from "node:child_process";

export interface ExecResult {
  readonly command: readonly string[];
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface ExecOptions {
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly onOutput?: (line: string) => void;
}

export async function execFile(
  command: readonly string[],
  options: ExecOptions,
): Promise<ExecResult> {
  const [binary, ...args] = command;
  if (binary === undefined) {
    throw new Error("Cannot execute an empty command");
  }

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout += text;
      options.onOutput?.(text);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      options.onOutput?.(text);
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        command,
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

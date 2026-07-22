import { describe, expect, it } from "vitest";
import { createGitCheckpoint, inspectProject } from "./project.js";

describe("inspectProject", () => {
  it("returns unknown for missing directories", async () => {
    const result = await inspectProject("/path/that/does/not/exist/decomp-studio-test");
    expect(result.exists).toBe(false);
    expect(result.base).toBe("unknown");
  });

  it("rejects checkpoints outside git worktrees", async () => {
    await expect(createGitCheckpoint("/tmp", "test")).rejects.toThrow(
      "Project is not a git worktree",
    );
  });
});

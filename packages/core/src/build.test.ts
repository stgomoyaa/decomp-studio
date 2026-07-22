import { describe, expect, it } from "vitest";
import { parseBuildDiagnostics } from "./build.js";

describe("parseBuildDiagnostics", () => {
  it("extracts gcc diagnostics", () => {
    expect(
      parseBuildDiagnostics("src/foo.c:12:34: error: expected ';' before '}' token"),
    ).toEqual([
      {
        file: "src/foo.c",
        line: 12,
        column: 34,
        severity: "error",
        message: "expected ';' before '}' token",
      },
    ]);
  });

  it("extracts linker diagnostics", () => {
    expect(parseBuildDiagnostics("arm-none-eabi-ld: error: undefined reference to foo"))
      .toEqual([
        {
          file: null,
          line: null,
          column: null,
          severity: "error",
          message: "arm-none-eabi-ld: error: undefined reference to foo",
        },
      ]);
  });
});

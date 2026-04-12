import { describe, expect, test } from "vitest";

import {
  getDefaultExportFramesDir,
  getDefaultExportPath,
  getDefaultProjectPath,
} from "../src/cli/output-paths.js";

describe("default output paths", () => {
  test("project create defaults to output/output.piskel in cwd", () => {
    expect(getDefaultProjectPath("C:/workspace")).toBe(
      "C:\\workspace\\output\\output.piskel",
    );
  });

  test("export commands default to output/output.* in cwd", () => {
    expect(getDefaultExportPath("C:/workspace", "png")).toBe(
      "C:\\workspace\\output\\output.png",
    );
    expect(getDefaultExportPath("C:/workspace", "gif")).toBe(
      "C:\\workspace\\output\\output.gif",
    );
    expect(getDefaultExportPath("C:/workspace", "spritesheet")).toBe(
      "C:\\workspace\\output\\output.png",
    );
    expect(getDefaultExportPath("C:/workspace", "metadata")).toBe(
      "C:\\workspace\\output\\output.json",
    );
  });

  test("export frames defaults to output/frames in cwd", () => {
    expect(getDefaultExportFramesDir("C:/workspace")).toBe(
      "C:\\workspace\\output\\frames",
    );
  });
});

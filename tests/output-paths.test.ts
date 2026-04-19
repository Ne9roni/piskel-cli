import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  getDefaultExportFramesDir,
  getDefaultExportPath,
  getDefaultProjectPath,
} from "../src/cli/output-paths.js";

/** Absolute cwd fixture — avoid Windows-style roots on POSIX (they resolve relative to cwd). */
const fixtureCwd = resolve("/workspace");

describe("default output paths", () => {
  test("project create defaults to output/output.piskel in cwd", () => {
    expect(getDefaultProjectPath(fixtureCwd)).toBe(
      resolve(fixtureCwd, "output", "output.piskel"),
    );
  });

  test("export commands default to output/output.* in cwd", () => {
    expect(getDefaultExportPath(fixtureCwd, "png")).toBe(
      resolve(fixtureCwd, "output", "output.png"),
    );
    expect(getDefaultExportPath(fixtureCwd, "gif")).toBe(
      resolve(fixtureCwd, "output", "output.gif"),
    );
    expect(getDefaultExportPath(fixtureCwd, "spritesheet")).toBe(
      resolve(fixtureCwd, "output", "output.png"),
    );
    expect(getDefaultExportPath(fixtureCwd, "metadata")).toBe(
      resolve(fixtureCwd, "output", "output.json"),
    );
  });

  test("export frames defaults to output/frames in cwd", () => {
    expect(getDefaultExportFramesDir(fixtureCwd)).toBe(
      resolve(fixtureCwd, "output", "frames"),
    );
  });
});

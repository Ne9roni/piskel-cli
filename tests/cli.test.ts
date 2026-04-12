import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { PNG } from "pngjs";
import { afterEach, describe, expect, test } from "vitest";

import { runCli } from "../src/cli/run.js";
import { loadPiskelProject } from "../src/probe/piskel.js";

const OFFICIAL_FIXTURE = resolve(
  "tests/fixtures/piskel-gif-tests/low-colors-with-transparency.piskel",
);

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("cli", () => {
  test("prints usage for --help and -h", async () => {
    const helpIo = createMemoryIo();
    const shortHelpIo = createMemoryIo();

    const helpExitCode = await runCli(["--help"], helpIo);
    const shortHelpExitCode = await runCli(["-h"], shortHelpIo);

    expect(helpExitCode).toBe(0);
    expect(shortHelpExitCode).toBe(0);
    expect(helpIo.stderr).toEqual([]);
    expect(shortHelpIo.stderr).toEqual([]);
    expect(helpIo.stdout.join("\n")).toMatch(/Usage:/);
    expect(shortHelpIo.stdout.join("\n")).toMatch(/Usage:/);
  });

  test("project create writes a loadable piskel file with default values", async () => {
    const io = createMemoryIo();
    const outputDir = await createTempDir("piskel-cli-create-");
    const outputPath = join(outputDir, "heart.piskel");

    const exitCode = await runCli(
      [
        "project",
        "create",
        "--width",
        "32",
        "--height",
        "16",
        "--output",
        outputPath,
        "--json",
      ],
      io,
    );

    expect(exitCode).toBe(0);
    expect(io.stderr).toEqual([]);

    const payload = JSON.parse(io.stdout.join("\n")) as {
      ok: true;
      data: {
        project: {
          name: string;
          width: number;
          height: number;
          fps: number;
          layerCount: number;
          frameCount: number;
          outputPath: string;
        };
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.data.project.name).toBe("heart");
    expect(payload.data.project.width).toBe(32);
    expect(payload.data.project.height).toBe(16);
    expect(payload.data.project.fps).toBe(12);
    expect(payload.data.project.layerCount).toBe(1);
    expect(payload.data.project.frameCount).toBe(1);

    const project = await loadPiskelProject(outputPath);
    expect(project.name).toBe("heart");
    expect(project.width).toBe(32);
    expect(project.height).toBe(16);
    expect(project.fps).toBe(12);
    expect(project.layers).toHaveLength(1);
    expect(project.layers[0]?.frames).toHaveLength(1);
  });

  test("project create accepts explicit name and fps", async () => {
    const io = createMemoryIo();
    const outputDir = await createTempDir("piskel-cli-create-custom-");
    const outputPath = join(outputDir, "custom.piskel");

    const exitCode = await runCli(
      [
        "project",
        "create",
        "--width",
        "8",
        "--height",
        "8",
        "--fps",
        "24",
        "--name",
        "custom-name",
        "--output",
        outputPath,
      ],
      io,
    );

    expect(exitCode).toBe(0);
    expect(io.stderr).toEqual([]);

    const project = await loadPiskelProject(outputPath);
    expect(project.name).toBe("custom-name");
    expect(project.fps).toBe(24);
  });

  test("project create rejects missing required dimensions", async () => {
    const io = createMemoryIo();
    const outputDir = await createTempDir("piskel-cli-create-invalid-");
    const outputPath = join(outputDir, "invalid.piskel");

    const exitCode = await runCli(
      ["project", "create", "--width", "16", "--output", outputPath],
      io,
    );

    expect(exitCode).toBe(1);
    expect(io.stdout).toEqual([]);
    expect(io.stderr.join("\n")).toMatch(/height/i);
  });

  test("project info outputs machine-readable metadata with --json", async () => {
    const io = createMemoryIo();

    const exitCode = await runCli(
      ["project", "info", OFFICIAL_FIXTURE, "--json"],
      io,
    );

    expect(exitCode).toBe(0);
    expect(io.stderr).toEqual([]);

    const payload = JSON.parse(io.stdout.join("\n")) as {
      ok: true;
      data: {
        project: {
          name: string;
          width: number;
          height: number;
          fps: number;
          layerCount: number;
          frameCount: number;
        };
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.data.project.name).toBe("low-colors-with-transparency");
    expect(payload.data.project.width).toBe(60);
    expect(payload.data.project.height).toBe(60);
    expect(payload.data.project.fps).toBe(12);
    expect(payload.data.project.layerCount).toBe(1);
    expect(payload.data.project.frameCount).toBe(2);
  });

  test("export png writes spritesheet and returns json result", async () => {
    const io = createMemoryIo();
    const outputDir = await createTempDir("piskel-cli-export-");
    const outputPath = join(outputDir, "fixture.png");

    const exitCode = await runCli(
      [
        "export",
        "png",
        OFFICIAL_FIXTURE,
        "--output",
        outputPath,
        "--columns",
        "2",
        "--json",
      ],
      io,
    );

    expect(exitCode).toBe(0);
    expect(io.stderr).toEqual([]);

    const payload = JSON.parse(io.stdout.join("\n")) as {
      ok: true;
      data: {
        export: { outputPath: string; width: number; height: number };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.export.outputPath).toBe(outputPath);
    expect(payload.data.export.width).toBe(120);
    expect(payload.data.export.height).toBe(60);

    const png = PNG.sync.read(await readFile(outputPath));
    expect(png.width).toBe(120);
    expect(png.height).toBe(60);
  });

  test("export png can export a single frame", async () => {
    const io = createMemoryIo();
    const outputDir = await createTempDir("piskel-cli-frame-");
    const outputPath = join(outputDir, "frame.png");

    const exitCode = await runCli(
      [
        "export",
        "png",
        OFFICIAL_FIXTURE,
        "--output",
        outputPath,
        "--frame",
        "1",
      ],
      io,
    );

    expect(exitCode).toBe(0);
    expect(io.stderr).toEqual([]);

    const png = PNG.sync.read(await readFile(outputPath));
    expect(png.width).toBe(60);
    expect(png.height).toBe(60);
  });

  test("export png defaults to cwd output/output.png when omitted", async () => {
    const io = createMemoryIo();
    const defaultOutputPath = resolve("output", "output.png");

    const exitCode = await runCli(
      ["export", "png", OFFICIAL_FIXTURE, "--json"],
      io,
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(io.stdout.join("\n")) as {
      ok: true;
      data: { export: { outputPath: string } };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.export.outputPath).toBe(defaultOutputPath);

    const png = PNG.sync.read(await readFile(defaultOutputPath));
    expect(png.width).toBe(120);
    expect(png.height).toBe(60);
  });

  test("rejects out-of-range frame indexes instead of exporting blank png", async () => {
    const io = createMemoryIo();
    const outputDir = await createTempDir("piskel-cli-invalid-frame-");
    const outputPath = join(outputDir, "frame.png");

    const exitCode = await runCli(
      [
        "export",
        "png",
        OFFICIAL_FIXTURE,
        "--output",
        outputPath,
        "--frame",
        "99",
        "--json",
      ],
      io,
    );

    expect(exitCode).toBe(1);
    const payload = JSON.parse(io.stdout.join("\n")) as {
      ok: false;
      error: { code: string; message: string };
    };
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("FRAME_INDEX_OUT_OF_RANGE");
    expect(payload.error.message).toMatch(/frame index/i);
  });

  test("layer list returns a json usage error when project path is missing", async () => {
    const io = createMemoryIo();

    const exitCode = await runCli(["layer", "list", "--json"], io);

    expect(exitCode).toBe(1);
    expect(io.stderr).toEqual([]);
    const payload = JSON.parse(io.stdout.join("\n")) as {
      ok: false;
      error: { code: string; message: string };
    };
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("USAGE_ERROR");
    expect(payload.error.message).toMatch(/Missing project path/i);
  });
});

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createMemoryIo() {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    stdout,
    stderr,
    writeStdout: (line: string) => {
      stdout.push(line);
    },
    writeStderr: (line: string) => {
      stderr.push(line);
    },
  };
}

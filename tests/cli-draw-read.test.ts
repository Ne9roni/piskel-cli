import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { runCli } from "../src/cli/run.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("cli draw/read commands", () => {
  test("draw pixel and read pixel work on the default frame and layer", async () => {
    const { projectPath } = await createProject();
    const io = createMemoryIo();

    expect(
      await runCli(
        ["draw", "pixel", projectPath, "--x", "1", "--y", "2", "--color", "#ff0000"],
        io,
      ),
    ).toBe(0);

    const exitCode = await runCli(
      ["read", "pixel", projectPath, "--x", "1", "--y", "2", "--json"],
      io,
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        pixel: { x: number; y: number; color: string };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.pixel).toEqual({ x: 1, y: 2, color: "#ff0000" });
  });

  test("draw pixels from json input and read frame return the expected grid", async () => {
    const { projectPath, dir } = await createProject();
    const io = createMemoryIo();
    const pixelsPath = join(dir, "pixels.json");

    await writeFile(
      pixelsPath,
      JSON.stringify([
        { x: 0, y: 0, color: "#00ff00" },
        { x: 1, y: 0, color: "#0000ff" },
      ]),
      "utf8",
    );

    expect(
      await runCli(["draw", "pixels", projectPath, "--input", pixelsPath], io),
    ).toBe(0);

    const exitCode = await runCli(
      ["read", "frame", projectPath, "--json"],
      io,
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        frame: { pixels: string[][] };
      };
    };

    expect(payload.ok).toBe(true);
    expect(payload.data.frame.pixels[0]?.[0]).toBe("#00ff00");
    expect(payload.data.frame.pixels[0]?.[1]).toBe("#0000ff");
    expect(payload.data.frame.pixels[1]?.[0]).toBe("transparent");
  });

  test("draw line rect circle fill erase and clear frame update palette and bounds", async () => {
    const { projectPath } = await createProject();
    const io = createMemoryIo();

    expect(await runCli(["draw", "line", projectPath, "--x1", "0", "--y1", "0", "--x2", "4", "--y2", "0", "--color", "#ff0000"], io)).toBe(0);
    expect(await runCli(["draw", "rect", projectPath, "--x1", "0", "--y1", "1", "--x2", "2", "--y2", "3", "--color", "#00ff00", "--filled"], io)).toBe(0);
    expect(await runCli(["draw", "circle", projectPath, "--x1", "2", "--y1", "2", "--x2", "4", "--y2", "4", "--color", "#0000ff"], io)).toBe(0);
    expect(await runCli(["fill", "area", projectPath, "--x", "4", "--y", "4", "--color", "#ffff00"], io)).toBe(0);
    expect(await runCli(["erase", "pixel", projectPath, "--x", "4", "--y", "0"], io)).toBe(0);

    let exitCode = await runCli(["read", "palette", projectPath, "--json"], io);
    expect(exitCode).toBe(0);
    const palettePayload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        palette: { colors: string[] };
      };
    };
    expect(palettePayload.ok).toBe(true);
    expect(palettePayload.data.palette.colors).toEqual(
      expect.arrayContaining(["#ff0000", "#00ff00", "#0000ff", "#ffff00"]),
    );

    exitCode = await runCli(["read", "bounds", projectPath, "--json"], io);
    expect(exitCode).toBe(0);
    const boundsPayload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        bounds: { minX: number; minY: number; maxX: number; maxY: number };
      };
    };
    expect(boundsPayload.ok).toBe(true);
    expect(boundsPayload.data.bounds).toEqual({ minX: 0, minY: 0, maxX: 4, maxY: 4 });

    expect(await runCli(["clear", "frame", projectPath], io)).toBe(0);
    exitCode = await runCli(["read", "bounds", projectPath, "--json"], io);
    expect(exitCode).toBe(0);
    const clearedBounds = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        bounds: null;
      };
    };
    expect(clearedBounds.ok).toBe(true);
    expect(clearedBounds.data.bounds).toBeNull();
  });

  test("read project summarizes current layer and frame counts", async () => {
    const { projectPath } = await createProject();
    const io = createMemoryIo();

    expect(await runCli(["layer", "add", projectPath, "--name", "shadow"], io)).toBe(0);
    expect(await runCli(["frame", "add", projectPath], io)).toBe(0);

    const exitCode = await runCli(["read", "project", projectPath, "--json"], io);

    expect(exitCode).toBe(0);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        project: {
          width: number;
          height: number;
          layerCount: number;
          frameCount: number;
        };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.project.width).toBe(5);
    expect(payload.data.project.height).toBe(5);
    expect(payload.data.project.layerCount).toBe(2);
    expect(payload.data.project.frameCount).toBe(2);
  });
});

async function createProject(): Promise<{ projectPath: string; dir: string }> {
  const dir = await createTempDir("piskel-cli-draw-read-");
  const projectPath = join(dir, "project.piskel");
  const io = createMemoryIo();

  const exitCode = await runCli(
    [
      "project",
      "create",
      "--width",
      "5",
      "--height",
      "5",
      "--output",
      projectPath,
    ],
    io,
  );

  expect(exitCode).toBe(0);
  return { projectPath, dir };
}

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

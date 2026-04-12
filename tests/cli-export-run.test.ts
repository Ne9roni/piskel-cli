import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PNG } from "pngjs";
import { afterEach, describe, expect, test } from "vitest";

import { runCli } from "../src/cli/run.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("cli export/run commands", () => {
  test("export gif writes a gif file", async () => {
    const { projectPath, dir } = await createProjectWithContent();
    const io = createMemoryIo();
    const outputPath = join(dir, "anim.gif");

    const exitCode = await runCli(
      ["export", "gif", projectPath, "--output", outputPath, "--json"],
      io,
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        export: { outputPath: string };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.export.outputPath).toBe(outputPath);
    const gif = await readFile(outputPath);
    expect(gif.subarray(0, 6).toString("ascii")).toBe("GIF89a");
  });

  test("export spritesheet writes png and metadata", async () => {
    const { projectPath, dir } = await createProjectWithContent();
    const io = createMemoryIo();
    const outputPath = join(dir, "sheet.png");
    const metadataPath = join(dir, "sheet.json");

    const exitCode = await runCli(
      [
        "export",
        "spritesheet",
        projectPath,
        "--output",
        outputPath,
        "--metadata",
        metadataPath,
        "--columns",
        "2",
        "--json",
      ],
      io,
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        export: { outputPath: string; metadataPath: string | null };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.export.outputPath).toBe(outputPath);
    expect(payload.data.export.metadataPath).toBe(metadataPath);
    const png = PNG.sync.read(await readFile(outputPath));
    expect(png.width).toBe(10);
    expect(png.height).toBe(5);

    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as {
      frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
      meta: { image: string };
    };
    expect(Object.keys(metadata.frames)).toHaveLength(2);
    expect(metadata.meta.image).toBe("sheet.png");
  });

  test("export frames writes one png per frame", async () => {
    const { projectPath, dir } = await createProjectWithContent();
    const io = createMemoryIo();
    const outputDir = join(dir, "frames");

    const exitCode = await runCli(
      ["export", "frames", projectPath, "--output-dir", outputDir, "--json"],
      io,
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        export: { outputDir: string; frameCount: number };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.export.outputDir).toBe(outputDir);
    expect(payload.data.export.frameCount).toBe(2);
    const frame0 = PNG.sync.read(await readFile(join(outputDir, "frame-0.png")));
    const frame1 = PNG.sync.read(await readFile(join(outputDir, "frame-1.png")));
    expect(frame0.width).toBe(5);
    expect(frame0.height).toBe(5);
    expect(frame1.width).toBe(5);
    expect(frame1.height).toBe(5);
  });

  test("run executes a plan sequentially", async () => {
    const dir = await createTempDir("piskel-cli-run-");
    const io = createMemoryIo();
    const projectPath = join(dir, "run-project.piskel");
    const outputPath = join(dir, "run-project.png");
    const planPath = join(dir, "plan.json");

    await writeFile(
      planPath,
      JSON.stringify({
        steps: [
          {
            command: "project.create",
            args: { width: 4, height: 4, output: projectPath, name: "run-project" },
          },
          {
            command: "draw.pixel",
            args: { project: projectPath, x: 1, y: 1, color: "#ff0000" },
          },
          {
            command: "export.png",
            args: { project: projectPath, output: outputPath },
          },
        ],
      }),
      "utf8",
    );

    const exitCode = await runCli(["run", planPath, "--json"], io);

    expect(exitCode).toBe(0);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        run: { status: string; steps: number };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.run.status).toBe("completed");
    expect(payload.data.run.steps).toBe(3);
    const png = PNG.sync.read(await readFile(outputPath));
    expect(png.width).toBe(4);
    expect(png.height).toBe(4);
  });

  test("run accepts --json before the plan path", async () => {
    const dir = await createTempDir("piskel-cli-run-flags-");
    const io = createMemoryIo();
    const projectPath = join(dir, "run-project.piskel");
    const planPath = join(dir, "plan.json");

    await writeFile(
      planPath,
      JSON.stringify({
        steps: [
          {
            command: "project.create",
            args: { width: 4, height: 4, output: projectPath, name: "run-project" },
          },
        ],
      }),
      "utf8",
    );

    const exitCode = await runCli(["run", "--json", planPath], io);

    expect(exitCode).toBe(0);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        run: { status: string; steps: number };
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.run.status).toBe("completed");
    expect(payload.data.run.steps).toBe(1);
  });

  test("run rejects plans without a steps array", async () => {
    const dir = await createTempDir("piskel-cli-run-invalid-plan-");
    const io = createMemoryIo();
    const planPath = join(dir, "plan.json");

    await writeFile(planPath, JSON.stringify({}), "utf8");

    const exitCode = await runCli(["run", planPath, "--json"], io);

    expect(exitCode).toBe(1);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: false;
      error: { code: string; message: string };
    };
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("USAGE_ERROR");
    expect(payload.error.message).toMatch(/steps/i);
  });

  test("run surfaces nested json step failures", async () => {
    const dir = await createTempDir("piskel-cli-run-nested-error-");
    const io = createMemoryIo();
    const planPath = join(dir, "plan.json");

    await writeFile(
      planPath,
      JSON.stringify({
        steps: [
          {
            command: "project.info",
            args: { json: true },
          },
        ],
      }),
      "utf8",
    );

    const exitCode = await runCli(["run", planPath, "--json"], io);

    expect(exitCode).toBe(1);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: false;
      error: { code: string; message: string };
    };
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("USAGE_ERROR");
    expect(payload.error.message).toMatch(/project\.info/i);
    expect(payload.error.message).toMatch(/Missing project path/i);
  });
});

async function createProjectWithContent(): Promise<{ projectPath: string; dir: string }> {
  const dir = await createTempDir("piskel-cli-export-run-");
  const projectPath = join(dir, "project.piskel");
  const io = createMemoryIo();

  expect(
    await runCli(
      ["project", "create", "--width", "5", "--height", "5", "--output", projectPath],
      io,
    ),
  ).toBe(0);
  expect(await runCli(["frame", "add", projectPath], io)).toBe(0);
  expect(await runCli(["draw", "pixel", projectPath, "--x", "0", "--y", "0", "--color", "#ff0000"], io)).toBe(0);
  expect(await runCli(["draw", "pixel", projectPath, "--frame", "1", "--x", "4", "--y", "4", "--color", "#00ff00"], io)).toBe(0);

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

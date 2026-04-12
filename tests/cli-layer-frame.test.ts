import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { runCli } from "../src/cli/run.js";
import { loadPiskelProject } from "../src/probe/piskel.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("cli layer/frame commands", () => {
  test("layer add and layer list keep frame counts synchronized", async () => {
    const projectPath = await createProject();
    const io = createMemoryIo();

    let exitCode = await runCli(
      ["layer", "add", projectPath, "--name", "shadow", "--json"],
      io,
    );

    expect(exitCode).toBe(0);

    exitCode = await runCli(
      ["layer", "list", projectPath, "--json"],
      io,
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        layers: Array<{ index: number; name: string; opacity: number; frameCount: number }>;
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.layers).toHaveLength(2);
    expect(payload.data.layers[1]?.name).toBe("shadow");
    expect(payload.data.layers[1]?.frameCount).toBe(1);

    const project = await loadPiskelProject(projectPath);
    expect(project.layers).toHaveLength(2);
    expect(project.layers[1]?.frames).toHaveLength(1);
  });

  test("layer rename set-opacity move and remove update persisted order", async () => {
    const projectPath = await createProject();
    const io = createMemoryIo();

    expect(await runCli(["layer", "add", projectPath, "--name", "shadow"], io)).toBe(0);
    expect(await runCli(["layer", "rename", projectPath, "--layer", "shadow", "--name", "outline"], io)).toBe(0);
    expect(await runCli(["layer", "set-opacity", projectPath, "--layer", "outline", "--opacity", "0.5"], io)).toBe(0);
    expect(await runCli(["layer", "move", projectPath, "--layer", "outline", "--to", "0"], io)).toBe(0);

    let project = await loadPiskelProject(projectPath);
    expect(project.layers[0]?.name).toBe("outline");
    expect(project.layers[0]?.opacity).toBe(0.5);

    expect(await runCli(["layer", "remove", projectPath, "--layer", "outline"], io)).toBe(0);
    project = await loadPiskelProject(projectPath);
    expect(project.layers).toHaveLength(1);
    expect(project.layers[0]?.name).toBe("Layer 1");

    const exitCode = await runCli(["layer", "remove", projectPath, "--layer", "0"], io);
    expect(exitCode).toBe(1);
    expect(io.stderr.join("\n")).toMatch(/last layer/i);
  });

  test("frame add duplicate move remove and list keep all layers in sync", async () => {
    const projectPath = await createProject();
    const io = createMemoryIo();

    expect(await runCli(["layer", "add", projectPath, "--name", "shadow"], io)).toBe(0);
    expect(await runCli(["frame", "add", projectPath, "--json"], io)).toBe(0);
    expect(await runCli(["frame", "duplicate", projectPath, "--frame", "0"], io)).toBe(0);
    expect(await runCli(["frame", "move", projectPath, "--frame", "2", "--to", "0"], io)).toBe(0);
    expect(await runCli(["frame", "remove", projectPath, "--frame", "1"], io)).toBe(0);

    const exitCode = await runCli(["frame", "list", projectPath, "--json"], io);
    expect(exitCode).toBe(0);

    const payload = JSON.parse(io.stdout.at(-1) ?? "{}") as {
      ok: true;
      data: {
        frames: Array<{ index: number }>;
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.frames).toHaveLength(2);
    expect(payload.data.frames[0]?.index).toBe(0);
    expect(payload.data.frames[1]?.index).toBe(1);

    const project = await loadPiskelProject(projectPath);
    expect(project.layers[0]?.frames).toHaveLength(2);
    expect(project.layers[1]?.frames).toHaveLength(2);
  });
});

async function createProject(): Promise<string> {
  const dir = await createTempDir("piskel-cli-layer-frame-");
  const path = join(dir, "project.piskel");
  const io = createMemoryIo();

  const exitCode = await runCli(
    [
      "project",
      "create",
      "--width",
      "8",
      "--height",
      "8",
      "--output",
      path,
    ],
    io,
  );

  expect(exitCode).toBe(0);
  return path;
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

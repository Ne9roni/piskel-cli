import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PNG } from "pngjs";
import { afterEach, describe, expect, test } from "vitest";

import {
  exportProjectToPng,
  loadPiskelProject,
  serializePiskelProject,
} from "../src/probe/piskel.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("headless piskel probe", () => {
  test("loads a version 2 .piskel file into a project model", async () => {
    const projectPath = await writeProjectFile(createSingleFrameProjectPayload());

    const project = await loadPiskelProject(projectPath);

    expect(project.width).toBe(2);
    expect(project.height).toBe(2);
    expect(project.fps).toBe(12);
    expect(project.layers).toHaveLength(1);
    expect(project.layers[0]?.name).toBe("Layer 1");
    expect(project.layers[0]?.frames).toHaveLength(1);
    expect(readPixel(project.layers[0]!.frames[0]!, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(readPixel(project.layers[0]!.frames[0]!, 1, 0)).toEqual([0, 255, 0, 255]);
    expect(readPixel(project.layers[0]!.frames[0]!, 0, 1)).toEqual([0, 0, 255, 255]);
    expect(readPixel(project.layers[0]!.frames[0]!, 1, 1)).toEqual([0, 0, 0, 0]);
  });

  test("serializes a loaded project back to piskel-compatible JSON", async () => {
    const projectPath = await writeProjectFile(createSingleFrameProjectPayload());
    const project = await loadPiskelProject(projectPath);

    const serialized = await serializePiskelProject(project);
    const reparsed = JSON.parse(serialized) as {
      modelVersion: number;
      piskel: { width: number; height: number; layers: string[] };
    };

    expect(reparsed.modelVersion).toBe(2);
    expect(reparsed.piskel.width).toBe(2);
    expect(reparsed.piskel.height).toBe(2);
    expect(reparsed.piskel.layers).toHaveLength(1);

    const encodedLayer = JSON.parse(reparsed.piskel.layers[0]!);
    expect(encodedLayer.frameCount).toBe(1);
    expect(encodedLayer.chunks).toHaveLength(1);
    expect(encodedLayer.chunks[0].layout).toEqual([[0]]);
    expect(encodedLayer.chunks[0].base64PNG).toMatch(/^data:image\/png;base64,/);
  });

  test("exports a loaded project to a headless PNG spritesheet", async () => {
    const projectPath = await writeProjectFile(createTwoFrameProjectPayload());
    const project = await loadPiskelProject(projectPath);
    const outputPath = join(tempDirs[0]!, "spritesheet.png");

    await exportProjectToPng(project, { outputPath, columns: 2 });

    const output = PNG.sync.read(await readFile(outputPath));
    expect(output.width).toBe(4);
    expect(output.height).toBe(2);
    expect(readPngPixel(output, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(readPngPixel(output, 1, 1)).toEqual([0, 0, 0, 0]);
    expect(readPngPixel(output, 2, 0)).toEqual([255, 255, 0, 255]);
    expect(readPngPixel(output, 3, 1)).toEqual([0, 0, 0, 255]);
  });

  test("keeps sparse frame indexes instead of collapsing them", async () => {
    const projectPath = await writeProjectFile(
      JSON.stringify({
        modelVersion: 2,
        piskel: {
          name: "sparse",
          description: "probe",
          fps: 12,
          width: 2,
          height: 2,
          hiddenFrames: [],
          layers: [
            JSON.stringify({
              name: "Layer 1",
              opacity: 1,
              frameCount: 2,
              chunks: [
                {
                  layout: [[1]],
                  base64PNG: createBase64Png(2, 2, [
                    [255, 0, 0, 255],
                    [0, 255, 0, 255],
                    [0, 0, 255, 255],
                    [0, 0, 0, 0],
                  ]),
                },
              ],
            }),
          ],
        },
      }),
    );

    const project = await loadPiskelProject(projectPath);

    expect(project.layers[0]?.frames).toHaveLength(2);
    expect(readPixel(project.layers[0]!.frames[0]!, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(readPixel(project.layers[0]!.frames[1]!, 0, 0)).toEqual([255, 0, 0, 255]);
  });

  test("rejects export when layer frame counts are not synchronized", async () => {
    const project = {
      modelVersion: 2,
      name: "unsynced",
      description: "probe",
      fps: 12,
      width: 2,
      height: 2,
      hiddenFrames: [],
      layers: [
        {
          name: "Layer 1",
          opacity: 1,
          frames: [createFrameFromPixels(2, 2, [[255, 0, 0, 255], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])],
        },
        {
          name: "Layer 2",
          opacity: 1,
          frames: [
            createFrameFromPixels(2, 2, [[0, 255, 0, 255], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]),
            createFrameFromPixels(2, 2, [[0, 0, 255, 255], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]),
          ],
        },
      ],
    };

    await expect(
      exportProjectToPng(project, {
        outputPath: join(await createTempDir("piskel-cli-unsynced-"), "out.png"),
      }),
    ).rejects.toThrow(/synchronized/i);

    await expect(serializePiskelProject(project)).rejects.toThrow(/synchronized/i);
  });

  test("rejects chunk layouts that reference frame indexes outside frameCount", async () => {
    const projectPath = await writeProjectFile(
      JSON.stringify({
        modelVersion: 2,
        piskel: {
          name: "invalid-layout",
          description: "probe",
          fps: 12,
          width: 2,
          height: 2,
          hiddenFrames: [],
          layers: [
            JSON.stringify({
              name: "Layer 1",
              opacity: 1,
              frameCount: 1,
              chunks: [
                {
                  layout: [[999999]],
                  base64PNG: createBase64Png(2, 2, [
                    [255, 0, 0, 255],
                    [0, 255, 0, 255],
                    [0, 0, 255, 255],
                    [0, 0, 0, 0],
                  ]),
                },
              ],
            }),
          ],
        },
      }),
    );

    await expect(loadPiskelProject(projectPath)).rejects.toThrow(/frame index/i);
  });
});

async function writeProjectFile(payload: string): Promise<string> {
  const dir = await createTempDir("piskel-cli-");
  const filePath = join(dir, "fixture.piskel");
  await writeFile(filePath, payload, "utf8");
  return filePath;
}

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createSingleFrameProjectPayload(): string {
  return JSON.stringify({
    modelVersion: 2,
    piskel: {
      name: "single-frame",
      description: "probe",
      fps: 12,
      width: 2,
      height: 2,
      hiddenFrames: [],
      layers: [
        JSON.stringify({
          name: "Layer 1",
          opacity: 1,
          frameCount: 1,
          chunks: [
            {
              layout: [[0]],
              base64PNG: createBase64Png(2, 2, [
                [255, 0, 0, 255],
                [0, 255, 0, 255],
                [0, 0, 255, 255],
                [0, 0, 0, 0],
              ]),
            },
          ],
        }),
      ],
    },
  });
}

function createTwoFrameProjectPayload(): string {
  return JSON.stringify({
    modelVersion: 2,
    piskel: {
      name: "two-frame",
      description: "probe",
      fps: 12,
      width: 2,
      height: 2,
      hiddenFrames: [],
      layers: [
        JSON.stringify({
          name: "Layer 1",
          opacity: 1,
          frameCount: 2,
          chunks: [
            {
              layout: [[0], [1]],
              base64PNG: createBase64Png(4, 2, [
                [255, 0, 0, 255],
                [0, 255, 0, 255],
                [255, 255, 0, 255],
                [255, 255, 255, 255],
                [0, 0, 255, 255],
                [0, 0, 0, 0],
                [255, 0, 255, 255],
                [0, 0, 0, 255],
              ]),
            },
          ],
        }),
      ],
    },
  });
}

function createBase64Png(
  width: number,
  height: number,
  pixels: Array<[number, number, number, number]>,
): string {
  const png = new PNG({ width, height });

  pixels.forEach(([r, g, b, a], index) => {
    const offset = index * 4;
    png.data[offset] = r;
    png.data[offset + 1] = g;
    png.data[offset + 2] = b;
    png.data[offset + 3] = a;
  });

  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

function readPixel(
  frame: { width: number; pixels: Uint32Array },
  x: number,
  y: number,
): [number, number, number, number] {
  const pixel = frame.pixels[y * frame.width + x] ?? 0;
  return [
    pixel & 0xff,
    (pixel >> 8) & 0xff,
    (pixel >> 16) & 0xff,
    (pixel >> 24) & 0xff,
  ];
}

function readPngPixel(
  png: PNG,
  x: number,
  y: number,
): [number, number, number, number] {
  const offset = (y * png.width + x) * 4;
  return [
    png.data[offset] ?? 0,
    png.data[offset + 1] ?? 0,
    png.data[offset + 2] ?? 0,
    png.data[offset + 3] ?? 0,
  ];
}

function createFrameFromPixels(
  width: number,
  height: number,
  pixels: Array<[number, number, number, number]>,
): { width: number; height: number; pixels: Uint32Array } {
  const framePixels = new Uint32Array(width * height);
  const bytes = new Uint8Array(framePixels.buffer);

  pixels.forEach(([r, g, b, a], index) => {
    const offset = index * 4;
    bytes[offset] = r;
    bytes[offset + 1] = g;
    bytes[offset + 2] = b;
    bytes[offset + 3] = a;
  });

  return { width, height, pixels: framePixels };
}

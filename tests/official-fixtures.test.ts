import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { PNG } from "pngjs";
import { afterEach, describe, expect, test } from "vitest";

import {
  deserializePiskelProject,
  exportProjectToPng,
  loadPiskelProject,
  serializePiskelProject,
  type PiskelFrame,
  type PiskelProject,
} from "../src/probe/piskel.js";

const OFFICIAL_FIXTURES = [
  {
    name: "low-colors-no-transparency",
    path: resolve(
      "tests/fixtures/piskel-gif-tests/low-colors-no-transparency.piskel",
    ),
    expectTransparentPixels: false,
  },
  {
    name: "low-colors-with-transparency",
    path: resolve(
      "tests/fixtures/piskel-gif-tests/low-colors-with-transparency.piskel",
    ),
    expectTransparentPixels: true,
  },
] as const;

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("official piskel fixtures", () => {
  test.each(OFFICIAL_FIXTURES)(
    "loads official fixture $name",
    async ({ name, path, expectTransparentPixels }) => {
      const project = await loadPiskelProject(path);

      expect(project.name).toBe(name);
      expect(project.width).toBe(60);
      expect(project.height).toBe(60);
      expect(project.fps).toBe(12);
      expect(project.layers).toHaveLength(1);
      expect(project.layers[0]?.frames).toHaveLength(2);
      expect(countTransparentPixels(project)).toBeGreaterThan(
        expectTransparentPixels ? 0 : -1,
      );

      if (expectTransparentPixels) {
        expect(countTransparentPixels(project)).toBeGreaterThan(0);
      } else {
        expect(countTransparentPixels(project)).toBe(0);
      }
    },
  );

  test.each(OFFICIAL_FIXTURES)(
    "exports official fixture $name as expected spritesheet",
    async ({ path, expectTransparentPixels }) => {
      const project = await loadPiskelProject(path);
      const outputPath = join(await createTempDir("official-piskel-export-"), "out.png");

      await exportProjectToPng(project, { outputPath, columns: 2 });

      const png = PNG.sync.read(await readFile(outputPath));
      expect(png.width).toBe(120);
      expect(png.height).toBe(60);

      if (expectTransparentPixels) {
        expect(countTransparentPixelsInPng(png)).toBeGreaterThan(0);
      } else {
        expect(countTransparentPixelsInPng(png)).toBe(0);
      }
    },
  );

  test.each(OFFICIAL_FIXTURES)(
    "round-trips official fixture $name through serialize -> deserialize",
    async ({ path }) => {
      const project = await loadPiskelProject(path);
      const beforeStats = collectProjectStats(project);

      const serialized = await serializePiskelProject(project);
      const reparsed = deserializePiskelProject(serialized);
      const afterStats = collectProjectStats(reparsed);

      expect(afterStats).toEqual(beforeStats);
    },
  );
});

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function countTransparentPixels(project: PiskelProject): number {
  return project.layers.reduce((layerTotal, layer) => {
    return (
      layerTotal +
      layer.frames.reduce((frameTotal, frame) => {
        return frameTotal + countTransparentPixelsInFrame(frame);
      }, 0)
    );
  }, 0);
}

function countTransparentPixelsInFrame(frame: PiskelFrame): number {
  let total = 0;

  for (let index = 0; index < frame.pixels.length; index += 1) {
    const alpha = (frame.pixels[index]! >>> 24) & 0xff;
    if (alpha === 0) {
      total += 1;
    }
  }

  return total;
}

function countTransparentPixelsInPng(png: PNG): number {
  let total = 0;

  for (let offset = 3; offset < png.data.length; offset += 4) {
    if (png.data[offset] === 0) {
      total += 1;
    }
  }

  return total;
}

function collectProjectStats(project: PiskelProject) {
  return {
    name: project.name,
    width: project.width,
    height: project.height,
    fps: project.fps,
    hiddenFrames: [...project.hiddenFrames],
    layers: project.layers.map((layer) => ({
      name: layer.name,
      opacity: layer.opacity,
      frameCount: layer.frames.length,
      transparentPixels: layer.frames.map(countTransparentPixelsInFrame),
      opaquePixels: layer.frames.map((frame) => frame.pixels.length - countTransparentPixelsInFrame(frame)),
    })),
  };
}

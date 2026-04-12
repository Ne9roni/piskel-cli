import { readFile, writeFile } from "node:fs/promises";

import { PNG } from "pngjs";

export interface PiskelFrame {
  width: number;
  height: number;
  pixels: Uint32Array;
}

export interface PiskelLayer {
  name: string;
  opacity: number;
  frames: PiskelFrame[];
}

export interface PiskelProject {
  modelVersion: number;
  name: string;
  description: string;
  fps: number;
  width: number;
  height: number;
  hiddenFrames: number[];
  layers: PiskelLayer[];
}

export interface CreateProjectOptions {
  width: number;
  height: number;
  fps?: number;
  name: string;
}

export interface LayerInfo {
  index: number;
  name: string;
  opacity: number;
  frameCount: number;
}

export interface FrameInfo {
  index: number;
}

export interface PixelInput {
  x: number;
  y: number;
  color?: string;
}

interface SerializedProjectFile {
  modelVersion: number;
  piskel: {
    name?: string;
    description?: string;
    fps?: number;
    width: number;
    height: number;
    hiddenFrames?: number[];
    layers: string[];
  };
}

interface SerializedLayer {
  name: string;
  opacity?: number;
  frameCount: number;
  chunks?: Array<{
    base64PNG: string;
    layout: number[][];
  }>;
  base64PNG?: string;
}

export async function loadPiskelProject(filePath: string): Promise<PiskelProject> {
  const raw = await readFile(filePath, "utf8");
  return deserializePiskelProject(raw);
}

export function createEmptyProject(options: CreateProjectOptions): PiskelProject {
  const frame = createEmptyFrame(options.width, options.height);

  return {
    modelVersion: 2,
    name: options.name,
    description: "",
    fps: options.fps ?? 12,
    width: options.width,
    height: options.height,
    hiddenFrames: [],
    layers: [
      {
        name: "Layer 1",
        opacity: 1,
        frames: [frame],
      },
    ],
  };
}

export function deserializePiskelProject(raw: string): PiskelProject {
  const data = JSON.parse(raw) as SerializedProjectFile;

  if (data.modelVersion !== 2) {
    throw new Error(`Unsupported modelVersion: ${data.modelVersion}`);
  }

  const piskel = data.piskel;
  const layers = piskel.layers.map((layerString) =>
    deserializeLayer(JSON.parse(layerString) as SerializedLayer),
  );

  return {
    modelVersion: data.modelVersion,
    name: piskel.name ?? "Deserialized piskel",
    description: piskel.description ?? "",
    fps: piskel.fps ?? 12,
    width: piskel.width,
    height: piskel.height,
    hiddenFrames: piskel.hiddenFrames ?? [],
    layers,
  };
}

export async function serializePiskelProject(project: PiskelProject): Promise<string> {
  assertSynchronizedProject(project);
  const layers = await Promise.all(project.layers.map(serializeLayer));

  return JSON.stringify({
    modelVersion: 2,
    piskel: {
      name: project.name,
      description: project.description,
      fps: project.fps,
      width: project.width,
      height: project.height,
      hiddenFrames: project.hiddenFrames,
      layers,
    },
  });
}

export async function savePiskelProject(
  project: PiskelProject,
  filePath: string,
): Promise<void> {
  const serialized = await serializePiskelProject(project);
  await writeFile(filePath, serialized, "utf8");
}

export function listLayers(project: PiskelProject): LayerInfo[] {
  return project.layers.map((layer, index) => ({
    index,
    name: layer.name,
    opacity: layer.opacity,
    frameCount: layer.frames.length,
  }));
}

export function addLayer(
  project: PiskelProject,
  name: string,
  opacity: number = 1,
): PiskelProject {
  const frameCount = getFrameCount(project);
  const frames = Array.from({ length: frameCount }, () =>
    createEmptyFrame(project.width, project.height),
  );

  project.layers.push({
    name,
    opacity,
    frames,
  });

  return project;
}

export function removeLayer(
  project: PiskelProject,
  layerRef: string,
): PiskelProject {
  if (project.layers.length <= 1) {
    throw new Error("Cannot remove the last layer from a project");
  }

  const layerIndex = resolveLayerIndex(project, layerRef);
  project.layers.splice(layerIndex, 1);
  return project;
}

export function renameLayer(
  project: PiskelProject,
  layerRef: string,
  name: string,
): PiskelProject {
  const layerIndex = resolveLayerIndex(project, layerRef);
  project.layers[layerIndex]!.name = name;
  return project;
}

export function setLayerOpacity(
  project: PiskelProject,
  layerRef: string,
  opacity: number,
): PiskelProject {
  if (opacity < 0 || opacity > 1) {
    throw new Error("Layer opacity must be between 0 and 1");
  }

  const layerIndex = resolveLayerIndex(project, layerRef);
  project.layers[layerIndex]!.opacity = Number(opacity.toFixed(3));
  return project;
}

export function moveLayer(
  project: PiskelProject,
  layerRef: string,
  toIndex: number,
): PiskelProject {
  const layerIndex = resolveLayerIndex(project, layerRef);
  const boundedIndex = Math.max(0, Math.min(toIndex, project.layers.length - 1));
  if (layerIndex === boundedIndex) {
    return project;
  }

  const [layer] = project.layers.splice(layerIndex, 1);
  project.layers.splice(boundedIndex, 0, layer!);
  return project;
}

export function listFrames(project: PiskelProject): FrameInfo[] {
  return Array.from({ length: getFrameCount(project) }, (_, index) => ({ index }));
}

export function addFrame(
  project: PiskelProject,
  index?: number,
): PiskelProject {
  const frameCount = getFrameCount(project);
  const insertAt = typeof index === "number"
    ? Math.max(0, Math.min(index, frameCount))
    : frameCount;

  for (const layer of project.layers) {
    layer.frames.splice(insertAt, 0, createEmptyFrame(project.width, project.height));
  }

  return project;
}

export function removeFrame(
  project: PiskelProject,
  frameIndex: number,
): PiskelProject {
  assertFrameIndex(project, frameIndex);
  if (getFrameCount(project) <= 1) {
    throw new Error("Cannot remove the last frame from a project");
  }

  for (const layer of project.layers) {
    layer.frames.splice(frameIndex, 1);
  }

  return project;
}

export function duplicateFrame(
  project: PiskelProject,
  frameIndex: number,
): PiskelProject {
  assertFrameIndex(project, frameIndex);

  for (const layer of project.layers) {
    const frame = layer.frames[frameIndex]!;
    layer.frames.splice(frameIndex + 1, 0, cloneFrame(frame));
  }

  return project;
}

export function moveFrame(
  project: PiskelProject,
  frameIndex: number,
  toIndex: number,
): PiskelProject {
  assertFrameIndex(project, frameIndex);
  const frameCount = getFrameCount(project);
  const boundedIndex = Math.max(0, Math.min(toIndex, frameCount - 1));

  for (const layer of project.layers) {
    const [frame] = layer.frames.splice(frameIndex, 1);
    layer.frames.splice(boundedIndex, 0, frame!);
  }

  return project;
}

export function drawPixelOnProject(
  project: PiskelProject,
  x: number,
  y: number,
  color: string,
  frameIndex: number = 0,
  layerRef?: string,
): PiskelProject {
  const frame = getMutableFrame(project, frameIndex, layerRef);
  if (!containsPixel(frame, x, y)) {
    throw new Error(`Coordinates ${x},${y} are out of bounds`);
  }
  frame.pixels[y * frame.width + x] = colorToInt(color);
  return project;
}

export function drawPixelsOnProject(
  project: PiskelProject,
  pixels: PixelInput[],
  color: string | undefined,
  frameIndex: number = 0,
  layerRef?: string,
): PiskelProject {
  const frame = getMutableFrame(project, frameIndex, layerRef);
  for (const pixel of pixels) {
    const resolvedColor = pixel.color ?? color;
    if (!resolvedColor) {
      throw new Error("draw pixels requires either per-pixel colors or a global --color");
    }
    if (containsPixel(frame, pixel.x, pixel.y)) {
      frame.pixels[pixel.y * frame.width + pixel.x] = colorToInt(resolvedColor);
    }
  }
  return project;
}

export function drawLineOnProject(
  project: PiskelProject,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  frameIndex: number = 0,
  layerRef?: string,
): PiskelProject {
  const frame = getMutableFrame(project, frameIndex, layerRef);
  for (const [x, y] of getLinePixels(x1, y1, x2, y2)) {
    if (containsPixel(frame, x, y)) {
      frame.pixels[y * frame.width + x] = colorToInt(color);
    }
  }
  return project;
}

export function drawRectOnProject(
  project: PiskelProject,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  filled: boolean,
  frameIndex: number = 0,
  layerRef?: string,
): PiskelProject {
  const frame = getMutableFrame(project, frameIndex, layerRef);
  const [minX, maxX] = orderPair(x1, x2);
  const [minY, maxY] = orderPair(y1, y2);
  const colorInt = colorToInt(color);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const isBorder = x === minX || x === maxX || y === minY || y === maxY;
      if ((filled || isBorder) && containsPixel(frame, x, y)) {
        frame.pixels[y * frame.width + x] = colorInt;
      }
    }
  }

  return project;
}

export function drawCircleOnProject(
  project: PiskelProject,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  frameIndex: number = 0,
  layerRef?: string,
): PiskelProject {
  const frame = getMutableFrame(project, frameIndex, layerRef);
  const [minX, maxX] = orderPair(x1, x2);
  const [minY, maxY] = orderPair(y1, y2);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const radiusX = Math.max((maxX - minX) / 2, 0.5);
  const radiusY = Math.max((maxY - minY) / 2, 0.5);
  const colorInt = colorToInt(color);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = (x - centerX) / radiusX;
      const dy = (y - centerY) / radiusY;
      const distance = dx * dx + dy * dy;
      if (distance >= 0.55 && distance <= 1.45 && containsPixel(frame, x, y)) {
        frame.pixels[y * frame.width + x] = colorInt;
      }
    }
  }

  return project;
}

export function fillAreaOnProject(
  project: PiskelProject,
  x: number,
  y: number,
  color: string,
  frameIndex: number = 0,
  layerRef?: string,
): PiskelProject {
  const frame = getMutableFrame(project, frameIndex, layerRef);
  if (!containsPixel(frame, x, y)) {
    throw new Error(`Coordinates ${x},${y} are out of bounds`);
  }

  const targetColor = frame.pixels[y * frame.width + x] ?? 0;
  const replacementColor = colorToInt(color);
  if (targetColor === replacementColor) {
    return project;
  }

  const queue: Array<[number, number]> = [[x, y]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [currentX, currentY] = queue.pop()!;
    const key = `${currentX},${currentY}`;
    if (visited.has(key) || !containsPixel(frame, currentX, currentY)) {
      continue;
    }
    visited.add(key);

    const offset = currentY * frame.width + currentX;
    if (frame.pixels[offset] !== targetColor) {
      continue;
    }

    frame.pixels[offset] = replacementColor;
    queue.push([currentX + 1, currentY], [currentX - 1, currentY], [currentX, currentY + 1], [currentX, currentY - 1]);
  }

  return project;
}

export function erasePixelOnProject(
  project: PiskelProject,
  x: number,
  y: number,
  frameIndex: number = 0,
  layerRef?: string,
): PiskelProject {
  const frame = getMutableFrame(project, frameIndex, layerRef);
  if (containsPixel(frame, x, y)) {
    frame.pixels[y * frame.width + x] = 0;
  }
  return project;
}

export function clearFrameOnProject(
  project: PiskelProject,
  frameIndex: number = 0,
  layerRef?: string,
): PiskelProject {
  if (typeof layerRef === "string") {
    const frame = getMutableFrame(project, frameIndex, layerRef);
    frame.pixels.fill(0);
    return project;
  }

  for (const layer of project.layers) {
    const frame = layer.frames[frameIndex];
    if (frame) {
      frame.pixels.fill(0);
    }
  }
  return project;
}

export function readPixelFromProject(
  project: PiskelProject,
  x: number,
  y: number,
  frameIndex: number = 0,
  layerRef?: string,
): string {
  const frame = getReadableFrame(project, frameIndex, layerRef);
  if (!containsPixel(frame, x, y)) {
    throw new Error(`Coordinates ${x},${y} are out of bounds`);
  }
  return intToDisplayColor(frame.pixels[y * frame.width + x] ?? 0);
}

export function readFrameFromProject(
  project: PiskelProject,
  frameIndex: number = 0,
  layerRef?: string,
): string[][] {
  const frame = getReadableFrame(project, frameIndex, layerRef);
  const rows: string[][] = [];
  for (let y = 0; y < frame.height; y += 1) {
    const row: string[] = [];
    for (let x = 0; x < frame.width; x += 1) {
      row.push(intToDisplayColor(frame.pixels[y * frame.width + x] ?? 0));
    }
    rows.push(row);
  }
  return rows;
}

export function readPaletteFromProject(
  project: PiskelProject,
  frameIndex: number = 0,
  layerRef?: string,
): string[] {
  const frame = getReadableFrame(project, frameIndex, layerRef);
  const colors = new Set<string>();
  for (const pixel of frame.pixels) {
    if (pixel !== 0) {
      colors.add(intToDisplayColor(pixel));
    }
  }
  return [...colors].sort();
}

export function readBoundsFromProject(
  project: PiskelProject,
  frameIndex: number = 0,
  layerRef?: string,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const frame = getReadableFrame(project, frameIndex, layerRef);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      if ((frame.pixels[y * frame.width + x] ?? 0) !== 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!Number.isFinite(minX)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

export function readProjectSummary(project: PiskelProject): {
  name: string;
  width: number;
  height: number;
  fps: number;
  layerCount: number;
  frameCount: number;
  hiddenFrameCount: number;
} {
  return {
    name: project.name,
    width: project.width,
    height: project.height,
    fps: project.fps,
    layerCount: project.layers.length,
    frameCount: getFrameCount(project),
    hiddenFrameCount: project.hiddenFrames.length,
  };
}

export async function exportProjectToPng(
  project: PiskelProject,
  options: {
    outputPath: string;
    columns?: number;
    frame?: number;
  },
): Promise<void> {
  assertSynchronizedProject(project);
  const frameCount = getFrameCount(project);

  if (typeof options.frame === "number") {
    const frame = renderCompositeFrame(project, options.frame);
    await writeFile(options.outputPath, PNG.sync.write(frameToPng(frame)));
    return;
  }

  const columns = clampColumns(options.columns ?? frameCount, frameCount);
  const rows = Math.ceil(frameCount / columns);
  const spritesheet = new PNG({
    width: project.width * columns,
    height: project.height * rows,
  });

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const frame = renderCompositeFrame(project, frameIndex);
    const offsetX = (frameIndex % columns) * project.width;
    const offsetY = Math.floor(frameIndex / columns) * project.height;
    blitFrame(frame, spritesheet, offsetX, offsetY);
  }

  await writeFile(options.outputPath, PNG.sync.write(spritesheet));
}

export async function exportProjectToGif(
  project: PiskelProject,
  outputPath: string,
  delayMs: number = 100,
): Promise<void> {
  const gifencModule = await import("gifenc");
  const moduleAny = gifencModule as {
    default?: unknown;
    GIFEncoder?: unknown;
    applyPalette?: unknown;
    quantize?: unknown;
  };
  const defaultAny = moduleAny.default as
    | {
        GIFEncoder?: unknown;
        applyPalette?: unknown;
        quantize?: unknown;
      }
    | ((opts?: Record<string, unknown>) => unknown)
    | undefined;

  const GIFEncoder =
    (moduleAny.GIFEncoder as
      | ((opts?: Record<string, unknown>) => {
          writeFrame: (
            index: Uint8Array,
            width: number,
            height: number,
            opts?: {
              palette?: number[][];
              delay?: number;
              repeat?: number;
              transparent?: boolean;
              transparentIndex?: number;
            },
          ) => void;
          finish: () => void;
          bytes: () => Uint8Array;
        })
      | undefined) ??
    (typeof defaultAny === "object"
      ? (defaultAny.GIFEncoder as
          | ((opts?: Record<string, unknown>) => {
              writeFrame: (
                index: Uint8Array,
                width: number,
                height: number,
                opts?: {
                  palette?: number[][];
                  delay?: number;
                  repeat?: number;
                  transparent?: boolean;
                  transparentIndex?: number;
                },
              ) => void;
              finish: () => void;
              bytes: () => Uint8Array;
            })
          | undefined)
      : undefined) ??
    (typeof defaultAny === "function"
      ? (defaultAny as (opts?: Record<string, unknown>) => {
          writeFrame: (
            index: Uint8Array,
            width: number,
            height: number,
            opts?: {
              palette?: number[][];
              delay?: number;
              repeat?: number;
              transparent?: boolean;
              transparentIndex?: number;
            },
          ) => void;
          finish: () => void;
          bytes: () => Uint8Array;
        })
      : undefined);

  const applyPalette =
    (moduleAny.applyPalette as
      | ((rgba: Uint8Array | Uint8ClampedArray, palette: number[][], format?: string) => Uint8Array)
      | undefined) ??
    (typeof defaultAny === "object"
      ? (defaultAny.applyPalette as
          | ((rgba: Uint8Array | Uint8ClampedArray, palette: number[][], format?: string) => Uint8Array)
          | undefined)
      : undefined);

  const quantize =
    (moduleAny.quantize as
      | ((rgba: Uint8Array | Uint8ClampedArray, maxColors: number, options?: Record<string, unknown>) => number[][])
      | undefined) ??
    (typeof defaultAny === "object"
      ? (defaultAny.quantize as
          | ((rgba: Uint8Array | Uint8ClampedArray, maxColors: number, options?: Record<string, unknown>) => number[][])
          | undefined)
      : undefined);

  if (!GIFEncoder || !applyPalette || !quantize) {
    throw new Error("Failed to load gifenc runtime exports");
  }

  assertSynchronizedProject(project);
  const frameCount = getFrameCount(project);
  const gif = GIFEncoder();

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const rgbaFrame = frameToRgba(renderCompositeFrame(project, frameIndex));
    const palette = quantize(rgbaFrame, 256, {
      format: "rgba4444",
      oneBitAlpha: true,
      clearAlpha: true,
    });
    const index = applyPalette(rgbaFrame, palette, "rgba4444");
    const transparentIndex = palette.findIndex(
      (entry: number[]) => (entry[3] ?? 255) === 0,
    );

    gif.writeFrame(index, project.width, project.height, {
      palette,
      delay: delayMs,
      repeat: 0,
      transparent: transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
    });
  }

  gif.finish();
  await writeFile(outputPath, Buffer.from(gif.bytes()));
}

export function createSpriteSheetMetadata(
  project: PiskelProject,
  imageFileName: string,
  columns?: number,
): {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  meta: { image: string; size: { w: number; h: number } };
} {
  const frameCount = getFrameCount(project);
  const cols = clampColumns(columns ?? frameCount, frameCount);
  const rows = Math.ceil(frameCount / cols);
  const frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }> = {};

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const column = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);
    frames[`frame-${frameIndex}.png`] = {
      frame: {
        x: column * project.width,
        y: row * project.height,
        w: project.width,
        h: project.height,
      },
    };
  }

  return {
    frames,
    meta: {
      image: imageFileName,
      size: {
        w: cols * project.width,
        h: rows * project.height,
      },
    },
  };
}

export async function exportProjectFrames(
  project: PiskelProject,
  outputDir: string,
): Promise<void> {
  assertSynchronizedProject(project);
  const frameCount = getFrameCount(project);
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const frame = renderCompositeFrame(project, frameIndex);
    const png = frameToPng(frame);
    await writeFile(`${outputDir}/frame-${frameIndex}.png`, PNG.sync.write(png));
  }
}

function deserializeLayer(layerData: SerializedLayer): PiskelLayer {
  const chunks =
    layerData.chunks ??
    (layerData.base64PNG
      ? [
          {
            base64PNG: layerData.base64PNG,
            layout: Array.from({ length: layerData.frameCount }, (_, index) => [index]),
          },
        ]
      : []);

  const frames = Array<PiskelFrame | undefined>(layerData.frameCount).fill(undefined);
  let fallbackWidth = 0;
  let fallbackHeight = 0;

  for (const chunk of chunks) {
    if (chunk.layout.length === 0 || chunk.layout[0]?.length === 0) {
      throw new Error("Invalid chunk layout: layout must contain at least one frame index");
    }

    const chunkImage = PNG.sync.read(decodeBase64Png(chunk.base64PNG));
    const frameWidth = Math.floor(chunkImage.width / chunk.layout.length);
    const frameHeight = Math.floor(chunkImage.height / chunk.layout[0]!.length);
    fallbackWidth = frameWidth;
    fallbackHeight = frameHeight;

    for (let x = 0; x < chunk.layout.length; x += 1) {
      for (let y = 0; y < chunk.layout[x]!.length; y += 1) {
        const frameIndex = chunk.layout[x]![y]!;
        if (frameIndex < 0 || frameIndex >= layerData.frameCount) {
          throw new Error(
            `Invalid chunk layout: frame index ${frameIndex} is outside frameCount ${layerData.frameCount}`,
          );
        }
        frames[frameIndex] = extractFrame(chunkImage, x * frameWidth, y * frameHeight, frameWidth, frameHeight);
      }
    }
  }

  return {
    name: layerData.name,
    opacity: layerData.opacity ?? 1,
    frames: frames.map((frame) => frame ?? createEmptyFrame(fallbackWidth, fallbackHeight)),
  };
}

async function serializeLayer(layer: PiskelLayer): Promise<string> {
  const spritesheet = renderFramesheet(layer.frames);

  return JSON.stringify({
    name: layer.name,
    opacity: layer.opacity,
    frameCount: layer.frames.length,
    chunks: [
      {
        layout: layer.frames.map((_, index) => [index]),
        base64PNG: `data:image/png;base64,${PNG.sync.write(spritesheet).toString("base64")}`,
      },
    ],
  });
}

function renderFramesheet(frames: PiskelFrame[]): PNG {
  const frameWidth = frames[0]?.width ?? 0;
  const frameHeight = frames[0]?.height ?? 0;
  const png = new PNG({
    width: frameWidth * frames.length,
    height: frameHeight,
  });

  frames.forEach((frame, index) => {
    blitFrame(frame, png, index * frameWidth, 0);
  });

  return png;
}

function renderCompositeFrame(project: PiskelProject, frameIndex: number): PiskelFrame {
  const pixels = new Uint32Array(project.width * project.height);
  const target = { width: project.width, height: project.height, pixels };

  for (const layer of project.layers) {
    const frame = layer.frames[frameIndex];
    if (!frame) {
      continue;
    }

    if (layer.opacity >= 1) {
      mergeOpaqueFrame(target, frame);
      continue;
    }

    mergeFrameWithOpacity(target, frame, layer.opacity);
  }

  return target;
}

function getMutableFrame(
  project: PiskelProject,
  frameIndex: number,
  layerRef?: string,
): PiskelFrame {
  assertFrameIndex(project, frameIndex);
  const layerIndex = typeof layerRef === "string" ? resolveLayerIndex(project, layerRef) : 0;
  return project.layers[layerIndex]!.frames[frameIndex]!;
}

function getReadableFrame(
  project: PiskelProject,
  frameIndex: number,
  layerRef?: string,
): PiskelFrame {
  assertFrameIndex(project, frameIndex);
  if (typeof layerRef === "string") {
    return getMutableFrame(project, frameIndex, layerRef);
  }
  return renderCompositeFrame(project, frameIndex);
}

function assertSynchronizedProject(project: PiskelProject): void {
  if (project.layers.length === 0) {
    throw new Error("Project must contain at least one layer");
  }

  const expectedFrameCount = project.layers[0]!.frames.length;

  for (const layer of project.layers) {
    if (layer.frames.length !== expectedFrameCount) {
      throw new Error("Project layers must stay synchronized before export or serialization");
    }

    for (const frame of layer.frames) {
      if (frame.width !== project.width || frame.height !== project.height) {
        throw new Error("Project layers must contain frames matching the project dimensions");
      }
    }
  }
}

function resolveLayerIndex(project: PiskelProject, layerRef: string): number {
  const numericIndex = Number.parseInt(layerRef, 10);
  if (!Number.isNaN(numericIndex) && `${numericIndex}` === layerRef) {
    if (numericIndex < 0 || numericIndex >= project.layers.length) {
      throw new Error(`Layer index ${numericIndex} is out of range`);
    }
    return numericIndex;
  }

  const namedIndex = project.layers.findIndex((layer) => layer.name === layerRef);
  if (namedIndex === -1) {
    throw new Error(`Layer ${layerRef} was not found`);
  }
  return namedIndex;
}

function assertFrameIndex(project: PiskelProject, frameIndex: number): void {
  const frameCount = getFrameCount(project);
  if (frameIndex < 0 || frameIndex >= frameCount) {
    throw new Error(`Frame index ${frameIndex} is out of range`);
  }
}

function cloneFrame(frame: PiskelFrame): PiskelFrame {
  return {
    width: frame.width,
    height: frame.height,
    pixels: new Uint32Array(frame.pixels),
  };
}

function containsPixel(frame: PiskelFrame, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < frame.width && y < frame.height;
}

function orderPair(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

function getLinePixels(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  const pixels: Array<[number, number]> = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let currentX = x0;
  let currentY = y0;

  while (true) {
    pixels.push([currentX, currentY]);
    if (currentX === x1 && currentY === y1) {
      break;
    }
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      currentX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currentY += sy;
    }
  }

  return pixels;
}

function colorToInt(color: string): number {
  const trimmed = color.trim().toLowerCase();
  if (trimmed === "transparent") {
    return 0;
  }

  if (/^#([0-9a-f]{3})$/i.test(trimmed)) {
    const [, short] = trimmed.match(/^#([0-9a-f]{3})$/i)!;
    return colorToInt(
      `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`,
    );
  }

  if (/^#([0-9a-f]{6})$/i.test(trimmed)) {
    const [, hex] = trimmed.match(/^#([0-9a-f]{6})$/i)!;
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return packPixel(r, g, b, 255);
  }

  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (rgbaMatch) {
    const r = clampByte(Number.parseInt(rgbaMatch[1]!, 10));
    const g = clampByte(Number.parseInt(rgbaMatch[2]!, 10));
    const b = clampByte(Number.parseInt(rgbaMatch[3]!, 10));
    const a = clampByte(
      rgbaMatch[4] === undefined ? 255 : Math.round(Number.parseFloat(rgbaMatch[4]!) * 255),
    );
    return packPixel(r, g, b, a);
  }

  throw new Error(`Invalid color: ${color}`);
}

function intToDisplayColor(intValue: number): string {
  if (intValue === 0 || ((intValue >>> 24) & 0xff) === 0) {
    return "transparent";
  }
  const r = intValue & 0xff;
  const g = (intValue >>> 8) & 0xff;
  const b = (intValue >>> 16) & 0xff;
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function toHexByte(value: number): string {
  return clampByte(value).toString(16).padStart(2, "0");
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function mergeOpaqueFrame(target: PiskelFrame, source: PiskelFrame): void {
  for (let index = 0; index < target.pixels.length; index += 1) {
    const sourcePixel = source.pixels[index] ?? 0;
    if (((sourcePixel >>> 24) & 0xff) !== 0) {
      target.pixels[index] = sourcePixel;
    }
  }
}

function mergeFrameWithOpacity(target: PiskelFrame, source: PiskelFrame, opacity: number): void {
  for (let index = 0; index < target.pixels.length; index += 1) {
    const sourcePixel = source.pixels[index] ?? 0;
    const alpha = ((sourcePixel >>> 24) & 0xff) / 255;
    if (alpha === 0) {
      continue;
    }

    const effectiveAlpha = alpha * opacity;
    const targetPixel = target.pixels[index] ?? 0;
    target.pixels[index] = compositePixel(targetPixel, sourcePixel, effectiveAlpha);
  }
}

function compositePixel(
  targetPixel: number,
  sourcePixel: number,
  effectiveAlpha: number,
): number {
  const source = splitPixel(sourcePixel);
  const target = splitPixel(targetPixel);
  const outAlpha = effectiveAlpha + target.a * (1 - effectiveAlpha);

  if (outAlpha === 0) {
    return 0;
  }

  const r = Math.round((source.r * effectiveAlpha + target.r * target.a * (1 - effectiveAlpha)) / outAlpha);
  const g = Math.round((source.g * effectiveAlpha + target.g * target.a * (1 - effectiveAlpha)) / outAlpha);
  const b = Math.round((source.b * effectiveAlpha + target.b * target.a * (1 - effectiveAlpha)) / outAlpha);
  const a = Math.round(outAlpha * 255);

  return packPixel(r, g, b, a);
}

function splitPixel(pixel: number): { r: number; g: number; b: number; a: number } {
  return {
    r: pixel & 0xff,
    g: (pixel >>> 8) & 0xff,
    b: (pixel >>> 16) & 0xff,
    a: ((pixel >>> 24) & 0xff) / 255,
  };
}

function packPixel(r: number, g: number, b: number, a: number): number {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}

function extractFrame(
  png: PNG,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
): PiskelFrame {
  const pixels = new Uint32Array(width * height);
  const bytes = new Uint8Array(pixels.buffer);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = ((offsetY + y) * png.width + (offsetX + x)) * 4;
      const targetOffset = (y * width + x) * 4;
      bytes[targetOffset] = png.data[sourceOffset] ?? 0;
      bytes[targetOffset + 1] = png.data[sourceOffset + 1] ?? 0;
      bytes[targetOffset + 2] = png.data[sourceOffset + 2] ?? 0;
      bytes[targetOffset + 3] = png.data[sourceOffset + 3] ?? 0;
    }
  }

  return { width, height, pixels };
}

function createEmptyFrame(width: number, height: number): PiskelFrame {
  return {
    width,
    height,
    pixels: new Uint32Array(width * height),
  };
}

function frameToPng(frame: PiskelFrame): PNG {
  const png = new PNG({ width: frame.width, height: frame.height });
  png.data.set(new Uint8Array(frame.pixels.buffer));
  return png;
}

function frameToRgba(frame: PiskelFrame): Uint8Array {
  return new Uint8Array(frame.pixels.buffer.slice(0));
}

function blitFrame(frame: PiskelFrame, target: PNG, offsetX: number, offsetY: number): void {
  const bytes = new Uint8Array(frame.pixels.buffer);

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const sourceOffset = (y * frame.width + x) * 4;
      const targetOffset = ((offsetY + y) * target.width + (offsetX + x)) * 4;
      target.data[targetOffset] = bytes[sourceOffset] ?? 0;
      target.data[targetOffset + 1] = bytes[sourceOffset + 1] ?? 0;
      target.data[targetOffset + 2] = bytes[sourceOffset + 2] ?? 0;
      target.data[targetOffset + 3] = bytes[sourceOffset + 3] ?? 0;
    }
  }
}

function decodeBase64Png(dataUri: string): Buffer {
  const marker = "base64,";
  const markerIndex = dataUri.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error("Invalid PNG data URI");
  }
  return Buffer.from(dataUri.slice(markerIndex + marker.length), "base64");
}

function getFrameCount(project: PiskelProject): number {
  return project.layers[0]?.frames.length ?? 0;
}

function clampColumns(columns: number, frameCount: number): number {
  return Math.max(1, Math.min(columns, Math.max(frameCount, 1)));
}

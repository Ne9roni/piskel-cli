import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";

import {
  addFrame,
  addLayer,
  clearFrameOnProject,
  createSpriteSheetMetadata,
  createEmptyProject,
  duplicateFrame,
  drawCircleOnProject,
  drawLineOnProject,
  drawPixelOnProject,
  drawPixelsOnProject,
  drawRectOnProject,
  erasePixelOnProject,
  exportProjectFrames,
  exportProjectToGif,
  exportProjectToPng,
  fillAreaOnProject,
  listFrames,
  listLayers,
  loadPiskelProject,
  moveFrame,
  moveLayer,
  PixelInput,
  readBoundsFromProject,
  readFrameFromProject,
  readPaletteFromProject,
  readPixelFromProject,
  readProjectSummary,
  removeFrame,
  removeLayer,
  renameLayer,
  savePiskelProject,
  setLayerOpacity,
} from "../probe/piskel.js";
import {
  getDefaultExportFramesDir,
  getDefaultExportPath,
  getDefaultProjectPath,
} from "./output-paths.js";
import { parseServeArgs, serveEditor } from "./serve-editor.js";

export interface CliIo {
  writeStdout: (line: string) => void;
  writeStderr: (line: string) => void;
}

type CliErrorCode =
  | "USAGE_ERROR"
  | "FILE_NOT_FOUND"
  | "INVALID_PISKEL_FILE"
  | "UNSUPPORTED_MODEL_VERSION"
  | "FRAME_INDEX_OUT_OF_RANGE"
  | "LAYER_INDEX_OUT_OF_RANGE"
  | "INVALID_COLOR"
  | "INVALID_COORDINATES"
  | "PROJECT_SYNC_ERROR"
  | "WRITE_FAILED"
  | "READ_FAILED";

const BOOLEAN_FLAGS = new Set(["filled", "json"]);
const CLI_ERROR_CODES = new Set<CliErrorCode>([
  "USAGE_ERROR",
  "FILE_NOT_FOUND",
  "INVALID_PISKEL_FILE",
  "UNSUPPORTED_MODEL_VERSION",
  "FRAME_INDEX_OUT_OF_RANGE",
  "LAYER_INDEX_OUT_OF_RANGE",
  "INVALID_COLOR",
  "INVALID_COORDINATES",
  "PROJECT_SYNC_ERROR",
  "WRITE_FAILED",
  "READ_FAILED",
]);

export async function runCli(argv: string[], io: CliIo): Promise<number> {
  try {
    if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
      io.writeStdout(getUsage());
      return 0;
    }

    const [group, command, ...rest] = argv;

    if (group === "run") {
      return await runPlan([command, ...rest].filter((value): value is string => typeof value === "string"), io);
    }

    if (group === "serve") {
      const serveArgs = [command, ...rest].filter((value): value is string => typeof value === "string");
      return await runServe(serveArgs, io);
    }

    if (group === "project" && command === "info") {
      return await runProjectInfo(rest, io);
    }

    if (group === "project" && command === "create") {
      return await runProjectCreate(rest, io);
    }

    if (group === "export" && command === "png") {
      return await runExportPng(rest, io);
    }

    if (group === "export" && command === "gif") {
      return await runExportGif(rest, io);
    }

    if (group === "export" && command === "spritesheet") {
      return await runExportSpritesheet(rest, io);
    }

    if (group === "export" && command === "frames") {
      return await runExportFrames(rest, io);
    }

    if (group === "layer" && command === "list") {
      return await runLayerList(rest, io);
    }

    if (group === "layer" && command === "add") {
      return await runLayerAdd(rest, io);
    }

    if (group === "layer" && command === "remove") {
      return await runLayerRemove(rest, io);
    }

    if (group === "layer" && command === "rename") {
      return await runLayerRename(rest, io);
    }

    if (group === "layer" && command === "set-opacity") {
      return await runLayerSetOpacity(rest, io);
    }

    if (group === "layer" && command === "move") {
      return await runLayerMove(rest, io);
    }

    if (group === "frame" && command === "list") {
      return await runFrameList(rest, io);
    }

    if (group === "frame" && command === "add") {
      return await runFrameAdd(rest, io);
    }

    if (group === "frame" && command === "remove") {
      return await runFrameRemove(rest, io);
    }

    if (group === "frame" && command === "duplicate") {
      return await runFrameDuplicate(rest, io);
    }

    if (group === "frame" && command === "move") {
      return await runFrameMove(rest, io);
    }

    if (group === "draw" && command === "pixel") {
      return await runDrawPixel(rest, io);
    }

    if (group === "draw" && command === "pixels") {
      return await runDrawPixels(rest, io);
    }

    if (group === "draw" && command === "line") {
      return await runDrawLine(rest, io);
    }

    if (group === "draw" && command === "rect") {
      return await runDrawRect(rest, io);
    }

    if (group === "draw" && command === "circle") {
      return await runDrawCircle(rest, io);
    }

    if (group === "fill" && command === "area") {
      return await runFillArea(rest, io);
    }

    if (group === "erase" && command === "pixel") {
      return await runErasePixel(rest, io);
    }

    if (group === "clear" && command === "frame") {
      return await runClearFrame(rest, io);
    }

    if (group === "read" && command === "pixel") {
      return await runReadPixel(rest, io);
    }

    if (group === "read" && command === "frame") {
      return await runReadFrame(rest, io);
    }

    if (group === "read" && command === "project") {
      return await runReadProject(rest, io);
    }

    if (group === "read" && command === "palette") {
      return await runReadPalette(rest, io);
    }

    if (group === "read" && command === "bounds") {
      return await runReadBounds(rest, io);
    }

    return writeError(io, wantsJson(argv), "USAGE_ERROR", getUsage());
  } catch (error) {
    const normalized = normalizeCliError(error);
    return writeError(io, wantsJson(argv), normalized.code, normalized.message);
  }
}

async function runServe(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseServeArgs(args);
  const projectPath = positionals[0];
  const portRaw = flags.port;
  let port: number | undefined;
  if (typeof portRaw === "string") {
    const parsed = Number.parseInt(portRaw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      return writeError(io, Boolean(flags.json), "USAGE_ERROR", "Invalid `--port` value.");
    }
    port = parsed;
  }

  const host = typeof flags.host === "string" ? flags.host : undefined;

  return serveEditor(io, {
    projectPath,
    port,
    host,
    openBrowser: !flags["no-open"],
    json: Boolean(flags.json),
  });
}

async function runProjectCreate(args: string[], io: CliIo): Promise<number> {
  const { flags } = parseArgs(args);
  const width = getRequiredPositiveIntFlag(flags.width, "width");
  const height = getRequiredPositiveIntFlag(flags.height, "height");
  const outputPath = getStringFlag(flags.output) ?? getDefaultProjectPath(process.cwd());
  const fps = getOptionalPositiveIntFlag(flags.fps, "fps") ?? 12;

  const resolvedOutputPath = resolve(outputPath);
  const name = getStringFlag(flags.name) ?? basename(resolvedOutputPath, extname(resolvedOutputPath));
  const project = createEmptyProject({
    width,
    height,
    fps,
    name,
  });

  await mkdir(dirname(resolvedOutputPath), { recursive: true });
  await savePiskelProject(project, resolvedOutputPath);

  const payload = {
    project: {
      name: project.name,
      width: project.width,
      height: project.height,
      fps: project.fps,
      layerCount: project.layers.length,
      frameCount: project.layers[0]?.frames.length ?? 0,
      outputPath: resolvedOutputPath,
    },
  };

  return writeJsonOrText(
    io,
    flags.json,
    payload,
    `created: ${resolvedOutputPath}`,
  );
}

async function runProjectInfo(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];

  if (!projectPath) {
    return writeError(io, Boolean(flags.json), "USAGE_ERROR", "Missing project path for `project info`.");
  }

  const project = await loadPiskelProject(projectPath);
  const payload = {
    project: {
      name: project.name,
      width: project.width,
      height: project.height,
      fps: project.fps,
      layerCount: project.layers.length,
      frameCount: project.layers[0]?.frames.length ?? 0,
      hiddenFrameCount: project.hiddenFrames.length,
    },
  };

  return writeJsonOrText(io, flags.json, payload, `name: ${payload.project.name}`);
}

async function runExportPng(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const outputPath = getStringFlag(flags.output) ?? getDefaultExportPath(process.cwd(), "png");

  if (!projectPath) {
    return writeError(io, Boolean(flags.json), "USAGE_ERROR", "Missing project path for `export png`.");
  }

  const project = await loadPiskelProject(projectPath);
  const frameCount = project.layers[0]?.frames.length ?? 0;
  const frame = getNumberFlag(flags.frame);
  const columns = getNumberFlag(flags.columns);
  const resolvedOutputPath = resolve(outputPath);

  if (typeof frame === "number" && (frame < 0 || frame >= frameCount)) {
    return writeError(
      io,
      Boolean(flags.json),
      "FRAME_INDEX_OUT_OF_RANGE",
      `Invalid frame index ${frame}. Expected a 0-based frame index between 0 and ${Math.max(frameCount - 1, 0)}.`,
    );
  }

  await mkdir(dirname(resolvedOutputPath), { recursive: true });
  await exportProjectToPng(project, {
    outputPath: resolvedOutputPath,
    frame,
    columns,
  });

  const width = typeof frame === "number" ? project.width : project.width * clampColumns(columns ?? frameCount, frameCount);
  const height =
    typeof frame === "number"
      ? project.height
      : project.height * Math.ceil(frameCount / clampColumns(columns ?? frameCount, frameCount));

  const payload = {
    export: {
      outputPath: resolvedOutputPath,
      width,
      height,
      frame: frame ?? null,
      columns: typeof frame === "number" ? 1 : clampColumns(columns ?? frameCount, frameCount),
    },
  };

  return writeJsonOrText(io, flags.json, payload, `exported: ${resolvedOutputPath}`);
}

async function runExportGif(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const outputPath = getStringFlag(flags.output) ?? getDefaultExportPath(process.cwd(), "gif");
  if (!projectPath) {
    return writeError(io, Boolean(flags.json), "USAGE_ERROR", "Missing required arguments for `export gif`.");
  }

  const project = await loadPiskelProject(projectPath);
  const resolvedOutputPath = resolve(outputPath);
  await mkdir(dirname(resolvedOutputPath), { recursive: true });
  await exportProjectToGif(
    project,
    resolvedOutputPath,
    getOptionalPositiveIntFlag(flags["delay-ms"], "delay-ms") ?? 100,
  );

  return writeJsonOrText(
    io,
    flags.json,
    { export: { outputPath: resolvedOutputPath } },
    `exported gif: ${resolvedOutputPath}`,
  );
}

async function runExportSpritesheet(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const outputPath = getStringFlag(flags.output) ?? getDefaultExportPath(process.cwd(), "spritesheet");
  if (!projectPath) {
    return writeError(io, Boolean(flags.json), "USAGE_ERROR", "Missing required arguments for `export spritesheet`.");
  }

  const project = await loadPiskelProject(projectPath);
  const resolvedOutputPath = resolve(outputPath);
  const columns = getNumberFlag(flags.columns);
  await mkdir(dirname(resolvedOutputPath), { recursive: true });
  await exportProjectToPng(project, {
    outputPath: resolvedOutputPath,
    columns,
  });

  let resolvedMetadataPath: string | null = null;
  const metadataPath = getStringFlag(flags.metadata);
  if (metadataPath) {
    resolvedMetadataPath = resolve(metadataPath);
    await mkdir(dirname(resolvedMetadataPath), { recursive: true });
    const metadata = createSpriteSheetMetadata(
      project,
      basename(resolvedOutputPath),
      columns,
    );
    await writeFile(resolvedMetadataPath, JSON.stringify(metadata, null, 2), "utf8");
  }

  return writeJsonOrText(
    io,
    flags.json,
    { export: { outputPath: resolvedOutputPath, metadataPath: resolvedMetadataPath } },
    `exported spritesheet: ${resolvedOutputPath}`,
  );
}

async function runExportFrames(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const outputDir = getStringFlag(flags["output-dir"]) ?? getDefaultExportFramesDir(process.cwd());
  if (!projectPath) {
    return writeError(io, Boolean(flags.json), "USAGE_ERROR", "Missing required arguments for `export frames`.");
  }

  const project = await loadPiskelProject(projectPath);
  const resolvedOutputDir = resolve(outputDir);
  await mkdir(resolvedOutputDir, { recursive: true });
  await exportProjectFrames(project, resolvedOutputDir);

  return writeJsonOrText(
    io,
    flags.json,
    {
      export: {
        outputDir: resolvedOutputDir,
        frameCount: project.layers[0]?.frames.length ?? 0,
      },
    },
    `exported frames: ${resolvedOutputDir}`,
  );
}

async function runLayerList(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  if (!projectPath) {
    return writeUsageError(io, Boolean(flags.json), "Missing project path for `layer list`.");
  }

  const project = await loadPiskelProject(projectPath);
  const payload = { layers: listLayers(project) };
  if (flags.json) {
    return writeJsonOrText(io, flags.json, payload, "");
  }

  for (const layer of payload.layers) {
    io.writeStdout(`${layer.index}: ${layer.name} (opacity=${layer.opacity}, frames=${layer.frameCount})`);
  }
  return 0;
}

async function runLayerAdd(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const layerName = getStringFlag(flags.name);
  if (!projectPath || !layerName) {
    return writeUsageError(io, Boolean(flags.json), "Missing required arguments for `layer add`.");
  }

  const outputPath = getOutputProjectPath(projectPath, flags);
  const project = await loadPiskelProject(projectPath);
  const opacity = getOptionalFloatFlag(flags.opacity, "opacity") ?? 1;
  addLayer(project, layerName, opacity);
  await saveMutatedProject(project, outputPath);
  return writeJsonOrText(io, flags.json, { layer: listLayers(project).at(-1), outputPath }, `added layer: ${layerName}`);
}

async function runLayerRemove(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const layerRef = getStringFlag(flags.layer);
  if (!projectPath || !layerRef) {
    return writeUsageError(io, Boolean(flags.json), "Missing required arguments for `layer remove`.");
  }

  const outputPath = getOutputProjectPath(projectPath, flags);
  const project = await loadPiskelProject(projectPath);
  removeLayer(project, layerRef);
  await saveMutatedProject(project, outputPath);
  return writeJsonOrText(io, flags.json, { layers: listLayers(project), outputPath }, `removed layer: ${layerRef}`);
}

async function runLayerRename(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const layerRef = getStringFlag(flags.layer);
  const name = getStringFlag(flags.name);
  if (!projectPath || !layerRef || !name) {
    return writeUsageError(io, Boolean(flags.json), "Missing required arguments for `layer rename`.");
  }

  const outputPath = getOutputProjectPath(projectPath, flags);
  const project = await loadPiskelProject(projectPath);
  renameLayer(project, layerRef, name);
  await saveMutatedProject(project, outputPath);
  return writeJsonOrText(io, flags.json, { layers: listLayers(project), outputPath }, `renamed layer: ${layerRef} -> ${name}`);
}

async function runLayerSetOpacity(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const layerRef = getStringFlag(flags.layer);
  const opacity = getOptionalFloatFlag(flags.opacity, "opacity");
  if (!projectPath || !layerRef || typeof opacity !== "number") {
    return writeUsageError(io, Boolean(flags.json), "Missing required arguments for `layer set-opacity`.");
  }

  const outputPath = getOutputProjectPath(projectPath, flags);
  const project = await loadPiskelProject(projectPath);
  setLayerOpacity(project, layerRef, opacity);
  await saveMutatedProject(project, outputPath);
  return writeJsonOrText(io, flags.json, { layers: listLayers(project), outputPath }, `updated opacity for layer: ${layerRef}`);
}

async function runLayerMove(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const layerRef = getStringFlag(flags.layer);
  const toIndex = getNumberFlag(flags.to);
  if (!projectPath || !layerRef || typeof toIndex !== "number") {
    return writeUsageError(io, Boolean(flags.json), "Missing required arguments for `layer move`.");
  }

  const outputPath = getOutputProjectPath(projectPath, flags);
  const project = await loadPiskelProject(projectPath);
  moveLayer(project, layerRef, toIndex);
  await saveMutatedProject(project, outputPath);
  return writeJsonOrText(io, flags.json, { layers: listLayers(project), outputPath }, `moved layer: ${layerRef}`);
}

async function runFrameList(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  if (!projectPath) {
    return writeUsageError(io, Boolean(flags.json), "Missing project path for `frame list`.");
  }

  const project = await loadPiskelProject(projectPath);
  const payload = { frames: listFrames(project) };
  if (flags.json) {
    return writeJsonOrText(io, flags.json, payload, "");
  }

  for (const frame of payload.frames) {
    io.writeStdout(`${frame.index}`);
  }
  return 0;
}

async function runFrameAdd(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  if (!projectPath) {
    return writeUsageError(io, Boolean(flags.json), "Missing project path for `frame add`.");
  }

  const outputPath = getOutputProjectPath(projectPath, flags);
  const index = getNumberFlag(flags.index);
  const project = await loadPiskelProject(projectPath);
  addFrame(project, index);
  await saveMutatedProject(project, outputPath);
  return writeJsonOrText(io, flags.json, { frames: listFrames(project), outputPath }, "added frame");
}

async function runFrameRemove(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const frameIndex = getNumberFlag(flags.frame);
  if (!projectPath || typeof frameIndex !== "number") {
    return writeUsageError(io, Boolean(flags.json), "Missing required arguments for `frame remove`.");
  }

  const outputPath = getOutputProjectPath(projectPath, flags);
  const project = await loadPiskelProject(projectPath);
  removeFrame(project, frameIndex);
  await saveMutatedProject(project, outputPath);
  return writeJsonOrText(io, flags.json, { frames: listFrames(project), outputPath }, `removed frame: ${frameIndex}`);
}

async function runFrameDuplicate(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const frameIndex = getNumberFlag(flags.frame);
  if (!projectPath || typeof frameIndex !== "number") {
    return writeUsageError(io, Boolean(flags.json), "Missing required arguments for `frame duplicate`.");
  }

  const outputPath = getOutputProjectPath(projectPath, flags);
  const project = await loadPiskelProject(projectPath);
  duplicateFrame(project, frameIndex);
  await saveMutatedProject(project, outputPath);
  return writeJsonOrText(io, flags.json, { frames: listFrames(project), outputPath }, `duplicated frame: ${frameIndex}`);
}

async function runFrameMove(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  const frameIndex = getNumberFlag(flags.frame);
  const toIndex = getNumberFlag(flags.to);
  if (!projectPath || typeof frameIndex !== "number" || typeof toIndex !== "number") {
    return writeUsageError(io, Boolean(flags.json), "Missing required arguments for `frame move`.");
  }

  const outputPath = getOutputProjectPath(projectPath, flags);
  const project = await loadPiskelProject(projectPath);
  moveFrame(project, frameIndex, toIndex);
  await saveMutatedProject(project, outputPath);
  return writeJsonOrText(io, flags.json, { frames: listFrames(project), outputPath }, `moved frame: ${frameIndex}`);
}

async function runDrawPixel(args: string[], io: CliIo): Promise<number> {
  const { project, flags, outputPath } = await loadMutableProject(args, io, "draw pixel");
  if (!project) {
    return 1;
  }

  const x = getRequiredIntegerFlag(flags.x, "x");
  const y = getRequiredIntegerFlag(flags.y, "y");
  const color = getStringFlag(flags.color);
  if (!color) {
    return writeUsageError(io, Boolean(flags.json), "Missing required flag `--color` for `draw pixel`.");
  }

  drawPixelOnProject(project, x, y, color, getFrameFlag(flags), getStringFlag(flags.layer));
  await saveMutatedProject(project, outputPath!);
  return writeJsonOrText(io, flags.json, { outputPath }, `drew pixel at ${x},${y}`);
}

async function runDrawPixels(args: string[], io: CliIo): Promise<number> {
  const { project, flags, outputPath } = await loadMutableProject(args, io, "draw pixels");
  if (!project) {
    return 1;
  }

  const inputPath = getStringFlag(flags.input);
  if (!inputPath) {
    return writeUsageError(io, Boolean(flags.json), "Missing required flag `--input` for `draw pixels`.");
  }

  const pixels = parseJsonText<PixelInput[]>(
    await readFile(inputPath, "utf8"),
    `Invalid pixel input JSON in \`${inputPath}\``,
  );
  drawPixelsOnProject(project, pixels, getStringFlag(flags.color), getFrameFlag(flags), getStringFlag(flags.layer));
  await saveMutatedProject(project, outputPath!);
  return writeJsonOrText(io, flags.json, { outputPath }, `drew ${pixels.length} pixels`);
}

async function runDrawLine(args: string[], io: CliIo): Promise<number> {
  const { project, flags, outputPath } = await loadMutableProject(args, io, "draw line");
  if (!project) {
    return 1;
  }

  const color = getStringFlag(flags.color);
  if (!color) {
    return writeUsageError(io, Boolean(flags.json), "Missing required flag `--color` for `draw line`.");
  }

  drawLineOnProject(
    project,
    getRequiredIntegerFlag(flags.x1, "x1"),
    getRequiredIntegerFlag(flags.y1, "y1"),
    getRequiredIntegerFlag(flags.x2, "x2"),
    getRequiredIntegerFlag(flags.y2, "y2"),
    color,
    getFrameFlag(flags),
    getStringFlag(flags.layer),
  );
  await saveMutatedProject(project, outputPath!);
  return writeJsonOrText(io, flags.json, { outputPath }, "drew line");
}

async function runDrawRect(args: string[], io: CliIo): Promise<number> {
  const { project, flags, outputPath } = await loadMutableProject(args, io, "draw rect");
  if (!project) {
    return 1;
  }

  const color = getStringFlag(flags.color);
  if (!color) {
    return writeUsageError(io, Boolean(flags.json), "Missing required flag `--color` for `draw rect`.");
  }

  drawRectOnProject(
    project,
    getRequiredIntegerFlag(flags.x1, "x1"),
    getRequiredIntegerFlag(flags.y1, "y1"),
    getRequiredIntegerFlag(flags.x2, "x2"),
    getRequiredIntegerFlag(flags.y2, "y2"),
    color,
    Boolean(flags.filled),
    getFrameFlag(flags),
    getStringFlag(flags.layer),
  );
  await saveMutatedProject(project, outputPath!);
  return writeJsonOrText(io, flags.json, { outputPath }, "drew rectangle");
}

async function runDrawCircle(args: string[], io: CliIo): Promise<number> {
  const { project, flags, outputPath } = await loadMutableProject(args, io, "draw circle");
  if (!project) {
    return 1;
  }

  const color = getStringFlag(flags.color);
  if (!color) {
    return writeUsageError(io, Boolean(flags.json), "Missing required flag `--color` for `draw circle`.");
  }

  drawCircleOnProject(
    project,
    getRequiredIntegerFlag(flags.x1, "x1"),
    getRequiredIntegerFlag(flags.y1, "y1"),
    getRequiredIntegerFlag(flags.x2, "x2"),
    getRequiredIntegerFlag(flags.y2, "y2"),
    color,
    getFrameFlag(flags),
    getStringFlag(flags.layer),
  );
  await saveMutatedProject(project, outputPath!);
  return writeJsonOrText(io, flags.json, { outputPath }, "drew circle");
}

async function runFillArea(args: string[], io: CliIo): Promise<number> {
  const { project, flags, outputPath } = await loadMutableProject(args, io, "fill area");
  if (!project) {
    return 1;
  }

  const color = getStringFlag(flags.color);
  if (!color) {
    return writeUsageError(io, Boolean(flags.json), "Missing required flag `--color` for `fill area`.");
  }

  fillAreaOnProject(
    project,
    getRequiredIntegerFlag(flags.x, "x"),
    getRequiredIntegerFlag(flags.y, "y"),
    color,
    getFrameFlag(flags),
    getStringFlag(flags.layer),
  );
  await saveMutatedProject(project, outputPath!);
  return writeJsonOrText(io, flags.json, { outputPath }, "filled area");
}

async function runErasePixel(args: string[], io: CliIo): Promise<number> {
  const { project, flags, outputPath } = await loadMutableProject(args, io, "erase pixel");
  if (!project) {
    return 1;
  }

  erasePixelOnProject(
    project,
    getRequiredIntegerFlag(flags.x, "x"),
    getRequiredIntegerFlag(flags.y, "y"),
    getFrameFlag(flags),
    getStringFlag(flags.layer),
  );
  await saveMutatedProject(project, outputPath!);
  return writeJsonOrText(io, flags.json, { outputPath }, "erased pixel");
}

async function runClearFrame(args: string[], io: CliIo): Promise<number> {
  const { project, flags, outputPath } = await loadMutableProject(args, io, "clear frame");
  if (!project) {
    return 1;
  }

  clearFrameOnProject(project, getFrameFlag(flags), getStringFlag(flags.layer));
  await saveMutatedProject(project, outputPath!);
  return writeJsonOrText(io, flags.json, { outputPath }, "cleared frame");
}

async function runReadPixel(args: string[], io: CliIo): Promise<number> {
  const { project, flags } = await loadReadonlyProject(args, io, "read pixel");
  if (!project) {
    return 1;
  }

  const x = getRequiredIntegerFlag(flags.x, "x");
  const y = getRequiredIntegerFlag(flags.y, "y");
  const payload = {
    pixel: {
      x,
      y,
      color: readPixelFromProject(project, x, y, getFrameFlag(flags), getStringFlag(flags.layer)),
    },
  };
  return writeJsonOrText(io, flags.json, payload, `${payload.pixel.color}`);
}

async function runReadFrame(args: string[], io: CliIo): Promise<number> {
  const { project, flags } = await loadReadonlyProject(args, io, "read frame");
  if (!project) {
    return 1;
  }

  const frameIndex = getFrameFlag(flags);
  const payload = {
    frame: {
      index: frameIndex,
      pixels: readFrameFromProject(project, frameIndex, getStringFlag(flags.layer)),
    },
  };
  return writeJsonOrText(io, flags.json, payload, `frame ${frameIndex}`);
}

async function runReadProject(args: string[], io: CliIo): Promise<number> {
  const { project, flags } = await loadReadonlyProject(args, io, "read project");
  if (!project) {
    return 1;
  }

  const payload = { project: readProjectSummary(project) };
  return writeJsonOrText(io, flags.json, payload, payload.project.name);
}

async function runReadPalette(args: string[], io: CliIo): Promise<number> {
  const { project, flags } = await loadReadonlyProject(args, io, "read palette");
  if (!project) {
    return 1;
  }

  const payload = {
    palette: {
      colors: readPaletteFromProject(project, getFrameFlag(flags), getStringFlag(flags.layer)),
    },
  };
  return writeJsonOrText(io, flags.json, payload, payload.palette.colors.join(", "));
}

async function runReadBounds(args: string[], io: CliIo): Promise<number> {
  const { project, flags } = await loadReadonlyProject(args, io, "read bounds");
  if (!project) {
    return 1;
  }

  const payload = {
    bounds: readBoundsFromProject(project, getFrameFlag(flags), getStringFlag(flags.layer)),
  };
  return writeJsonOrText(io, flags.json, payload, payload.bounds ? JSON.stringify(payload.bounds) : "null");
}

async function runPlan(args: string[], io: CliIo): Promise<number> {
  const { positionals, flags } = parseArgs(args);
  const planPath = positionals[0];
  if (!planPath) {
    return writeError(io, Boolean(flags.json), "USAGE_ERROR", "Missing plan path for `run`.");
  }

  const plan = validatePlan(
    parseJsonText<unknown>(await readFile(planPath, "utf8"), `Invalid plan JSON in \`${planPath}\``),
  );
  if (!plan.ok) {
    return writeError(io, Boolean(flags.json), "USAGE_ERROR", plan.message);
  }

  for (const step of plan.value.steps) {
    const nestedIo = createNestedIo();
    const exitCode = await runCli(mapPlanStepToArgv(step), nestedIo);
    if (exitCode !== 0) {
      const nestedError = getNestedCliError(nestedIo.stdout);
      const nestedMessage = firstNonEmpty(
        nestedError?.message,
        nestedIo.stderr.join(" | "),
        nestedIo.stdout.join(" | "),
        "Unknown error",
      );
      return writeError(
        io,
        Boolean(flags.json),
        nestedError?.code ?? "READ_FAILED",
        `Plan step failed: ${step.command}: ${nestedMessage}`,
      );
    }
  }

  return writeJsonOrText(
    io,
    flags.json,
    { run: { status: "completed", steps: plan.value.steps.length } },
    `completed ${plan.value.steps.length} steps`,
  );
}

function parseArgs(args: string[]): {
  positionals: string[];
  flags: Record<string, string | boolean>;
} {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const key = arg.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      flags[key] = true;
      continue;
    }

    const next = args[index + 1];

    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { positionals, flags };
}

function getStringFlag(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getOptionalFloatFlag(
  value: string | boolean | undefined,
  name: string,
): number | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Flag \`--${name}\` requires a numeric value.`);
  }

  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Flag \`--${name}\` must be numeric.`);
  }

  return parsed;
}

function getRequiredIntegerFlag(
  value: string | boolean | undefined,
  name: string,
): number {
  if (typeof value !== "string") {
    throw new Error(`Missing required flag \`--${name}\`.`);
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Flag \`--${name}\` must be an integer.`);
  }
  return parsed;
}

function getRequiredPositiveIntFlag(
  value: string | boolean | undefined,
  name: string,
): number {
  const parsed = getOptionalPositiveIntFlag(value, name);
  if (typeof parsed !== "number") {
    throw new Error(`Missing required flag \`--${name}\`.`);
  }
  return parsed;
}

function getOptionalPositiveIntFlag(
  value: string | boolean | undefined,
  name: string,
): number | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Flag \`--${name}\` requires a numeric value.`);
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Flag \`--${name}\` must be a positive integer.`);
  }

  return parsed;
}

function getNumberFlag(value: string | boolean | undefined): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric flag value: ${value}`);
  }

  return parsed;
}

function clampColumns(columns: number, frameCount: number): number {
  return Math.max(1, Math.min(columns, Math.max(frameCount, 1)));
}

function getUsage(): string {
  return [
    "Usage:",
    "  piskel-cli serve [<project.piskel>] [--port N] [--host 127.0.0.1] [--no-open] [--json]",
    "  piskel-cli project create --width <n> --height <n> [--output <file.piskel>] [--fps N] [--name <name>] [--json]  (default: output/output.piskel)",
    "  piskel-cli project info <project.piskel> [--json]",
    "  piskel-cli layer list <project.piskel> [--json]",
    "  piskel-cli layer add <project.piskel> --name <name> [--opacity <0..1>] [--output <file>] [--json]",
    "  piskel-cli layer remove <project.piskel> --layer <index|name> [--output <file>] [--json]",
    "  piskel-cli layer rename <project.piskel> --layer <index|name> --name <newName> [--output <file>] [--json]",
    "  piskel-cli layer set-opacity <project.piskel> --layer <index|name> --opacity <0..1> [--output <file>] [--json]",
    "  piskel-cli layer move <project.piskel> --layer <index|name> --to <index> [--output <file>] [--json]",
    "  piskel-cli frame list <project.piskel> [--json]",
    "  piskel-cli frame add <project.piskel> [--index <n>] [--output <file>] [--json]",
    "  piskel-cli frame remove <project.piskel> --frame <n> [--output <file>] [--json]",
    "  piskel-cli frame duplicate <project.piskel> --frame <n> [--output <file>] [--json]",
    "  piskel-cli frame move <project.piskel> --frame <n> --to <n> [--output <file>] [--json]",
    "  piskel-cli draw pixel <project.piskel> --x <n> --y <n> --color <hex|rgba> [--frame <n>] [--layer <name|index>] [--output <file>] [--json]",
    "  piskel-cli draw pixels <project.piskel> --input <pixels.json> [--color <hex|rgba>] [--frame <n>] [--layer <name|index>] [--output <file>] [--json]",
    "  piskel-cli draw line <project.piskel> --x1 <n> --y1 <n> --x2 <n> --y2 <n> --color <hex|rgba> [--frame <n>] [--layer <name|index>] [--output <file>] [--json]",
    "  piskel-cli draw rect <project.piskel> --x1 <n> --y1 <n> --x2 <n> --y2 <n> --color <hex|rgba> [--filled] [--frame <n>] [--layer <name|index>] [--output <file>] [--json]",
    "  piskel-cli draw circle <project.piskel> --x1 <n> --y1 <n> --x2 <n> --y2 <n> --color <hex|rgba> [--frame <n>] [--layer <name|index>] [--output <file>] [--json]",
    "  piskel-cli fill area <project.piskel> --x <n> --y <n> --color <hex|rgba> [--frame <n>] [--layer <name|index>] [--output <file>] [--json]",
    "  piskel-cli erase pixel <project.piskel> --x <n> --y <n> [--frame <n>] [--layer <name|index>] [--output <file>] [--json]",
    "  piskel-cli clear frame <project.piskel> [--frame <n>] [--layer <name|index>] [--output <file>] [--json]",
    "  piskel-cli read pixel <project.piskel> --x <n> --y <n> [--frame <n>] [--layer <name|index>] [--json]",
    "  piskel-cli read frame <project.piskel> [--frame <n>] [--layer <name|index>] [--json]",
    "  piskel-cli read project <project.piskel> [--json]",
    "  piskel-cli read palette <project.piskel> [--frame <n>] [--layer <name|index>] [--json]",
    "  piskel-cli read bounds <project.piskel> [--frame <n>] [--layer <name|index>] [--json]",
    "  piskel-cli export png <project.piskel> [--output <out.png>] [--columns N] [--frame N(0-based)] [--json]  (default: output/output.png)",
    "  piskel-cli export gif <project.piskel> [--output <out.gif>] [--delay-ms N] [--json]  (default: output/output.gif)",
    "  piskel-cli export spritesheet <project.piskel> [--output <sheet.png>] [--metadata <sheet.json>] [--columns N] [--json]  (default output: output/output.png)",
    "  piskel-cli export frames <project.piskel> [--output-dir <dir>] [--json]  (default: output/frames)",
    "  piskel-cli run <plan.json> [--json]",
  ].join("\n");
}

function getOutputProjectPath(
  inputProjectPath: string,
  flags: Record<string, string | boolean>,
): string {
  return resolve(getStringFlag(flags.output) ?? inputProjectPath);
}

async function saveMutatedProject(project: Parameters<typeof savePiskelProject>[0], outputPath: string): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await savePiskelProject(project, outputPath);
}

function writeJsonOrText(
  io: CliIo,
  json: string | boolean | undefined,
  payload: unknown,
  text: string,
): number {
  if (json) {
    io.writeStdout(
      JSON.stringify(
        {
          ok: true,
          data: payload,
        },
        null,
        2,
      ),
    );
    return 0;
  }
  io.writeStdout(text);
  return 0;
}

function writeError(
  io: CliIo,
  json: boolean,
  code: CliErrorCode,
  message: string,
): number {
  if (json) {
    io.writeStdout(
      JSON.stringify(
        {
          ok: false,
          error: {
            code,
            message,
          },
        },
        null,
        2,
      ),
    );
    return 1;
  }

  io.writeStderr(message);
  return 1;
}

function writeUsageError(io: CliIo, json: boolean, message: string): number {
  if (json) {
    return writeError(io, true, "USAGE_ERROR", message);
  }

  io.writeStderr(message);
  io.writeStderr(getUsage());
  return 1;
}

function getFrameFlag(flags: Record<string, string | boolean>): number {
  return getNumberFlag(flags.frame) ?? 0;
}

async function loadReadonlyProject(
  args: string[],
  io: CliIo,
  commandName: string,
): Promise<{
  project?: Parameters<typeof readProjectSummary>[0];
  flags: Record<string, string | boolean>;
}> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  if (!projectPath) {
    writeUsageError(io, Boolean(flags.json), `Missing project path for \`${commandName}\`.`);
    return { flags };
  }

  return {
    project: await loadPiskelProject(projectPath),
    flags,
  };
}

async function loadMutableProject(
  args: string[],
  io: CliIo,
  commandName: string,
): Promise<{
  project?: Parameters<typeof savePiskelProject>[0];
  flags: Record<string, string | boolean>;
  outputPath?: string;
}> {
  const { positionals, flags } = parseArgs(args);
  const projectPath = positionals[0];
  if (!projectPath) {
    writeUsageError(io, Boolean(flags.json), `Missing project path for \`${commandName}\`.`);
    return { flags };
  }

  return {
    project: await loadPiskelProject(projectPath),
    flags,
    outputPath: getOutputProjectPath(projectPath, flags),
  };
}

function createNestedIo() {
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

function mapPlanStepToArgv(step: {
  command: string;
  args?: Record<string, string | number | boolean>;
}): string[] {
  const commandParts = step.command.split(".");
  if (commandParts.length !== 2 || !commandParts[0] || !commandParts[1]) {
    throw new Error(`Invalid plan step command: ${step.command}`);
  }

  const [group, command] = commandParts;
  const argv = [group, command];
  const args = { ...(step.args ?? {}) };

  if ("project" in args && typeof args.project !== "boolean") {
    argv.push(String(args.project));
    delete args.project;
  }

  for (const [key, value] of Object.entries(args)) {
    if (typeof value === "boolean") {
      if (value) {
        argv.push(`--${key}`);
      }
      continue;
    }
    argv.push(`--${key}`, String(value));
  }

  return argv;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function parseJsonText<T>(raw: string, context: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`${context}: ${formatError(error)}`);
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim().length > 0);
}

function validatePlan(plan: unknown):
  | {
      ok: true;
      value: {
        steps: Array<{
          command: string;
          args?: Record<string, string | number | boolean>;
        }>;
      };
    }
  | { ok: false; message: string } {
  if (!plan || typeof plan !== "object" || !Array.isArray((plan as { steps?: unknown }).steps)) {
    return { ok: false, message: "Plan file must contain a `steps` array." };
  }

  const steps = (plan as { steps: unknown[] }).steps;
  for (const [index, step] of steps.entries()) {
    if (!step || typeof step !== "object") {
      return { ok: false, message: `Plan step ${index} must be an object.` };
    }

    if (typeof (step as { command?: unknown }).command !== "string") {
      return { ok: false, message: `Plan step ${index} is missing a string \`command\`.` };
    }

    const commandParts = (step as { command: string }).command.split(".");
    if (commandParts.length !== 2 || !commandParts[0] || !commandParts[1]) {
      return { ok: false, message: `Plan step ${index} has an invalid command: ${(step as { command: string }).command}.` };
    }

    const args = (step as { args?: unknown }).args;
    if (typeof args !== "undefined" && (!args || typeof args !== "object" || Array.isArray(args))) {
      return { ok: false, message: `Plan step ${index} must use an object for \`args\`.` };
    }
  }

  return {
    ok: true,
    value: plan as {
      steps: Array<{
        command: string;
        args?: Record<string, string | number | boolean>;
      }>;
    },
  };
}

function getNestedCliError(
  stdout: string[],
): { code: CliErrorCode; message: string } | undefined {
  const lastOutput = stdout.at(-1);
  if (!lastOutput) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(lastOutput) as {
      ok?: boolean;
      error?: { code?: string; message?: string };
    };
    if (parsed.ok === false && parsed.error && CLI_ERROR_CODES.has(parsed.error.code as CliErrorCode)) {
      return {
        code: parsed.error.code as CliErrorCode,
        message: parsed.error.message ?? "Unknown error",
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function wantsJson(argv: string[]): boolean {
  return argv.includes("--json");
}

function normalizeCliError(error: unknown): {
  code: CliErrorCode;
  message: string;
} {
  const message = formatError(error);

  if (/Unsupported modelVersion/i.test(message)) {
    return { code: "UNSUPPORTED_MODEL_VERSION", message };
  }
  if (/frame index/i.test(message)) {
    return { code: "FRAME_INDEX_OUT_OF_RANGE", message };
  }
  if (/layer index|Layer .* not found|Layer .* was not found/i.test(message)) {
    return { code: "LAYER_INDEX_OUT_OF_RANGE", message };
  }
  if (/Coordinates .* out of bounds/i.test(message)) {
    return { code: "INVALID_COORDINATES", message };
  }
  if (/Invalid color/i.test(message)) {
    return { code: "INVALID_COLOR", message };
  }
  if (/Invalid plan JSON|Invalid pixel input JSON|Invalid plan step/i.test(message)) {
    return { code: "USAGE_ERROR", message };
  }
  if (/Invalid chunk layout|Invalid PNG data URI|Unexpected token/i.test(message)) {
    return { code: "INVALID_PISKEL_FILE", message };
  }
  if (/synchronized|last layer|last frame|dimensions matching|at least one layer/i.test(message)) {
    return { code: "PROJECT_SYNC_ERROR", message };
  }
  if (/ENOENT|no such file/i.test(message)) {
    return { code: "FILE_NOT_FOUND", message };
  }
  if (/Missing required|Missing project path|Missing plan path|must be|requires|Usage:/i.test(message)) {
    return { code: "USAGE_ERROR", message };
  }

  return { code: "READ_FAILED", message };
}

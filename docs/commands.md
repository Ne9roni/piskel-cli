# Command guide

This document is the detailed command reference for `piskel-cli`.

It covers:

- User-facing command descriptions: what each command does and how to use it
- Integration-oriented details: JSON protocol, default output rules, common error codes

> **Chinese:** [`commands.zh-CN.md`](./commands.zh-CN.md)

## General notes

- Relative paths are resolved from the current working directory when you invoke the CLI.
- Every command supports `--json` and returns a unified envelope:
  - Success: `{ "ok": true, "data": ... }`
  - Failure: `{ "ok": false, "error": { "code": "...", "message": "..." } }`
- Create and export commands default to `./output/` when no output path is given.
- Mutating commands default to in-place writes when `--output` is omitted (same path as the input `.piskel`).

## Default output locations

- `project create` → `output/output.piskel`
- `export png` → `output/output.png`
- `export gif` → `output/output.gif`
- `export spritesheet` → `output/output.png` (image)
- `export frames` → `output/frames/`

## Common error codes

| Code | Meaning |
|------|---------|
| `USAGE_ERROR` | Invalid command or arguments |
| `FILE_NOT_FOUND` | Input file does not exist |
| `INVALID_PISKEL_FILE` | Invalid `.piskel` format |
| `UNSUPPORTED_MODEL_VERSION` | Unsupported `modelVersion` |
| `FRAME_INDEX_OUT_OF_RANGE` | Frame index out of range |
| `LAYER_INDEX_OUT_OF_RANGE` | Layer index out of range |
| `INVALID_COLOR` | Invalid color format |
| `INVALID_COORDINATES` | Coordinates out of bounds or invalid |
| `PROJECT_SYNC_ERROR` | Layer/frame sync error; cannot export or save |
| `WRITE_FAILED` | File write failed |
| `READ_FAILED` | File read failed |
| `VENDOR_MISSING` | Bundled web assets (`vendor/piskel-prod`) missing; `serve` cannot start |

## Project

### `project create`

Purpose:

- Create a new `.piskel` project file
- By default creates one layer and one empty frame

Common flags:

- `--width` — canvas width
- `--height` — canvas height
- `--fps` — frames per second (default `12`)
- `--name` — project name
- `--output` — output path (default `output/output.piskel`)

Examples:

```bash
node dist/src/cli.js project create --width 16 --height 16 --json
node dist/src/cli.js project create --width 32 --height 32 --name hero --output output/hero.piskel --json
```

### `project info`

Purpose:

- Read basic metadata from a `.piskel`
- Useful for scripts to inspect a project before editing

Example:

```bash
node dist/src/cli.js project info output/output.piskel --json
```

## Layer

### `layer list`

Purpose:

- List all layers with order, name, opacity, and frame count

Example:

```bash
node dist/src/cli.js layer list output/output.piskel --json
```

### `layer add`

Purpose:

- Add a new layer; frame count is kept in sync with the project

Example:

```bash
node dist/src/cli.js layer add output/output.piskel --name shadow --json
```

### `layer remove`

Purpose:

- Remove a layer; the last remaining layer cannot be removed

Examples:

```bash
node dist/src/cli.js layer remove output/output.piskel --layer shadow --json
node dist/src/cli.js layer remove output/output.piskel --layer 1 --json
```

### `layer rename`

Purpose:

- Rename a layer

Example:

```bash
node dist/src/cli.js layer rename output/output.piskel --layer shadow --name outline --json
```

### `layer set-opacity`

Purpose:

- Set layer opacity in the range `0..1`

Example:

```bash
node dist/src/cli.js layer set-opacity output/output.piskel --layer outline --opacity 0.5 --json
```

### `layer move`

Purpose:

- Reorder layers; `--to` is the target index

Example:

```bash
node dist/src/cli.js layer move output/output.piskel --layer outline --to 0 --json
```

## Frame

### `frame list`

Purpose:

- List frame indices

Example:

```bash
node dist/src/cli.js frame list output/output.piskel --json
```

### `frame add`

Purpose:

- Add a frame (appended by default)

Examples:

```bash
node dist/src/cli.js frame add output/output.piskel --json
node dist/src/cli.js frame add output/output.piskel --index 1 --json
```

### `frame remove`

Purpose:

- Remove a frame; the last remaining frame cannot be removed

Example:

```bash
node dist/src/cli.js frame remove output/output.piskel --frame 1 --json
```

### `frame duplicate`

Purpose:

- Duplicate a frame

Example:

```bash
node dist/src/cli.js frame duplicate output/output.piskel --frame 0 --json
```

### `frame move`

Purpose:

- Reorder frames

Example:

```bash
node dist/src/cli.js frame move output/output.piskel --frame 2 --to 0 --json
```

## Draw / Fill / Erase / Clear

### `draw pixel`

Purpose:

- Draw a single pixel on a layer/frame

Example:

```bash
node dist/src/cli.js draw pixel output/output.piskel --x 1 --y 1 --color "#ff0000" --json
```

### `draw pixels`

Purpose:

- Batch-draw pixels from a JSON file

Example:

```bash
node dist/src/cli.js draw pixels output/output.piskel --input pixels.json --json
```

### `draw line`

Purpose:

- Draw a line segment

Example:

```bash
node dist/src/cli.js draw line output/output.piskel --x1 0 --y1 0 --x2 7 --y2 7 --color "#00ff00" --json
```

### `draw rect`

Purpose:

- Draw a rectangle; add `--filled` for a filled rectangle

Example:

```bash
node dist/src/cli.js draw rect output/output.piskel --x1 1 --y1 1 --x2 4 --y2 4 --color "#ff0000" --filled --json
```

### `draw circle`

Purpose:

- Draw a circle or ellipse outline

Example:

```bash
node dist/src/cli.js draw circle output/output.piskel --x1 1 --y1 1 --x2 5 --y2 5 --color "#0000ff" --json
```

### `fill area`

Purpose:

- Flood-fill a connected region

Example:

```bash
node dist/src/cli.js fill area output/output.piskel --x 3 --y 3 --color "#ffff00" --json
```

### `erase pixel`

Purpose:

- Erase a single pixel

Example:

```bash
node dist/src/cli.js erase pixel output/output.piskel --x 1 --y 1 --json
```

### `clear frame`

Purpose:

- Clear an entire frame; with `--layer`, only that layer’s frame cells are cleared

Example:

```bash
node dist/src/cli.js clear frame output/output.piskel --json
```

## Read

### `read pixel`

Purpose:

- Read a single pixel color

Example:

```bash
node dist/src/cli.js read pixel output/output.piskel --x 1 --y 1 --json
```

### `read frame`

Purpose:

- Read the full 2D pixel grid for a frame

Example:

```bash
node dist/src/cli.js read frame output/output.piskel --json
```

### `read project`

Purpose:

- Read a project summary

Example:

```bash
node dist/src/cli.js read project output/output.piskel --json
```

### `read palette`

Purpose:

- List colors used on the current frame

Example:

```bash
node dist/src/cli.js read palette output/output.piskel --json
```

### `read bounds`

Purpose:

- Bounding box of non-transparent pixels

Example:

```bash
node dist/src/cli.js read bounds output/output.piskel --json
```

## Export

### `export png`

Purpose:

- Export a PNG (single frame or full spritesheet); default `output/output.png`

Examples:

```bash
node dist/src/cli.js export png output/output.piskel --json
node dist/src/cli.js export png output/output.piskel --frame 0 --json
```

### `export gif`

Purpose:

- Export an animated GIF; default `output/output.gif`

Example:

```bash
node dist/src/cli.js export gif output/output.piskel --json
```

### `export spritesheet`

Purpose:

- Export a spritesheet PNG; optional metadata JSON

Example:

```bash
node dist/src/cli.js export spritesheet output/output.piskel --columns 4 --metadata output/output.json --json
```

### `export frames`

Purpose:

- Export each frame as its own PNG under `output/frames` by default

Example:

```bash
node dist/src/cli.js export frames output/output.piskel --json
```

## Serve

### `serve [<project.piskel>]`

Purpose:

- Start a local **HTTP static server** for the bundled **Piskel web editor** (`vendor/piskel-prod`, same build family as [piskelapp.com](https://www.piskelapp.com/)).
- Optionally open a `.piskel` file in the browser; with no path, opens a blank canvas.
- The process **keeps running** until **Ctrl+C**; meant for interactive local editing, not headless CI.

Prerequisites:

- `vendor/piskel-prod/index.html` must exist (included in published `npm install -g @ne9roni/piskel-cli`; if you clone source without it, run `npm run sync-piskel-vendor` — see [`vendor/README.md`](../vendor/README.md)).

Flags:

- **Positional (optional):** path to a `.piskel` file to load.
- `--port <N>` — listen port; **omit** to let the OS pick a free port.
- `--host <addr>` — bind address (default `127.0.0.1`).
- `--no-open` — print the URL only; do **not** launch the default browser (useful on Linux/WSL without `xdg-open`).
- `--json` — after startup, print one JSON object (`ok`, `data.url`, `data.port`, …) to stdout; the process still keeps running.

Notes:

- When loading a project, the CLI exposes that file at a one-time URL under **`/__piskel/open/<token>`** so arbitrary filesystem paths are not browsable.
- If the default browser launcher is missing (`xdg-open`), the CLI tries `wslview`, `gio`, then `sensible-browser`; if all fail, open the printed URL manually.

Examples:

```bash
node dist/src/cli.js serve
node dist/src/cli.js serve output/output.piskel
node dist/src/cli.js serve output/output.piskel --port 9000 --no-open
piskel-cli serve examples-output/sword/sword.piskel --json
```

## Run

### `run <plan.json>`

Purpose:

- Execute a structured multi-step plan file in order

Example:

```bash
node dist/src/cli.js run examples/heart-plan.json --json
```

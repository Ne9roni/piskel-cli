# piskel-cli

> **Headless pixel art engine for scripts, pipelines, and AI agents.**  
> Create, edit, and export `.piskel` files entirely from the terminal — no browser, no GUI, no clicks.

[![npm version](https://img.shields.io/npm/v/@ne9roni/piskel-cli)](https://www.npmjs.com/package/@ne9roni/piskel-cli)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## Why piskel-cli?

[Piskel](https://www.piskelapp.com/) is a beloved browser-based pixel art editor. **piskel-cli** brings its `.piskel` format to the command line, making pixel art a first-class citizen in any automated workflow:

- **AI agents** can generate sprites and animations programmatically
- **Build pipelines** can produce and export assets without human interaction
- **Scripts** can batch-edit hundreds of frames in seconds
- **CI/CD** can validate and regenerate pixel art assets automatically

Every operation is scriptable, composable, and returns structured JSON — making it trivially easy to chain with other tools.

---

## Demo

Describe your art once in a plan file, run one command, get PNG + GIF + frame exports:

```bash
piskel-cli run examples/heart-plan.json --json
```

<table>
<tr>
<td align="center"><b>heart.gif</b></td>
<td align="center"><b>twinkle-star.gif</b></td>
</tr>
<tr>
<td align="center"><img src="examples-output/heart/heart.gif" alt="heart pixel art" /></td>
<td align="center"><img src="examples-output/twinkle-star/twinkle-star.gif" alt="twinkle star animation" /></td>
</tr>
</table>

Both generated entirely by `piskel-cli` from JSON plan files in [`examples/`](examples/).

---

## Install

```bash
# Install globally (recommended)
npm install -g @ne9roni/piskel-cli

# Verify
piskel-cli --help
```

Or use locally from source:

```bash
git clone https://github.com/Ne9roni/piskel-cli.git
cd piskel-cli
npm install && npm run build
node dist/src/cli.js --help
```

---

## Quick Start

### 1. Create a project

```bash
piskel-cli project create --width 16 --height 16 --name my-sprite --json
```

### 2. Draw pixels

```bash
piskel-cli draw rect output/my-sprite.piskel --x1 2 --y1 2 --x2 13 --y2 13 --color "#ff0000" --filled --json
piskel-cli draw pixel output/my-sprite.piskel --x 8 --y 8 --color "#ffffff" --json
```

### 3. Export

```bash
piskel-cli export png output/my-sprite.piskel --json
piskel-cli export gif output/my-sprite.piskel --json
piskel-cli export frames output/my-sprite.piskel --json
```

### Or do it all at once with a plan file

```json
{
  "steps": [
    { "command": "project.create", "args": { "width": 16, "height": 16, "name": "hero" } },
    { "command": "draw.rect",      "args": { "project": "output/output.piskel", "x1": 3, "y1": 0, "x2": 12, "y2": 15, "color": "#4fc3f7", "filled": true } },
    { "command": "export.gif",     "args": { "project": "output/output.piskel" } }
  ]
}
```

```bash
piskel-cli run my-plan.json --json
```

---

## All Commands

| Group | Commands |
|-------|----------|
| **Project** | `project create`, `project info` |
| **Layer** | `layer list`, `layer add`, `layer remove`, `layer rename`, `layer set-opacity`, `layer move` |
| **Frame** | `frame list`, `frame add`, `frame remove`, `frame duplicate`, `frame move` |
| **Draw** | `draw pixel`, `draw pixels`, `draw line`, `draw rect`, `draw circle` |
| **Fill / Erase** | `fill area`, `erase pixel`, `clear frame` |
| **Read** | `read pixel`, `read frame`, `read project`, `read palette`, `read bounds` |
| **Export** | `export png`, `export gif`, `export spritesheet`, `export frames` |
| **Run** | `run <plan.json>` — execute multi-step plan files |

Full reference: [`docs/commands.md`](docs/commands.md)

---

## JSON Protocol

Every command supports `--json` for machine-readable output:

```json
// Success
{ "ok": true, "data": { ... } }

// Failure
{ "ok": false, "error": { "code": "FRAME_INDEX_OUT_OF_RANGE", "message": "..." } }
```

Consistent error codes across all commands make error handling simple in any language.

---

## Plan Files

The `run` command executes a JSON plan file as an atomic sequence of steps — ideal for AI agents, build scripts, or complex multi-frame animations:

```bash
piskel-cli run examples/twinkle-star-plan.json --json
```

See [`examples/`](examples/) for full working examples and [`skills/using-piskel-cli/reference/reference-plan-format.md`](skills/using-piskel-cli/reference/reference-plan-format.md) for the complete plan format spec.

---

## AI Agent Integration

piskel-cli ships with a [Skills CLI](https://www.npmjs.com/package/skills) skill — a structured prompt that tells AI agents exactly how to use this tool safely and correctly:

```bash
npx skills add Ne9roni/piskel-cli
```

The skill enforces a mandatory alignment step before any mutating operations, preventing AI agents from making unintended changes. See [`skills/using-piskel-cli/SKILL.md`](skills/using-piskel-cli/SKILL.md).

---

## Architecture

piskel-cli is implemented as a pure **Node.js / TypeScript** library with zero runtime browser dependencies. It operates directly on the `.piskel` JSON format:

- **`src/probe/`** — headless read/write engine for `.piskel` files
- **`src/cli/`** — command parser and JSON protocol layer
- **`tests/`** — Vitest test suite covering `.piskel` I/O, CLI behavior, export correctness, and plan execution

---

## Development

```bash
npm install
npm run build          # Compile TypeScript
npm test               # Run full test suite (Vitest)
npm run test:watch     # Watch mode
```

Tests live in [`tests/`](tests/) and cover `.piskel` read/write, CLI behavior, default output paths, and plan execution end-to-end.

---

## License

[Apache-2.0](LICENSE)

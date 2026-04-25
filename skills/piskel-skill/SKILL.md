---
name: piskel-skill
description: Use when an AI agent needs to create, edit, inspect, or export pixel art, sprites, animations, or .piskel files with piskel-cli in a tool-driven workflow. Workflow step 2 (align + explicit user go-ahead) is mandatory before any mutating or export commands; do not skip it.
---

# Using piskel-cli

Follow the **Workflow** below in order; anything not spelled out here defaults to `piskel-cli --help`.

For **every subcommand, flags, defaults, JSON protocol, error codes, and `serve`**, read the files shipped inside the installed npm package **`@ne9roni/piskel-cli`** (works offline after `npm install`; no CDN required):

- **Project / local dependency:**  
  `node_modules/@ne9roni/piskel-cli/docs/commands.md` (English) · `node_modules/@ne9roni/piskel-cli/docs/commands.zh-CN.md` (Chinese)
- **Global install** (`npm install -g @ne9roni/piskel-cli`):  
  `$(npm root -g)/@ne9roni/piskel-cli/docs/commands.md` — run `npm root -g` if you need the absolute prefix.

## Core rules

- **Step 2 is a hard gate:** Any action that **creates or edits a `.piskel`, changes pixels, frames, or layers, or exports PNG/GIF/frame sequences** (including via `run`, `plan.json`, scripts that write pixel JSON then invoke the CLI, etc.) **must** only run **after** step 2: restate the goal, list defaults and items that need user sign-off, and obtain **explicit user approval**. Approval means: the user **clearly confirms** your proposed plan, **or** a **single user message** already contains **all** required decisions (at least canvas width and height) and authorizes generation/export. Skipping step 2 before those actions violates this skill.
- **No drawing without alignment:** Do not skip alignment because the user said “generate” / “draw for me,” because it “sounds like permission,” or by **inferring canvas width and height yourself.** Width and height must be **settled in the conversation**: either the user **states** them, or you propose values and the user **explicitly confirms** (including dimensions). Do not substitute “common sizes” or “a first draft” before that. If approval is in **one message**, that message must **at least** state canvas width and height (and other required items); the agent must not rely on silent inference alone.
- **Align first, then mutate:** Any operation that creates or modifies `.piskel`, draws pixels, adds/removes frames or layers, or exports PNG/GIF/frames may run only **after** alignment and confirmation per step 2.
- **What to align:** At minimum, restate the user’s goal, state the CLI defaults you will use, and list what needs sign-off (**at least canvas width and height** and **what to draw**; also animation, transparency, export paths when relevant). Enter step 3 only when the user **explicitly confirms** your list, or a **single message** already contains **all** required items (**including width and height**) and asks for generation/export.
- **Do not decide critical parameters for the user:** Do not replace user sign-off with “usual sizes” or “let me try a run”; scripts, `plan.json`, `run`, and pre-baked pixel JSON are subject to the same rules.
- **Iteration scope:** Small edits on an already-approved project may continue within that approval. **New projects** or changes to **canvas size, FPS, or export conventions** require a fresh alignment round.

## Workflow

1. **Prepare the CLI**  
   Run `which piskel-cli`; if missing, `npm install -g @ne9roni/piskel-cli`. After that use the **`piskel-cli`** command name only — do not substitute `PISKEL_CLI`, `npx`, or a repo script path unless the user’s environment explicitly requires it.

2. **Align and wait for confirmation before any “mutating” work — cannot skip**  
   This step is the gate: until alignment is done and the user confirms, **do not** proceed to step 3 or run anything that **creates or changes image/project files** (see Core rules).  
   Restate the goal and list in one pass: **CLI defaults** you will use if unspecified (`1` layer + `1` frame, FPS `12`, `output/output.piskel`; PNG/GIF exports to `output/output.png` / `output/output.gif`; per-frame folder `output/frames`), and items that need user sign-off — **at least canvas width and height** (`project create` has no default size) and **what to draw**; also animation, transparency, export format, custom paths when relevant.  
   Until the user **clearly confirms** (e.g. approves your stated width/height and plan), or **one message** already states **all** required items (including width and height) and requests generation/export, **do not** run: `project create`, any `draw` / `fill` / `erase` / `clear`, any `layer` / `frame`, any `export`, or `run` that includes those steps (including writing `plan.json` first or generating pixel JSON and immediately running — all count as mutating).  
   Before this step you **may**: install the CLI, `--help`, and **read-only** `read` on an **existing** user `.piskel`.

   **Iteration:** If the user already approved a configuration, small follow-up edits on the same project can continue with `draw` / `export` / `run` within that scope. **New project** or **canvas size / FPS / export contract** changes require listing and confirming again.

3. **Execute changes**  
   Prefer `--json` for automation; handle `ok` / `data` / `error`. For multiple steps, prefer a `plan.json` and `piskel-cli run <plan.json> --json`. Typical single-command order: `project create` → `draw.*` / `fill` / `erase` → `export.*` (with `layer` / `frame` as needed). On failure, read `error.code` and `error.message` before retrying.

4. **Verify and iterate**  
   Use `read project`, `read frame`, `read palette`, `read bounds` to inspect results before the next edit.

## Command reference

Paths below are relative to the **`@ne9roni/piskel-cli`** package root (same tree under `node_modules/@ne9roni/piskel-cli/` or `$(npm root -g)/@ne9roni/piskel-cli/`).

- **Full CLI spec (all groups, flags, examples):** `docs/commands.md`
- **Plan file shape for `run`:** `skills/piskel-skill/reference/reference-plan-format.md`

Summary of groups (see `docs/commands.md` for details):

`project` · `layer` · `frame` · `draw` / `fill` / `erase` / `clear` · `read` · `export` · `run` · `serve`

Plan `command` strings look like `project.create`, `draw.pixels` (see plan reference above).

# Plan files and JSON reference

## Executable resolution

Same as the main skill `SKILL.md`: use **`{{PISKEL}}`** for the resolved command prefix (`PISKEL_CLI` → `piskel-cli` → `npx @ne9roni/piskel-cli@…` per your environment).

## `run` plan shape

The top-level object must contain a `steps` array. Each step has:

- `command` — **two** dot-separated segments matching CLI `group.subcommand`, e.g. `project.create`, `draw.pixel`, `export.png`.
- `args` — optional object; `project` maps to the positional `.piskel` path right after the subcommand; other keys become `--flag value`.

Boolean `true` becomes a flag with no value (`--flag`).

## Minimal example

```json
{
  "steps": [
    {
      "command": "project.create",
      "args": {
        "width": 16,
        "height": 16,
        "output": "output/example.piskel",
        "name": "example"
      }
    },
    {
      "command": "draw.pixel",
      "args": {
        "project": "output/example.piskel",
        "x": 1,
        "y": 1,
        "color": "#ff0000"
      }
    },
    {
      "command": "export.png",
      "args": {
        "project": "output/example.piskel",
        "output": "output/example.png"
      }
    }
  ]
}
```

Relative paths are resolved from the current working directory when the CLI runs.

## `--json` response shape (summary)

Success:

```json
{
  "ok": true,
  "data": { }
}
```

When `run` completes all steps:

```json
{
  "ok": true,
  "data": {
    "run": { "status": "completed", "steps": 10 }
  }
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "USAGE_ERROR",
    "message": "..."
  }
}
```

## Running a plan

Typical invocation (replace `{{PISKEL}}` with your actual prefix):

```bash
{{PISKEL}} run plan.json --json
```

For a plan similar to the minimal example above, you will usually get:

- `output/example.piskel`
- `output/example.png`

If the plan also exports GIF or per-frame PNGs, you may additionally see:

- `output/example.gif`
- `output/frames/frame-0.png`

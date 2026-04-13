---
name: using-piskel-cli
description: Use when an AI agent needs to create, edit, inspect, or export pixel art, sprites, animations, or .piskel files with piskel-cli in a tool-driven workflow. Workflow step 2 (align + explicit user go-ahead) is mandatory before any mutating or export commands; do not skip it.
---

# 使用 piskel-cli

用下面 **Workflow** 按顺序做即可；未写的细节以 `piskel-cli --help` 为准。

## 核心原则

- **Workflow 第 2 步是硬性门禁**：凡会**新建/改 `.piskel`、改像素、改帧或图层、导出 png/gif/逐帧图**（含通过 `run`、`plan.json`、脚本写像素 JSON 再调 CLI 等间接路径），**一律**须在 Workflow **第 2 步**完成「复述目标 + 列清默认值与须拍板项 + **用户侧明确拍板**」之后才能执行。拍板包括：**用户明确回复确认**你列出的方案，**或**用户**同一条消息**内已写清全部须拍板项（至少含画布宽高）并授权生成/导出。未完成第 2 步即执行上述操作，视为违反本技能。
- **禁止未对齐就生成图**：不得用「用户说生成/帮我画」、语气像授权、或**代理自行补全画布宽高**等理由跳过对齐。**画布宽高**须在对话中**敲定**：要么用户**直接写出**宽高，要么你先列出方案且用户**明确回复确认**采纳（含宽高）；**不得**在未完成上述任一路径时，用「常见尺寸」「先出一版」代替。**同一条消息**内授权生成时，该消息须**至少写明画布宽高**（及其它须拍板项），不得仅靠代理推断。
- **先对齐需求，再执行生成**：任何会新建或修改 `.piskel`、绘制像素、增删帧/图层、或导出 png/gif/逐帧图的操作，都必须在**已与用户对齐且用户已确认**（见 Workflow 第 2 步）之后才能做；禁止为了「省事」跳过对齐。
- **对齐内容**：至少复述用户目标、说明拟采用的 CLI 默认值，并列出须拍板项（**至少含画布宽高**与画什么；另有动画、透明底、导出路径等时一并列清）。**仅当**用户**明确回复确认**采纳你列出的方案，**或**用户**同一条消息**里已**写清全部须拍板项**（**至少含画布宽高**）并明确要求生成/导出时，方可进入 Workflow 第 3 步。
- **不替用户擅自定案**：不得以「常见尺寸」「先跑一版」代替用户对关键参数的认可；脚本、`plan.json`、`run`、预生成像素 JSON 等凡导致改图的，均受同一规则约束。
- **迭代边界**：在同一已确认的工程上做小改，可在该确认范围内继续；**新工程**或**画布尺寸 / 帧率 / 导出约定**等发生变化时，须重新对齐后再执行。

## Workflow

1. **准备 CLI**  
   执行 `which piskel-cli`；若没有，则 `npm install -g @ne9roni/piskel-cli`。之后**只**用命令名 `piskel-cli`，不要用 `PISKEL_CLI`、`npx` 或仓库内脚本路径替代。

2. **对齐需求并等用户确认（再做任何「会改图」的操作）——本步不可跳过**  
   **本步是门禁**：未完成本步所列对齐并得到用户确认前，**禁止**进入第 3 步，**禁止**执行任何会产出或修改图像/工程文件的操作（见上文「核心原则」）。  
   复述用户目标，并一次性列出：拟采用的 **CLI 默认值**（未说明就用：`1` 图层 + `1` 帧、FPS `12`、`output/output.piskel`；导出 png/gif 分别为 `output/output.png` / `output/output.gif`；逐帧目录 `output/frames`），以及须用户拍板的项——**至少包含画布宽高**（`project create` 无默认宽高）和**画什么**；若有动画/透明底/导出格式/自定义路径，也在此列清或给出你的默认并请对方确认。  
   **在用户明确回复确认**（例如确认你列出的宽高与方案），或**同一条用户消息**里已**写明画布宽高等全部须拍板项**并明确要求生成/导出之前，**不要**执行：`project create`、任意 `draw` / `fill` / `erase` / `clear`、任意 `layer` / `frame`、任意 `export`、以及包含上述步骤的 `run`（含先写 `plan.json` 再 `run`、或脚本生成像素 JSON 后立刻执行——这些都算「改图」）。  
   此步之前**可以**做：安装 CLI、`--help`、对用户**已有** `.piskel` 的只读 `read`。

   **迭代**：若用户已确认过一套参数，后续仅在同工程上小改，可在同一确认范围内继续 `draw` / `export` / `run`；一旦涉及**新工程**或**改变画布尺寸/帧率/导出约定**等，须再列清并确认。

3. **执行改动**  
   自动化调用尽量带 `--json`，按返回里的 `ok` / `data` / `error` 处理。多步操作优先写一个 `plan.json`，再 `piskel-cli run <plan.json> --json`。单条命令时的典型顺序：`project create` → `draw.*` / `fill` / `erase` → `export.*`（中间按需 `layer` / `frame`）。失败时先看 `error.code` 与 `error.message` 再改参数重试。

4. **核对与迭代**  
   需要看内容时用 `read project`、`read frame`、`read palette`、`read bounds`，再决定下一笔怎么改。

## 命令一览（按需查帮助）

`project` · `layer` · `frame` · `draw` / `fill` / `erase` / `clear` · `read` · `export` · `run`

计划文件里 `command` 形如 `project.create`、`draw.pixels`，详见 [reference/reference-plan-format.md](reference/reference-plan-format.md)。

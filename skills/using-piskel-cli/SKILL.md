---
name: using-piskel-cli
description: Use when an AI agent needs to create, edit, inspect, or export pixel art, sprites, animations, or .piskel files with piskel-cli in a tool-driven workflow.
---

# 使用 piskel-cli 生成像素图

本技能用于指导 AI 通过 **piskel-cli** 生成、修改、检查和导出像素图。

## 选择可执行文件（按优先级）

1. 环境变量 **`PISKEL_CLI`**：指向完整命令或包装脚本（可含参数前缀）。
2. **`piskel-cli`**：已在 `PATH` 中（例如全局安装）。
3. **`npx piskel-cli@1.0.0`**：未安装时使用（版本与 npm 包 `piskel-cli` 对齐，可按发布说明升级）。

下文用 **`{{PISKEL}}`** 表示以上解析得到的调用前缀：例如 `piskel-cli`、`C:\bin\piskel-cli.exe`，或 `npx piskel-cli@1.0.0`。

## 核心规则

1. 所有自动化调用都优先带 `--json`，按 `ok` / `data` / `error` 解析结果。
2. 多步编辑优先写成一个 `plan.json`，然后执行 `run <plan.json> --json`。
3. 命令失败时先看 `error.code` 和 `error.message`，不要盲目重试同一组参数。
4. 需要验证图像内容时，用 `read project`、`read frame`、`read palette`、`read bounds`。
5. 不确定 flag 或参数名时，优先查看 `{{PISKEL}} --help` 或对应子命令帮助。

## 推荐流程

1. 从用户描述中提取尺寸、主色、是否需要透明背景、是否需要动画。
2. 决定是单步命令还是批量计划；只要超过 2 到 3 步，就优先用 `run`。
3. 先创建工程，再绘制，再导出：
   `project.create` -> `draw.*` / `fill` / `erase` -> `export.*`
4. 导出后如果需要复查，读取 frame / palette / bounds，再做增量修正。

## 常用命令组

- `project`：创建工程、读取工程信息。
- `layer`：增加、重命名、移动、删除图层。
- `frame`：增加、复制、移动、删除帧。
- `draw` / `fill` / `erase` / `clear`：修改像素内容。
- `read`：读取像素、帧、调色板、边界、工程摘要。
- `export`：导出 PNG、GIF、spritesheet、逐帧 PNG。
- `run`：按计划文件一次执行多步操作。

## 计划文件参考

`run` 的结构、`command` 命名方式和 JSON 返回摘要见：

- [reference/reference-plan-format.md](reference/reference-plan-format.md)

## 给 AI 的提示词模板

```text
请使用 piskel-cli 生成像素图（优先 PISKEL_CLI，其次 PATH，其次 npx piskel-cli@1.0.0）。
优先使用带 --json 的命令；多步操作优先写成 plan.json 后用 run 执行。
如果执行失败，先读取 error.code 和 error.message 再修正。
如果需要核对内容，使用 read frame、read palette、read bounds。
```

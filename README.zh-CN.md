# piskel-cli

> **English:** [README.md](README.md)

> **面向脚本、流水线与 AI 代理的无头像素引擎。**  
> 在终端里创建、编辑、导出 `.piskel`；需要图形界面时使用 `serve` 打开自带的 **Piskel** 网页编辑器。

[![npm version](https://img.shields.io/npm/v/@ne9roni/piskel-cli)](https://www.npmjs.com/package/@ne9roni/piskel-cli)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## 为什么选择 piskel-cli？

[Piskel](https://www.piskelapp.com/) 是广受欢迎的浏览器像素编辑器。**piskel-cli** 将其 `.piskel` 格式带到命令行，让像素图能融入自动化流程：

- **AI 代理** 可用一条提示生成精灵图与动画，无需图像模型
- **构建流水线** 可在无人操作下生成并导出资源
- **脚本** 可在数秒内批量编辑大量帧
- **CI/CD** 可自动校验与重生成像素资源

所有操作均可脚本化、可组合，并返回结构化 JSON，便于与其他工具串联。

---

## AI 代理集成

**用 AI 画像素不必依赖图像生成模型。** 只要能写 JSON 的 LLM，就可以把需求写成计划文件，生成可用的精灵与动画。

### 安装 AI 技能

```bash
npx skills add Ne9roni/piskel-cli
```

会在代理环境中安装结构化提示（[`skills/using-piskel-cli/SKILL.md`](skills/using-piskel-cli/SKILL.md)），其中包含完整工作流（英文）。

### 工作方式

用自然语言告诉 AI（Claude、GPT、Cursor 等）你的目标，例如：

> *「画一个 16×16 红蘑菇，白点，导出 PNG」*

代理编写 `plan.json` 并执行：

```bash
piskel-cli run mushroom-plan.json --json
```

无需扩散模型，纯几何与命令。

---

## AI 生成示例

以下素材均由 AI 代理仅通过 piskel-cli 从一句话描述生成并导出，**未使用**图像模型。

### 精灵图（PNG）

<table>
<tr>
<th align="center">Mushroom</th>
<th align="center">Gem</th>
<th align="center">Sword</th>
<th align="center">Heart</th>
</tr>
<tr>
<td align="center"><img src="examples-output/mushroom/mushroom.png" alt="mushroom sprite" /></td>
<td align="center"><img src="examples-output/gem/gem.png" alt="gem sprite" /></td>
<td align="center"><img src="examples-output/sword/sword.png" alt="sword sprite" /></td>
<td align="center"><img src="examples-output/heart/heart.png" alt="heart sprite" /></td>
</tr>
<tr>
<td align="center"><a href="examples/mushroom-plan.json">mushroom-plan.json</a></td>
<td align="center"><a href="examples/gem-plan.json">gem-plan.json</a></td>
<td align="center"><a href="examples/sword-plan.json">sword-plan.json</a></td>
<td align="center"><a href="examples/heart-plan.json">heart-plan.json</a></td>
</tr>
</table>

### 动画（GIF）

<table>
<tr>
<th align="center">Coin Spin</th>
<th align="center">Fire</th>
<th align="center">Ghost</th>
<th align="center">Twinkle Star</th>
</tr>
<tr>
<td align="center"><img src="examples-output/coin-spin/coin-spin.gif" alt="coin spin animation" /></td>
<td align="center"><img src="examples-output/fire/fire.gif" alt="fire animation" /></td>
<td align="center"><img src="examples-output/ghost/ghost.gif" alt="ghost animation" /></td>
<td align="center"><img src="examples-output/twinkle-star/twinkle-star.gif" alt="twinkle star animation" /></td>
</tr>
<tr>
<td align="center"><a href="examples/coin-spin-plan.json">coin-spin-plan.json</a></td>
<td align="center"><a href="examples/fire-plan.json">fire-plan.json</a></td>
<td align="center"><a href="examples/ghost-plan.json">ghost-plan.json</a></td>
<td align="center"><a href="examples/twinkle-star-plan.json">twinkle-star-plan.json</a></td>
</tr>
</table>

每个示例都是 [`examples/`](examples/) 中的独立 JSON 计划，可自行运行：

```bash
piskel-cli run examples/fire-plan.json --json
```

---

## 安装

```bash
# 全局安装（推荐）
npm install -g @ne9roni/piskel-cli

# 验证
piskel-cli --help
```

npm 发布包在 `vendor/piskel-prod` 下附带 **Piskel 生产构建**，因此 `npm install -g @ne9roni/piskel-cli` 即可使用 **`piskel-cli serve`**，无需再单独克隆或下载编辑器。

从源码本地运行：

```bash
git clone https://github.com/Ne9roni/piskel-cli.git
cd piskel-cli
npm install && npm run build
node dist/src/cli.js --help
```

若克隆后没有 `vendor/piskel-prod`，需先执行一次 `npm run sync-piskel-vendor`（需要已构建的 [piskel](https://github.com/piskelapp/piskel) 仓库；见 [`vendor/README.md`](vendor/README.md)）。

---

## 浏览器编辑器（`serve`）

可选：在本机打开与 [piskelapp.com](https://www.piskelapp.com/) 相同的像素编辑器：

```bash
piskel-cli serve
piskel-cli serve path/to/project.piskel
```

使用 `--no-open` 仅打印 URL；`--port` / `--host` 控制监听地址。按 Ctrl+C 结束进程。

---

## 快速开始

### 1. 创建工程

```bash
piskel-cli project create --width 16 --height 16 --name my-sprite --json
```

### 2. 绘制像素

```bash
piskel-cli draw rect output/my-sprite.piskel --x1 2 --y1 2 --x2 13 --y2 13 --color "#ff0000" --filled --json
piskel-cli draw pixel output/my-sprite.piskel --x 8 --y 8 --color "#ffffff" --json
```

### 3. 导出

```bash
piskel-cli export png output/my-sprite.piskel --json
piskel-cli export gif output/my-sprite.piskel --json
piskel-cli export frames output/my-sprite.piskel --json
```

### 或使用计划文件一次完成

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

## 命令一览

| 分组 | 命令 |
|------|------|
| **Project** | `project create`, `project info` |
| **Layer** | `layer list`, `layer add`, `layer remove`, `layer rename`, `layer set-opacity`, `layer move` |
| **Frame** | `frame list`, `frame add`, `frame remove`, `frame duplicate`, `frame move` |
| **Draw** | `draw pixel`, `draw pixels`, `draw line`, `draw rect`, `draw circle` |
| **Fill / Erase** | `fill area`, `erase pixel`, `clear frame` |
| **Read** | `read pixel`, `read frame`, `read project`, `read palette`, `read bounds` |
| **Export** | `export png`, `export gif`, `export spritesheet`, `export frames` |
| **Run** | `run <plan.json>` — 多步计划 |
| **Serve** | `serve [<project.piskel>]` — 本地 HTTP + 自带 Piskel 网页 UI |

完整说明：[`docs/commands.md`](docs/commands.md)（英文）· [`docs/commands.zh-CN.md`](docs/commands.zh-CN.md)（中文）

---

## JSON 协议

所有命令支持 `--json`，输出机器可读结果：

```json
// 成功
{ "ok": true, "data": { ... } }

// 失败
{ "ok": false, "error": { "code": "FRAME_INDEX_OUT_OF_RANGE", "message": "..." } }
```

错误码在各命令间保持一致，便于任意语言处理。

---

## 计划文件

`run` 按顺序执行 JSON 计划，适合 AI、构建脚本或多帧动画：

```bash
piskel-cli run examples/twinkle-star-plan.json --json
```

更多示例见 [`examples/`](examples/)；计划格式见 [`skills/using-piskel-cli/reference/reference-plan-format.md`](skills/using-piskel-cli/reference/reference-plan-format.md)（英文）。

---

## 架构

piskel-cli 为纯 **Node.js / TypeScript** 实现，运行时无浏览器依赖，直接读写 `.piskel` JSON：

- **`src/probe/`** — 无头读写引擎
- **`src/cli/`** — 命令解析与 JSON 协议
- **`vendor/piskel-prod/`** — 上游 Piskel `dest/prod` 的随包副本（供 `serve`；通过 `npm run sync-piskel-vendor` 更新）
- **`tests/`** — Vitest 测试

---

## 开发

```bash
npm install
npm run build          # 编译 TypeScript
npm test               # 测试
npm run test:watch     # 监视模式
```

### 自带 Piskel 编辑器（`serve`）

在本地已 `npm install && npm run build` 的 [piskelapp/piskel](https://github.com/piskelapp/piskel) 克隆旁执行：

```bash
npm run sync-piskel-vendor
# 或: PISKEL_ROOT=/path/to/piskel npm run sync-piskel-vendor
```

详见 [`vendor/README.md`](vendor/README.md)。

**发布：** `npm publish` 会执行 `prepublishOnly`，最后一步为 **`npm run assert-vendor`**；若缺少 `vendor/piskel-prod/index.html` 则发布失败，避免 registry 上的包无法使用 `serve`。发版前请先 `sync-piskel-vendor`。

测试位于 [`tests/`](tests/)。

---

## 许可证

[Apache-2.0](LICENSE)

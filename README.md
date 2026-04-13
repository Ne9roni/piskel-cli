# piskel-cli

一个面向脚本与自动化场景的像素画命令行工具。

本工具围绕 **Piskel** 的 `.piskel` 工程格式与常见的图层 / 帧 / 像素编辑工作流建模，便于在终端里创建、修改和导出像素图。实现为独立的 **Node.js** 程序：不依赖在浏览器中打开官方 Piskel 编辑器即可执行读写与导出。

## 当前能力

支持工程管理、图层与帧、像素绘制与读取、多种图像导出，以及通过计划文件批量执行步骤。具体子命令与参数见 `docs/commands.md`。

## Get started

```bash
npm install
npm run build
node dist/src/cli.js --help
```

也可以直接运行 `node dist/src/cli.js` 查看完整命令用法。

如果通过 npm 安装已发布版本，可使用：

```bash
npm install -g @ne9roni/piskel-cli
piskel-cli --help
```

## 文档与技能

- 命令用法与说明：`docs/commands.md`
- 安装 Agent 技能（[Skills CLI](https://www.npmjs.com/package/skills)）：`npx skills add Ne9roni/piskel-cli`
- 技能说明：`skills/using-piskel-cli/SKILL.md`

## 示例

计划文件样例位于 `examples/heart-plan.json` 与 `examples/twinkle-star-plan.json`。

对应的实际生成产物位于 `examples-output/`：
- `examples-output/heart/`：包含 heart 示例生成的 `.piskel`、`.png`、`.gif` 与逐帧 PNG
- `examples-output/twinkle-star/`：包含 twinkle-star 示例生成的 `.piskel` 与 `.gif`

通用计划格式与 JSON 协议摘要见 `skills/using-piskel-cli/reference/reference-plan-format.md`。

## 测试

开发与验证使用 package.json 中的 `test` 脚本（Vitest）。用例位于 `tests/`，覆盖 `.piskel` 读写、CLI 行为、默认输出与计划执行等。

## License

本项目采用 `Apache-2.0` 许可证，完整条款见根目录 `LICENSE`。

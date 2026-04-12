# 计划文件与 JSON 参考

## 可执行文件

与主技能 `SKILL.md` 一致：用 **`{{PISKEL}}`** 表示解析后的调用前缀（`PISKEL_CLI` → `piskel-cli` → `npx piskel-cli@1.0.0`）。

## `run` 计划结构

顶层对象需包含 `steps` 数组；每一项：

- `command`：点号分隔的 **两段**，对应 CLI 的「命令组 + 子命令」，例如 `project.create`、`draw.pixel`、`export.png`。
- `args`：可选对象；其中 `project` 会映射成紧跟子命令后的工程路径参数，其余键会映射成 `--flag value`。

布尔 `true` 会变为无值开关 `--flag`。

## 最小示例

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

相对路径均相对于执行 CLI 时的当前工作目录。

## `--json` 返回形态（摘要）

成功：

```json
{
  "ok": true,
  "data": { }
}
```

`run` 全部步骤成功时常见：

```json
{
  "ok": true,
  "data": {
    "run": { "status": "completed", "steps": 10 }
  }
}
```

失败：

```json
{
  "ok": false,
  "error": {
    "code": "USAGE_ERROR",
    "message": "..."
  }
}
```

## 执行示例

下面是一种典型执行方式（把 `{{PISKEL}}` 换成实际前缀）：

```bash
{{PISKEL}} run plan.json --json
```

如果计划内容类似上面的最小示例，常见输出会是：

- `output/example.piskel`
- `output/example.png`

如果还包含 GIF 或逐帧导出步骤，则可能额外产生：

- `output/example.gif`
- `output/frames/frame-0.png`

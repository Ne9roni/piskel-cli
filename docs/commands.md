## Command Guide

这份文档是 `piskel-cli` 的唯一详细命令文档。

它同时包含两类内容：

- 面向使用者的命令说明：每个命令是做什么的、怎么用
- 面向集成方的规格说明：JSON 协议、默认输出规则、通用错误码

## 通用说明

- 所有相对路径都按执行 CLI 时的当前工作目录解析
- 所有命令都支持 `--json`，返回统一协议：
  - 成功：`{ "ok": true, "data": ... }`
  - 失败：`{ "ok": false, "error": { "code": "...", "message": "..." } }`
- 创建和导出类命令如果没指定输出位置，会默认写到当前工作目录下的 `output/`
- 修改类命令如果没指定 `--output`，默认原地修改输入的 `.piskel`

## 默认输出规则

- `project create`：默认输出到 `output/output.piskel`
- `export png`：默认输出到 `output/output.png`
- `export gif`：默认输出到 `output/output.gif`
- `export spritesheet`：默认输出图到 `output/output.png`
- `export frames`：默认输出目录为 `output/frames`

## 通用错误码


| 错误码                         | 含义                  |
| --------------------------- | ------------------- |
| `USAGE_ERROR`               | 命令或参数不合法            |
| `FILE_NOT_FOUND`            | 输入文件不存在             |
| `INVALID_PISKEL_FILE`       | `.piskel` 文件格式非法    |
| `UNSUPPORTED_MODEL_VERSION` | 不支持的 `modelVersion` |
| `FRAME_INDEX_OUT_OF_RANGE`  | 帧索引越界               |
| `LAYER_INDEX_OUT_OF_RANGE`  | 图层索引越界              |
| `INVALID_COLOR`             | 颜色格式非法              |
| `INVALID_COORDINATES`       | 坐标越界或无效             |
| `PROJECT_SYNC_ERROR`        | 图层或帧不同步，不能导出或保存     |
| `WRITE_FAILED`              | 文件写入失败              |
| `READ_FAILED`               | 文件读取失败              |


## Project

### `project create`

作用：

- 创建一个新的 `.piskel` 工程文件
- 默认会创建 1 个图层和 1 个空白帧

常用参数：

- `--width`：画布宽度
- `--height`：画布高度
- `--fps`：帧率，默认 `12`
- `--name`：项目名
- `--output`：输出路径，默认 `output/output.piskel`

示例：

```bash
node dist/src/cli.js project create --width 16 --height 16 --json
node dist/src/cli.js project create --width 32 --height 32 --name hero --output output/hero.piskel --json
```

### `project info`

作用：

- 读取 `.piskel` 的基础元信息
- 适合脚本在修改前先看工程概况

示例：

```bash
node dist/src/cli.js project info output/output.piskel --json
```

## Layer

### `layer list`

作用：

- 列出所有图层
- 查看图层顺序、名称、不透明度和帧数

示例：

```bash
node dist/src/cli.js layer list output/output.piskel --json
```

### `layer add`

作用：

- 添加一个新图层
- 新图层会自动补齐与当前工程同步的帧数

示例：

```bash
node dist/src/cli.js layer add output/output.piskel --name shadow --json
```

### `layer remove`

作用：

- 删除指定图层
- 不允许删除最后一个图层

示例：

```bash
node dist/src/cli.js layer remove output/output.piskel --layer shadow --json
node dist/src/cli.js layer remove output/output.piskel --layer 1 --json
```

### `layer rename`

作用：

- 重命名图层

示例：

```bash
node dist/src/cli.js layer rename output/output.piskel --layer shadow --name outline --json
```

### `layer set-opacity`

作用：

- 设置图层不透明度
- 取值范围 `0..1`

示例：

```bash
node dist/src/cli.js layer set-opacity output/output.piskel --layer outline --opacity 0.5 --json
```

### `layer move`

作用：

- 调整图层顺序
- `--to` 是目标索引

示例：

```bash
node dist/src/cli.js layer move output/output.piskel --layer outline --to 0 --json
```

## Frame

### `frame list`

作用：

- 列出帧索引

示例：

```bash
node dist/src/cli.js frame list output/output.piskel --json
```

### `frame add`

作用：

- 添加新帧
- 默认追加到末尾

示例：

```bash
node dist/src/cli.js frame add output/output.piskel --json
node dist/src/cli.js frame add output/output.piskel --index 1 --json
```

### `frame remove`

作用：

- 删除一帧
- 不允许删除最后一帧

示例：

```bash
node dist/src/cli.js frame remove output/output.piskel --frame 1 --json
```

### `frame duplicate`

作用：

- 复制指定帧

示例：

```bash
node dist/src/cli.js frame duplicate output/output.piskel --frame 0 --json
```

### `frame move`

作用：

- 调整帧顺序

示例：

```bash
node dist/src/cli.js frame move output/output.piskel --frame 2 --to 0 --json
```

## Draw / Fill / Erase / Clear

### `draw pixel`

作用：

- 在指定图层、指定帧上画一个像素

示例：

```bash
node dist/src/cli.js draw pixel output/output.piskel --x 1 --y 1 --color "#ff0000" --json
```

### `draw pixels`

作用：

- 批量绘制像素
- 适合外部程序先生成一个像素数组，再一次性提交

示例：

```bash
node dist/src/cli.js draw pixels output/output.piskel --input pixels.json --json
```

### `draw line`

作用：

- 画一条线段

示例：

```bash
node dist/src/cli.js draw line output/output.piskel --x1 0 --y1 0 --x2 7 --y2 7 --color "#00ff00" --json
```

### `draw rect`

作用：

- 画矩形
- 加 `--filled` 时画实心矩形

示例：

```bash
node dist/src/cli.js draw rect output/output.piskel --x1 1 --y1 1 --x2 4 --y2 4 --color "#ff0000" --filled --json
```

### `draw circle`

作用：

- 画圆或椭圆轮廓

示例：

```bash
node dist/src/cli.js draw circle output/output.piskel --x1 1 --y1 1 --x2 5 --y2 5 --color "#0000ff" --json
```

### `fill area`

作用：

- 洪水填充连通区域

示例：

```bash
node dist/src/cli.js fill area output/output.piskel --x 3 --y 3 --color "#ffff00" --json
```

### `erase pixel`

作用：

- 擦除单个像素

示例：

```bash
node dist/src/cli.js erase pixel output/output.piskel --x 1 --y 1 --json
```

### `clear frame`

作用：

- 清空整个帧
- 如果带 `--layer`，则只清空该图层对应帧

示例：

```bash
node dist/src/cli.js clear frame output/output.piskel --json
```

## Read

### `read pixel`

作用：

- 读取单个像素颜色

示例：

```bash
node dist/src/cli.js read pixel output/output.piskel --x 1 --y 1 --json
```

### `read frame`

作用：

- 读取整帧二维像素网格
- 常用于脚本或外部程序做结果检查或二次修补

示例：

```bash
node dist/src/cli.js read frame output/output.piskel --json
```

### `read project`

作用：

- 读取工程摘要

示例：

```bash
node dist/src/cli.js read project output/output.piskel --json
```

### `read palette`

作用：

- 统计当前帧使用到的颜色集合

示例：

```bash
node dist/src/cli.js read palette output/output.piskel --json
```

### `read bounds`

作用：

- 读取非透明像素的包围盒
- 适合脚本或外部程序判断图形是否越界、是否居中

示例：

```bash
node dist/src/cli.js read bounds output/output.piskel --json
```

## Export

### `export png`

作用：

- 导出单帧或整张 spritesheet 的 PNG
- 默认输出到 `output/output.png`

示例：

```bash
node dist/src/cli.js export png output/output.piskel --json
node dist/src/cli.js export png output/output.piskel --frame 0 --json
```

### `export gif`

作用：

- 导出 GIF 动画
- 默认输出到 `output/output.gif`

示例：

```bash
node dist/src/cli.js export gif output/output.piskel --json
```

### `export spritesheet`

作用：

- 导出 spritesheet PNG
- 可选同时导出 metadata JSON

示例：

```bash
node dist/src/cli.js export spritesheet output/output.piskel --columns 4 --metadata output/output.json --json
```

### `export frames`

作用：

- 把每一帧单独导出成 PNG 文件
- 默认输出到 `output/frames`

示例：

```bash
node dist/src/cli.js export frames output/output.piskel --json
```

## Run

### `run <plan.json>`

作用：

- 顺序执行一个结构化计划文件
- 适合脚本或外部程序一次性提交多步操作

示例：

```bash
node dist/src/cli.js run examples/heart-plan.json --json
```


# SA-MATERIALS-TASKS：素材与任务中心静态分析

## 身份信息

| 字段 | 值 |
| --- | --- |
| 分析 ID | SA-MATERIALS-TASKS |
| 分析对象 | 旧版 App 素材管理、任务中心、向量化服务 |
| 来源路径或位置 | `/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg` 解包后的 ASAR（`electron/main/preload.js`、`electron/renderer/dist/static/js/*.js`） |
| 分析方法 | hdiutil 只读挂载 + asar 解包 + ripgrep 字符串搜索 + preload IPC 接口还原 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-STATIC-101 |
| 最高证据等级 | E3 |
| 可信度 | medium |

## 发现

### 1. 素材管理 IPC 接口

来源：`electron/main/preload.js`。

| 命名空间 | 方法 / 通道 | 说明 |
| --- | --- | --- |
| `material` | `init()` → `material:init` | 初始化素材库。 |
| `material` | `create(data)` → `db:create` model=`material` | 创建素材记录。 |
| `material` | `find(id)` / `list(options)` / `update(id, data)` / `delete(id)` | 查询与维护。 |
| `material` | `batchDelete(ids)` → `material:batch-delete` | 批量删除。 |
| `material` | `batchMove(ids, targetCategory)` → `material:batch-move` | 批量移动到分类。 |
| `material` | `uploadVideo(path, category, options)` → `material:upload-video` | 上传视频。 |
| `material` | `uploadImage(path, category, options)` → `material:upload-image` | 上传图片。 |
| `material` | `batchProcess(ids, options)` → `material:batch-process` | 批量处理（推测抽帧/向量化）。 |
| `material` | `vectorize(id)` → `material:vectorize` | 单条向量化。 |
| `material` | `search(text, options)` → `material:search` | 素材搜索。 |
| `material` | `verifyCategoryFiles(categoryId)` → `material:verify-category-files` | 校验分类下文件完整性。 |
| `material` | `updateDescription(id, description)` → `material:update-description` | 更新描述。 |
| `category` | `create/find/findByName/list/update/delete/stats` model=`category` | 分类 CRUD。 |
| `vector` | `init/embed/search/delete` | 向量化索引服务（`chromadb` 依赖佐证）。 |

### 2. 任务中心 IPC 接口

来源：`electron/main/preload.js`。

| 命名空间 | 方法 / 通道 | 说明 |
| --- | --- | --- |
| `task` | `create(payload)` → `task:create` | 创建任务。 |
| `task` | `list(options)` / `detail(id)` | 查询任务。 |
| `task` | `updateStatus(id, status, progress, currentStep, output)` → `task:update-status` | 更新任务状态与进度。 |
| `task` | `updateData(payload)` → `task:update-data` | 更新任务数据。 |
| `task` | `delete(id)` / `stats()` | 删除、统计。 |
| `task` | `startExecutor()` / `stopExecutor()` / `executorStatus()` | 任务执行器控制。 |
| `task` | `onTaskUpdate(callback)` / `onTaskProgress(callback)` | 事件：`task:update`、`task:progress`。 |

### 3. 素材字段

来源：`electron/renderer/dist/static/js/891.7a62fefd.js`（素材管理 bundle）字符串搜索。

| 字段 | 说明 |
| --- | --- |
| `file_path` | 文件路径 |
| `file_name` | 文件名 |
| `category` | 所属分类 |
| `description` | 描述 |
| `status` | 处理状态 |
| `error` | 错误信息 |
| `result` | 处理结果 |
| `created_at` | 创建时间 |

### 4. 任务字段

来源：`electron/renderer/dist/static/js/986.9b011307.js`（任务中心 bundle）字符串搜索。

| 字段 | 说明 |
| --- | --- |
| `status` | 任务状态 |
| `progress` | 进度 |
| `current_step` | 当前步骤 |
| `input` | 输入数据 |
| `output` | 输出产物 |
| `error` | 错误信息 |
| `created_at` / `updated_at` | 创建/更新时间 |

### 5. 任务状态机

来源：任务中心 bundle 字符串（同 SA-PUBLISH-FLOW）。

| 状态值 | 中文文案 |
| --- | --- |
| `pending` | 待处理 |
| `processing` / `running` | 处理中 / 运行中 |
| `completed` / `success` | 已完成 / 成功 |
| `failed` | 失败 |
| `cancelled` | — |
| `retry` | — |

### 6. FFmpeg / 抽帧线索

来源：`package.json` 依赖与 `preload.js` 视频相关 IPC。

- `package.json` 未直接依赖 `ffmpeg`，但 `video:*`、`cover:extract-frame`、`video-parser:parse` 等接口暗示通过 Python sidecar 或本地可执行文件调用 FFmpeg。
- `video:extract-audio`、`video:build-multi-avatar-reference`、`video:transcode-to-2k` 等进一步说明 FFmpeg 用于音频提取、抽帧、转码。

## 关联记录

| 记录类型 | 路径或 ID |
| --- | --- |
| 页面巡检 | PAGE-MATERIALS、PAGE-TASK-CENTER |
| 功能卡 | FC-ASSET-MANAGEMENT |
| 运行障碍 | RB-ASSET-003、RB-ASSET-004 |

## 证据影响

| 字段 | 值 |
| --- | --- |
| 可增强的证据等级 | EV-RUNTIME-120、EV-RUNTIME-130 可从 E1 补充 E3 级接口字段证据。 |
| 剩余不确定点 | 1. `material:batch-process` 和 `material:vectorize` 的具体参数与输出格式未解出。<br>2. FFmpeg 命令行参数在 `main.jsc` 中，未直接解出。<br>3. 任务 `payload` 的完整字段结构未确认。 |
| 对 Mirax AI 设计的影响 | 1. `@mirax/local-store` 的 `materials` 表可包含 `file_path`、`file_name`、`category`、`description`、`status`、`error`、`result`、`created_at`。<br>2. `categories` 表单独管理分类，支持 `batchMove`。<br>3. `workflow_tasks` 表可包含 `status`、`progress`、`current_step`、`input`、`output`、`error`、`created_at`、`updated_at`。<br>4. `@mirax/media-pipeline` 可暴露 FFmpeg 抽帧/音频提取辅助函数，供素材处理和封面提取使用。<br>5. 第一版素材搜索可先做文件名/描述搜索，向量化搜索后续替换。 |

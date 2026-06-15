# SA-SECONDARY-ENTRYPOINTS：辅助入口与边缘状态静态分析

## 身份信息

| 字段 | 值 |
| --- | --- |
| 分析 ID | SA-SECONDARY-ENTRYPOINTS |
| 分析对象 | 旧版 App 设置页、帮助入口、软件更新、数据设置、日志上传、提示词管理、依赖检查等辅助入口与边缘状态 |
| 来源路径或位置 | `/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg` 解包后的 ASAR（`electron/main/preload.js`、`electron/renderer/dist/static/js/364.b424858d.js`、`app.5523e2f8.js` 等） |
| 分析方法 | hdiutil 只读挂载 + asar 解包 + ripgrep 字符串搜索 + preload IPC 接口还原 + JS bundle 中文标签提取 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-STATIC-003（P0 设置与本地依赖）、EV-STATIC-200（P2 辅助入口与边缘状态） |
| 最高证据等级 | E3 |
| 可信度 | medium |

## 发现

### 1. 设置页 IPC 接口

来源：`electron/main/preload.js`。

| 命名空间 | 方法 / 通道 | 说明 |
| --- | --- | --- |
| `config` | `getAll()` → `config:get-all` | 读取全部配置。 |
| `config` | `get(key)` → `config:get` | 读取单个配置项。 |
| `config` | `set(key, value, ...)` → `config:set` | 写入单个配置项。 |
| `config` | `setMultiple(payload)` → `config:set-multiple` | 批量写入。 |
| `config` | `delete(key)` → `config:delete` | 删除配置项。 |
| `config` | `getCategory(cat)` / `updateCategory(cat, data)` → `config:get-category` / `config:update-category` | 按分类读写配置。 |
| `file` | `getAppInfo()` / `getAppRoot()` / `getTempPath()` / `getDataPath()` / `getUserDataPath()` / `getDocumentsPath()` | 应用/用户数据路径查询。 |
| `file` | `selectFolder()` / `selectFile()` / `saveDialog()` | 原生文件对话框。 |
| `file` | `openExternal(url)` | 用系统浏览器打开外部链接。 |
| `file` | `openTodayLog()` / `uploadTodayLog()` → `file:open-today-log` / `file:upload-today-log` | 日志查看与上传。 |
| `file` | `clearCache()` → `file:clear-cache` | 清除缓存。 |
| `db` | `backup(path)` / `restore(path)` → `database:backup` / `database:restore` | 本地数据库备份与恢复。 |
| `cloud` | `checkVersion()` → `cloud:check-version` | 检查远端版本。 |
| `cloud` | `downloadUpdate({updateUrl})` → `cloud:download-update` | 下载更新包。 |
| `cloud` | `applyUpdate({zipPath})` → `cloud:apply-update` | 应用更新。 |
| `cloud` | `onProgress(callback)` → `cloud:progress` | 更新/下载进度事件。 |
| `llm` | `updateConfig(config)` → `llm:update-config` | 更新 LLM / AI Provider 配置。 |
| `llm` | `testConnectionWithConfig(config)` → `llm:test-connection-with-config` | 测试 Provider 连通性。 |
| `python` | `getStatus()` → `python:get-status` | Python sidecar 运行状态。 |
| `python` | `checkModuleExists(module)` → `python:check-module-exists` | 检查本地模型模块是否存在。 |
| `logger` | `debug/log/info/warn/error(...)` → `logger:*` | 分级日志上报到主进程。 |
| `oem` | `getInfo()` / `getId()` → `oem:get-info` / `oem:get-id` | 应用 OEM / 渠道标识。 |

### 2. 设置页分类与标签

来源：`electron/renderer/dist/static/js/364.b424858d.js` 中文标签与分类描述字符串。

| 分类 key | 界面标签 | 描述 |
| --- | --- | --- |
| `general` | 常规设置 | 配置文件存储路径、界面主题、运行模式等基本选项。 |
| `model` | 模型设置 | 配置 AI 模型相关参数（来源、Base URL、API Key、模型列表）。 |
| `prompts` | 提示词管理 | 管理和自定义 AI 提示词模板。 |
| `data` | 数据设置 | 数据库管理、备份恢复等数据相关设置。 |
| `update` | 软件更新 | 版本信息、检查更新、下载更新。 |

### 3. 配置字段结构

来源：`364.b424858d.js` 中的默认设置对象与表单绑定。

| 分类 | 字段 | 类型 / 示例 | 说明 |
| --- | --- | --- | --- |
| `general` | `runMode` | `local` / `cloud` | 服务运行模式：本地优先使用本机能力，云端调用远程 API。 |
| `general` | `themeName` | 字符串（如 `default`） | 界面主题。 |
| `ai` | `source` | `platform` / `custom` | AI 算力来源：平台提供或自有 API。 |
| `ai` | `baseURL` | URL 字符串 | 自定义模型 Base URL。 |
| `ai` | `apiKey` | 字符串 | 自定义模型 API Key。 |
| `titleModel` | `model` | 模型 ID | 标题生成模型，默认 `Qwen2.5-7B-Instruct`。 |
| `translation` | `model` | 模型 ID | 翻译/改写模型，默认 `meta-llama/Llama-3.3-70B-Instruct`。 |
| `voiceClone` | `mode` | `slow` 等 | 声音克隆模式。 |
| `voiceClone` | `highPerformance` | boolean | 声音合成高性能模式。 |
| `digitalHuman` | `modelVersion` | `V1` / `V2` | 数字人模型版本。 |
| `paths` | `baseOutput` | 目录路径 | 统一输出根目录，默认取文稿目录 + `/outputs`。 |
| `paths` | `audioOutput` | 目录路径 | 默认 `<baseOutput>/audios`。 |
| `paths` | `videoOutput` | 目录路径 | 默认 `<baseOutput>/videos`。 |
| `paths` | `draftOutput` | 目录路径 | 默认 `<baseOutput>/drafts`。 |
| `paths` | `exportOutput` | 目录路径 | 默认 `<baseOutput>/exports`。 |
| `paths` | `thumbs` | 目录路径 | 默认 `<baseOutput>/thumbs`（素材视频封面）。 |
| `data` | `databaseUrl` | 文件路径 | SQLite 数据库文件路径，默认 `<userData>/data/aigc_human.db`。 |
| `prompts` | `titlePrompt` | 文本模板 | 标题生成提示词模板。 |

模型列表 UI 使用 `modelColumns`：至少包含 `key`、`displayName`、`model` 三列；`availableModels` 每项含 `displayName`、`model`（可能还有 `id`）。

### 4. 软件更新

来源：`preload.js`、`364.b424858d.js`。

- `cloud:check-version` 返回版本信息，字段可能包括 `latestVersion`、`updateUrl`、`hasUpdate`。
- `cloud:download-update` 按 `updateUrl` 下载更新包，触发 `cloud:progress` 进度事件。
- `cloud:apply-update` 按 `zipPath` 应用更新，更新完成后提示「应用即将自动重启完成更新」。
- UI 文案包括：「检查更新」「发现新版本 v…」「当前已是最新版本」「正在下载更新包…」「更新包下载完成」「立即更新」「更新地址无效」。

### 5. 日志上传

来源：`preload.js`、`364.b424858d.js`。

- 顶部入口文案：「出现错误点击此处上报日志」。
- 调用 `file:upload-today-log` → 成功后提示「日志上报成功」。
- 主进程侧 `logger:*` 接口用于前端分级日志（debug/log/info/warn/error）。
- `file:open-today-log` 可在本地打开今日日志。

### 6. 数据设置与缓存

来源：`preload.js`、`364.b424858d.js`。

- `data.databaseUrl` 展示/修改 SQLite 数据库路径。
- `db:backup` / `database:restore` 实现备份与恢复；UI 有「数据备份与恢复」「选择备份文件」「确认恢复」等文案。
- `file:clear-cache` 清除缓存；UI 文案「清除缓存」「缓存清除成功，释放空间 …」。
- 数据重置入口：「重置所有数据」「确定要重置所有数据吗？此操作不可恢复！」→ 确认后提示「数据重置成功」。

### 7. 帮助与引导

来源：`app.5523e2f8.js`、`364.b424858d.js`。

- `showHelpGuide` 与 `FeatureGuide` 组件表明旧版使用应用内分步引导（tour/tooltip）帮助用户理解界面，而不是独立的帮助文档页。
- 左侧导航「帮助」可能触发 `showHelpGuide` 或打开外部文档链接（`openExternalLink`）。
- 发现外部文档链接：`https://ycn53qkn2vk4.feishu.cn/wiki/B6eqwQ2lWiFXFdkmWGOcXqNqnl9#share-ONQcdTBOxoktLBxSX4scJiJ0n2c`（飞书 Wiki）。
- 未发现独立的「关于我们」页面组件；版本号通过 `file:get-app-info` 或 `cloud:check-version` 在软件更新面板展示。

### 8. 本地依赖检查

来源：`preload.js`、`364.b424858d.js`。

- `python:get-status` 查询 Python 服务运行状态。
- `python:check-module-exists` 检查本地模型模块是否存在。
- 涉及的 Python 模块名称（由 `python.call-function` 的 `moduleName` 参数）：
  - `asrModule`
  - `voiceCloneModule`
  - `humanModule` / `hdModule`（数字人 V1/V2）
- UI 文案包括：「检查服务模块失败」「服务模块不存在，无法启动」「服务正在启动中…」「服务运行中」「自动启动高性能服务失败」「未找到声音合成服务模块，请确保 python_modules/voiceV2Module 存在」。
- 依赖说明提到火山引擎（Volcengine）申请指南与地址：`https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement?LLM=…`，说明旧版模型配置与火山方舟有关。

### 9. 提示词管理

来源：`364.b424858d.js`。

- 支持「标题生成提示词」「文案写作提示词」等分类（promptTabKey）。
- 提示词字段：名称、内容、描述（可选）。
- 默认 `titlePrompt`：「请为以下内容生成一个吸引人的标题，要求简洁有力，能够吸引用户点击，标题字数控制在 12 字以内，描述控制在 50 字以内：」。
- UI 操作：新增 / 编辑 / 删除 / 设置当前提示词。

### 10. 本地配置存储位置

来源：`364.b424858d.js` 默认值与 `preload.js` 路径接口。

- 输出根目录默认在 `getDocumentsPath() + '/outputs'`。
- SQLite 数据库默认在 `getUserDataPath() + '/data/aigc_human.db'`（由 `dataDir + '/data/aigc_human.db'` 推断）。
- 实际存储由 Electron 主进程通过 `config:*` IPC 持久化，具体文件格式（JSON / SQLite / plist）在 `main.jsc` 中未解出。

## 关联记录

| 记录类型 | 路径或 ID |
| --- | --- |
| 页面巡检 | PAGE-SETTINGS、PAGE-SECONDARY-ENTRYPOINTS |
| 功能卡 | FC-PROVIDER-SETTINGS |
| 运行障碍 | RB-SECONDARY-001、RB-SECONDARY-002、RB-SECONDARY-003、RB-SECONDARY-004、RB-SECONDARY-005 |

## 证据影响

| 字段 | 值 |
| --- | --- |
| 可增强的证据等级 | EV-RUNTIME-010 可从 E1 补充 E3 级配置字段证据；EV-RUNTIME-200 可从 E2 补充 E3 级辅助入口/边缘状态证据。 |
| 剩余不确定点 | 1. `main.jsc` 中 config 持久化文件格式和加密方式未确认。<br>2. 「帮助」导航项是触发 FeatureGuide 还是打开外部飞书 Wiki 未完全确认。<br>3. 软件更新的远端服务器地址、`updateUrl` 校验逻辑未解出。<br>4. 日志上传的目标服务端点与认证方式未解出。<br>5. 用户下拉菜单中的「关于」「退出登录」等入口未在静态字符串中确认。 |
| 对 Mirax AI 设计的影响 | 1. `@mirax/provider-ai` 的 `ApiKeyProviderConfig` 可扩展为 `source`/`baseURL`/`apiKey`/`model` 字段；支持 `platform`（mock/内置）与 `custom` 两种来源。<br>2. `@mirax/local-store` 可新增 `app_settings` 表存储 `general`/`paths`/`data`/`voiceClone`/`digitalHuman`/`prompts` 等配置；`provider_configs` 表补充 `source`、`baseUrl`、`apiKey`、`model`。<br>3. `@mirax/sidecar-manager` 的依赖检查应对接 `python:get-status` 和 `python:check-module-exists` 语义，检查 FFmpeg、Python 服务、asrModule、voiceCloneModule、humanModule/hdModule、Playwright 浏览器。<br>4. 软件更新先使用 Tauri 2 Updater；日志上传第一版先支持本地导出/复制，云端通道后续实现。<br>5. 提示词管理可复用 `prompts.titlePrompt` 等字段，作为 workflow rewrite / title 阶段的模板配置。 |

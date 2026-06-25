# FC-PROVIDER-SETTINGS：Provider 与本地配置设置

## 身份信息

| 字段 | 值 |
| --- | --- |
| 功能 ID | FC-PROVIDER-SETTINGS |
| 功能名称 | Provider 与本地配置设置 |
| 旧版入口 | PAGE-SETTINGS |
| Mirax AI 归属模块 | 桌面端设置 / Provider 配置 / 本地依赖检查 |
| 优先级 | P0 |
| 关联 gap-list 行 | 设置、依赖 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-RUNTIME-010、EV-STATIC-003、EV-STATIC-200 |
| 最高证据等级 | E3 |
| 可信度 | medium |
| 静态分析记录 | `docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md` |

## 用户目标

用户希望在桌面端集中管理 AI Provider 密钥与模型、本地依赖路径、输出目录、提示词模板、数据存储和应用更新，使短视频生产流程在本地即可跑通。

## 页面结构

| 区域 | 控件或字段 | 行为 |
| --- | --- | --- |
| 常规设置 | 界面主题 `themeName`、运行模式 `runMode(local/cloud)`、AI 算力来源 `ai.source(platform/custom)`、统一输出根目录 `paths.baseOutput` | 配置应用外观、本地/云端运行模式、文件输出根目录；子目录 `audios/videos/drafts/exports/thumbs` 由根目录自动派生 |
| 模型设置 | AI 来源、Base URL、API Key、模型列表 `availableModels`、标题模型 `titleModel.model`、翻译模型 `translation.model`、数字人版本 `digitalHuman.modelVersion`、声音高性能模式 `voiceClone.highPerformance` | 配置文案提取、改写、声音克隆、语音合成、数字人视频生成的 Provider；支持平台内置或用户自有 OpenAI-compatible 服务 |
| 提示词管理 | 标题生成提示词 `prompts.titlePrompt`、文案写作提示词、提示词名称/内容/描述 | 管理改写与标题生成任务使用的提示词模板；支持增删改与设为当前提示词 |
| 数据设置 | 本地数据库路径 `data.databaseUrl`、数据备份/恢复、清除缓存、重置所有数据 | 管理 SQLite 本地库、素材缓存、草稿数据；通过 `db.backup/restore` 与 `file.clearCache` 实现 |
| 软件更新 | 当前版本 `appVersion`、检查更新、下载更新、应用更新 | 通过 `cloud.checkVersion/downloadUpdate/applyUpdate` 实现；更新完成后自动重启 |
| 全局支持入口 | 「出现错误点击此处上报日志」按钮 | 调用 `file.uploadTodayLog` 上报日志；主进程 `logger.*` 负责分级日志收集 |

## 输入与输出

| 类型 | 说明 |
| --- | --- |
| 用户输入 | 输出根目录、界面主题、Provider API Key、Base URL、模型名称、本地依赖路径（FFmpeg、Python 服务、HeyGem、CosyVoice、Playwright 浏览器）、提示词模板、数据管理选项 |
| 系统输出 | 本地配置文件、SQLite `provider_configs` 记录、各 workflow 阶段可使用的 Provider 实例、sidecar 健康检查结果、生成的音频 / 视频 / 封面文件 |
| 下游依赖 | AI workflow（FC-HOME-PIPELINE）、任务中心（PAGE-TASK-CENTER）、资产管理（FC-ASSET-MANAGEMENT）、发布流程（FC-PUBLISH-PREP） |

## 执行链路

| 层级 | 证据或预期职责 |
| --- | --- |
| 前端 | 桌面端设置页按 `general/model/prompts/data/update` 标签分组展示配置项；文件路径选择调用 Tauri 原生对话框；主题切换即时生效；依赖状态通过 `python.getStatus` / `checkModuleExists` 展示 |
| Preload / IPC | `config.*` 读写配置；`file.*` 处理路径选择、缓存清理、日志上传/打开；`db.backup/restore` 备份恢复；`cloud.checkVersion/downloadUpdate/applyUpdate` 软件更新；`llm.updateConfig/testConnectionWithConfig` Provider 配置与连通测试；`python.getStatus/checkModuleExists` 依赖检查；`logger.*` 日志分级 |
| Provider | `@mirax/provider-ai` 的 `AiProvider` 接口抽象文案提取、改写、声音克隆、语音合成、数字人视频生成；`ApiKeyProviderConfig`（`id / label / provider / apiKey / baseUrl / model / enabled`）作为配置实体；旧版 `ai.source=platform/custom` 映射到内置 mock 或用户自定义 Provider |
| Sidecar | `@mirax/sidecar-manager` 负责 FFmpeg、Playwright 浏览器、Python 本地服务、HeyGem、CosyVoice 的健康检查和依赖校验；对应旧版模块 `asrModule`、`voiceCloneModule`、`humanModule`/`hdModule` |
| 本地存储 | `@mirax/local-store` 的 `provider_configs` 表持久化 Provider 配置；新增 `app_settings` 表存储 `general`/`ai`/`paths`/`voiceClone`/`digitalHuman`/`prompts`/`data` 等分类配置；`content_drafts`、`video_projects`、`workflow_tasks` 表持久化草稿、项目和任务；输出目录由用户指定并存放生成的音频、视频、封面 |
| 外部服务 | 用户自行配置的 AI 服务（OpenAI-compatible 或其他兼容接口）；旧版云端账号 / 激活校验在 Mirax AI 第一版中不强制依赖；软件更新由 Tauri 2 Updater 替代旧版 `cloud.*` 更新通道 |

## 旧版设置到 Mirax AI 的映射

| 旧版设置项 | Mirax AI 对应模块 | 说明 |
| --- | --- | --- |
| 常规设置 → 界面主题 | 桌面端 UI 主题状态 | 由 Vue / Tauri 前端主题系统管理；对应 `general.themeName` |
| 常规设置 → 运行模式 / AI 算力来源 | `@mirax/provider-ai` Provider 来源切换 | `runMode=local` 优先走本地 sidecar / mock；`runMode=cloud` 或 `ai.source=custom` 走用户配置的外部 API；`ai.source=platform` 在第一版映射为 mock |
| 常规设置 → 统一输出根目录 | `@mirax/media-pipeline` + 桌面端文件系统 | 用户选择根目录后，自动生成 `audios`、`videos`、`drafts`、`exports`、`thumbs` 子目录；与 `ProjectDraft` 和 `VideoProjectRecord` 的输出字段对齐；对应 `paths.*` |
| 模型设置 → API Key / Base URL / 模型 | `@mirax/core` 的 `ApiKeyProviderConfig` + `@mirax/local-store` 的 `provider_configs` 表 | 旧版由云端下发或内置的模型配置，Mirax AI 改为用户自行配置；支持 `openai`、`whisper`、`cosyvoice`、`heygem`、`custom` 等 Provider 类型；对应 `ai.baseURL`、`ai.apiKey`、`titleModel.model`、`translation.model` |
| 模型设置 → 服务状态 / 连通测试 | `@mirax/sidecar-manager` 的 `checkSidecarDependencies` + `@mirax/provider-ai` 的 Provider 实例 + `llm:testConnectionWithConfig` | 校验本地依赖和外部服务地址格式，真实连通测试在 Provider 实现中补充 |
| 提示词管理 → 标题/文案提示词 | `@mirax/core` 的 workflow 配置或 `@mirax/provider-ai` 的 Provider 选项 | 对应 `prompts.titlePrompt`；当前 `RewriteScriptInput` 已包含 `productName`、`sellingPoints`，提示词模板可作为扩展字段存储在本地配置或 draft 中 |
| 数据设置 → 本地数据 / 缓存 / 备份 | `@mirax/local-store` 的 SQLite 迁移和 repositories | 管理草稿、项目、任务、账号、配置；`data.databaseUrl` 指定 SQLite 路径；缓存清理对应删除或重置本地数据库和输出目录；备份恢复对应 `db.backup/restore` |
| 软件更新 → 版本 / 检查更新 | Tauri 2 Updater | 桌面端应用更新由 Tauri 框架负责，替代旧版 `cloud.checkVersion/downloadUpdate/applyUpdate` |
| 全局 → 上传日志 | Tauri 日志 + 支持通道 | 收集前端和 Rust 侧日志，用于排错和反馈；第一版可先本地导出/复制 |

## 限制与风险

| 风险 | 影响 | 处理方式 |
| --- | --- | --- |
| 旧版模型配置可能依赖云端拉取 | 未登录或云服务不可用时，模型配置为空或无法保存 | Mirax AI 改为本地 `ApiKeyProviderConfig`，由用户自行填写并持久化到 SQLite |
| 旧版激活会员可能限制高级模型或本地服务 | 未激活时部分设置项不可用 | Mirax AI 第一版不做激活码限制，仅通过本地依赖检查和 Provider 配置完整性控制功能可用性 |
| 本地依赖路径配置错误 | FFmpeg、Python 服务、HeyGem、CosyVoice 不可用，导致生成失败 | 在设置页和 workflow 运行前调用 `checkSidecarDependencies` 进行校验并提示 |
| API Key 本地存储安全 | 密钥以明文或 credential_ref 形式存于 SQLite | 第一版使用 `ApiKeyProviderConfig.apiKey` 直接存储；后续可通过系统 keychain 或 credential_ref 替换 |
| 提示词管理缺少截图证据 | 无法确认旧版提示词字段和结构 | 先按 `RewriteScriptInput` 最小字段实现，待阶段 2 静态补证后再扩展 |

## Mirax AI 实现建议

决策：重做，但保留旧版设置分组习惯。

理由：旧版设置页的信息分组（常规、模型、提示词、数据、更新）与 Mirax AI 的 Provider / sidecar / local-store 分层高度对应。新版应复刻分组结构，但把云端依赖改为用户本地可配置的 Provider，不强制登录 / 激活。

## 派工信息

| 字段 | 值 |
| --- | --- |
| 建议修改文件 | `apps/desktop/src/App.vue`、新增 `apps/desktop/src/components/SettingsPanel.vue`（或类似）、`packages/core/src/types.ts`、`packages/local-store/src/schema.ts`、`packages/provider-ai/src/openAiCompatible.ts`、`packages/sidecar-manager/src/dependencyChecks.ts` |
| 验证命令 | `pnpm typecheck`、`pnpm test`、`pnpm --filter @mirax/desktop dev:web` |
| 验收标准 | 桌面端设置页能展示常规设置表单；用户可配置输出根目录；模型设置可新增 / 编辑 / 启用 Provider 配置；本地依赖检查能根据配置项给出状态提示 |
| 任务边界 | 第一版先用 mock provider 跑通 workflow；真实 Provider 调用和连通测试后续再实现；不绕过旧版登录 / 激活 |

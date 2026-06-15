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
| 证据 ID | EV-RUNTIME-010 |
| 最高证据等级 | E1 |
| 可信度 | high |
| 冲突说明 | N/A |

## 用户目标

用户希望在桌面端集中管理 AI Provider 密钥与模型、本地依赖路径、输出目录、提示词模板、数据存储和应用更新，使短视频生产流程在本地即可跑通。

## 页面结构

| 区域 | 控件或字段 | 行为 |
| --- | --- | --- |
| 常规设置 | 界面主题、统一输出根目录、音频 / 视频 / 封面输出路径 | 配置应用外观和文件输出位置；子目录由根目录自动派生 |
| 模型设置（入口可见，内容待补证） | 预计包含 AI 模型、API Key、Base URL、服务状态 | 配置文案提取、改写、声音克隆、语音合成、数字人视频生成的 Provider |
| 提示词管理（入口可见，内容待补证） | 预计包含改写提示词、角色设定、系统提示词 | 管理文案改写和生成任务使用的提示词模板 |
| 数据设置（入口可见，内容待补证） | 预计包含本地数据目录、缓存清理、导入 / 导出 | 管理 SQLite 本地库、素材缓存和草稿数据 |
| 软件更新（入口可见，内容待补证） | 预计包含当前版本、检查更新、自动更新开关 | 管理桌面端应用更新行为 |
| 全局支持入口 | 「出现错误？点击此处上传日志」按钮 | 上传日志或跳转到支持反馈页面 |

## 输入与输出

| 类型 | 说明 |
| --- | --- |
| 用户输入 | 输出根目录、界面主题、Provider API Key、Base URL、模型名称、本地依赖路径（FFmpeg、Python 服务、HeyGem、CosyVoice、Playwright 浏览器）、提示词模板、数据管理选项 |
| 系统输出 | 本地配置文件、SQLite `provider_configs` 记录、各 workflow 阶段可使用的 Provider 实例、sidecar 健康检查结果、生成的音频 / 视频 / 封面文件 |
| 下游依赖 | AI workflow（FC-HOME-PIPELINE）、任务中心（PAGE-TASK-CENTER）、资产管理（FC-ASSET-MANAGEMENT）、发布流程（FC-PUBLISH-PREP） |

## 执行链路

| 层级 | 证据或预期职责 |
| --- | --- |
| 前端 | 桌面端设置页按标签分组展示配置项；文件路径选择调用 Tauri 原生对话框；主题切换即时生效 |
| Provider | `@mirax/provider-ai` 的 `AiProvider` 接口抽象文案提取、改写、声音克隆、语音合成、数字人视频生成；`ApiKeyProviderConfig`（`id / label / provider / apiKey / baseUrl / model / enabled`）作为配置实体 |
| Sidecar | `@mirax/sidecar-manager` 负责 FFmpeg、Playwright 浏览器、Python 本地服务、HeyGem、CosyVoice 的健康检查和依赖校验 |
| 本地存储 | `@mirax/local-store` 的 `provider_configs` 表持久化 Provider 配置；`content_drafts`、`video_projects`、`workflow_tasks` 表持久化草稿、项目和任务；输出目录由用户指定并存放生成的音频、视频、封面 |
| 外部服务 | 用户自行配置的 AI 服务（OpenAI-compatible 或其他兼容接口）；旧版云端账号 / 激活校验在 Mirax AI 第一版中不强制依赖 |

## 旧版设置到 Mirax AI 的映射

| 旧版设置项 | Mirax AI 对应模块 | 说明 |
| --- | --- | --- |
| 常规设置 → 界面主题 | 桌面端 UI 主题状态 | 由 Vue / Tauri 前端主题系统管理，不进入 Provider 配置 |
| 常规设置 → 统一输出根目录 | `@mirax/media-pipeline` + 桌面端文件系统 | 用户选择根目录后，自动生成 `audios`、`videos`、`drafts`、`exports`、`thumbs` 子目录；与 `ProjectDraft` 和 `VideoProjectRecord` 的输出字段对齐 |
| 模型设置 → API Key / Base URL / 模型 | `@mirax/core` 的 `ApiKeyProviderConfig` + `@mirax/local-store` 的 `provider_configs` 表 | 旧版由云端下发或内置的模型配置，Mirax AI 改为用户自行配置；支持 `openai`、`whisper`、`cosyvoice`、`heygem`、`custom` 等 Provider 类型 |
| 模型设置 → 服务状态 / 连通测试 | `@mirax/sidecar-manager` 的 `checkSidecarDependencies` + `@mirax/provider-ai` 的 Provider 实例 | 校验本地依赖和外部服务地址格式，真实连通测试在 Provider 实现中补充 |
| 提示词管理 → 改写提示词 / 系统提示词 | `@mirax/core` 的 workflow 配置或 `@mirax/provider-ai` 的 Provider 选项 | 当前 `RewriteScriptInput` 已包含 `productName`、`sellingPoints`，提示词模板可作为扩展字段存储在本地配置或 draft 中 |
| 数据设置 → 本地数据 / 缓存 | `@mirax/local-store` 的 SQLite 迁移和 repositories | 管理草稿、项目、任务、账号、配置；缓存清理对应删除或重置本地数据库和输出目录 |
| 软件更新 → 版本 / 检查更新 | Tauri 2 Updater | 桌面端应用更新由 Tauri 框架负责，不进入业务 Provider 配置 |
| 全局 → 上传日志 | Tauri 日志 + 支持通道 | 收集前端和 Rust 侧日志，用于排错和反馈 |

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

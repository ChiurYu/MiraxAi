# 本地数据、Provider 与 Sidecar 契约映射

## 本地数据实体

| 实体 | 来源证据 | 建议字段 | 服务模块 | 说明 |
| --- | --- | --- | --- | --- |
| `app_settings` | `EV-STATIC-003`、`EV-STATIC-200` | `general.runMode`、`general.themeName`、`paths.baseOutput`、`paths.audioOutput`、`paths.videoOutput`、`paths.draftOutput`、`paths.exportOutput`、`paths.thumbs`、`data.databaseUrl`、`voiceClone.highPerformance`、`digitalHuman.modelVersion`、`prompts.titlePrompt` | `@mirax/local-store` | 新增或扩展设置持久化实体，供设置页和 workflow 读取。 |
| `provider_configs` | `FC-PROVIDER-SETTINGS`、`EV-STATIC-003` | `id`、`label`、`provider`、`source`、`baseUrl`、`apiKey`、`model`、`enabled` | `@mirax/core` + `@mirax/local-store` | API Key 先按现有类型存储，后续可迁移 keychain。 |
| `content_drafts` | `CLAUDE.md`、`FC-HOME-PIPELINE` | draft 输入、workflow stage、publish metadata | `@mirax/local-store` | 与 `apps/desktop/src/runtime/desktopDraft.ts` 的 localStorage 草稿职责区分。 |
| `video_projects` | `CLAUDE.md`、`FC-HOME-PIPELINE` | 项目标题、素材引用、音频路径、视频路径、封面路径、状态 | `@mirax/local-store` | 管理成片产物和项目级元数据。 |
| `workflow_tasks` | `EV-STATIC-002`、`EV-STATIC-101` | `status`、`progress`、`current_step`、`input`、`output`、`error`、`created_at`、`updated_at` | `@mirax/local-store` + `@mirax/core` | 统一 workflow、素材处理和发布任务。 |
| `materials` | `EV-STATIC-101` | `file_path`、`file_name`、`category`、`description`、`status`、`error`、`result`、`created_at` | `@mirax/local-store` | 第一版搜索文件名/描述；向量化字段预留。 |
| `categories` | `EV-STATIC-101` | `id`、`name`、`sort_order`、`created_at` | `@mirax/local-store` | 素材分类。 |
| `voices` | `EV-STATIC-100` | `id`、`name`、`prompt_text`、`prompt_audio_path`、`status`、`created_at` | `@mirax/local-store` | 训练/合成状态和声音样本引用。 |
| `digital_humans` | `EV-STATIC-100` | `id`、`name`、`description`、`video_file`、`model_version`、`status`、`created_at` | `@mirax/local-store` | 数字人形象与参考视频。 |
| `publish_accounts` | `EV-STATIC-102` | `account_name`、`display_name`、`platform`、`last_login_at`、`status`、`active` | `@mirax/local-store` + `@mirax/provider-publish` | 敏感 Cookie/Token 不在阶段 3 定义明文存储。 |

## Provider 能力矩阵

| 能力 | 输入 | 输出 | 归属包 | 阶段 3 决策 |
| --- | --- | --- | --- | --- |
| 文案提取 / 对标学习 | 视频链接或本地素材引用 | 原始文案、解析结果、错误 | `@mirax/provider-ai` | mock 优先，真实解析后续。 |
| 文案改写 | 原始文案、提示词、产品信息、字数 | 改写文案 | `@mirax/provider-ai` | 通过用户配置 Provider 替代旧云端模型。 |
| 标题 / 描述生成 | 文案、平台、标题提示词 | 标题、描述、话题建议 | `@mirax/provider-ai` | 可作为 `review` 阶段辅助能力。 |
| 声音克隆 | 参考音频/视频、声音名称、prompt_text | 声音模型记录或 mock 状态 | `@mirax/provider-ai` | 参数对齐 `voiceClone`，真实能力走 sidecar。 |
| 语音合成 | 文案、声音模型、speed、seed、emotions、highPerformance | 音频文件路径 | `@mirax/provider-ai` | 保留 V2 情感字段和高性能开关。 |
| 数字人视频生成 | audio_file、video_file、watermark、digital_auth、output_dir、model_version | 数字人视频路径 | `@mirax/provider-ai` | 支持 V1/V2 概念，真实 HeyGem 后续。 |
| 平台发布 | 视频路径、标题、描述、话题、封面、账号、publishMode | 发布任务结果、平台链接或草稿状态 | `@mirax/provider-publish` | 第一版 mock，真实发布走 sidecar。 |

## Sidecar 依赖矩阵

| 依赖 | 旧版线索 | 新版用途 | 阶段 3 决策 |
| --- | --- | --- | --- |
| FFmpeg | `video:extract-audio`、`cover:extract-frame`、`video:transcode-to-2k` | 音频提取、抽帧、转码、成片合成。 | 由 `@mirax/media-pipeline` 构建命令，`@mirax/sidecar-manager` 检查可用性。 |
| Python 服务 | `python:get-status`、`python:check-module-exists` | 承载本地模型和长任务。 | 设置页和 workflow 执行前检查。 |
| CosyVoice / `voiceCloneModule` | `python.voiceClone.*` | 声音克隆和语音合成。 | 第一版 mock，真实接入后保持 Provider 接口不变。 |
| HeyGem / `humanModule` / `hdModule` | `python.digitalHuman.*` | 数字人视频生成 V1/V2。 | 第一版 mock，真实接入后走 sidecar。 |
| Playwright 浏览器 | `account:setup-login`、`account:test-login` | 平台授权、登录态测试、上传与发布。 | 第一版 mock 账号，真实授权不得绕过平台验证。 |
| Tauri Updater | 旧版 `cloud.checkVersion/downloadUpdate/applyUpdate` | 应用更新。 | 替代旧云端更新通道。 |

# 新版工程模块地图

## 模块职责总览

| 工程模块 | 职责 | 对应新版产品模块 | 不应承担 |
| --- | --- | --- | --- |
| `apps/desktop` | Vue 3 + Tauri 2 桌面 UI、用户输入、状态展示、调用 package API、草稿恢复。 | 工作台、声音、形象、素材、任务、账号、设置、发布链路。 | 不直接耦合 FFmpeg、Playwright、Python 模型服务或平台发布细节。 |
| `@mirax/core` | 领域类型、workflow 阶段、不可变状态转换、校验函数。 | workflow、任务状态、草稿、Provider 配置类型。 | 不访问文件系统、网络、SQLite 或 Tauri API。 |
| `@mirax/provider-ai` | AI Provider 抽象：文案提取、改写、声音克隆、语音合成、数字人生成。 | 工作台、声音管理、形象管理、Provider 设置。 | 不管理 UI 状态，不持久化密钥，不直接调平台发布。 |
| `@mirax/media-pipeline` | 媒体渲染抽象、FFmpeg 命令构建、音频提取、封面/成片辅助。 | 素材管理、成片、封面、媒体产物。 | 不保存业务记录，不持有账号或 Provider 密钥。 |
| `@mirax/provider-publish` | 发布 Provider 抽象、平台账号模型、mock publisher、发布输入校验。 | 发布链路、账号管理、任务中心。 | 不直接操作浏览器 UI；真实平台自动化交给 sidecar。 |
| `@mirax/local-store` | SQLite schema、migration、repository：设置、Provider 配置、草稿、项目、素材、声音、形象、任务、账号。 | 本地数据、任务中心、设置、资产库。 | 不包含业务 workflow 推进逻辑，不调用模型或平台服务。 |
| `@mirax/sidecar-manager` | 本地依赖健康检查和服务抽象：FFmpeg、Python、CosyVoice、HeyGem、Playwright。 | 设置、本地依赖、真实生成、真实平台授权。 | 不渲染 UI，不存储业务实体，不决定产品流程。 |

## 产品模块到工程模块映射

| 产品模块 | UI 所在 | Core | Provider | Media | Publish | Local Store | Sidecar |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 桌面工作台 | `apps/desktop` 工作台视图 | workflow、draft、stage status | 文案/声音/数字人 Provider | compose、cover、audio/video paths | publish input | drafts、projects、tasks | 依赖检查、真实生成服务 |
| 声音管理 | `apps/desktop` 声音视图 | voice asset type、validation | voiceClone、textToSpeech | 音频提取/输出路径 | N/A | voices、tasks | CosyVoice、Python、FFmpeg |
| 形象管理 | `apps/desktop` 形象视图 | avatar asset type、validation | generateAvatarVideo | 视频预处理/输出路径 | N/A | digitalHumans、tasks | HeyGem、Python、FFmpeg |
| 素材管理 | `apps/desktop` 素材视图 | material type、validation | 可选向量/描述 Provider | 抽帧、转码、封面 | N/A | materials、categories | FFmpeg、vector service |
| 任务中心 | `apps/desktop` 任务视图 | task status、workflow stage map | 读取任务错误来源 | 读取产物路径 | 读取发布结果 | workflow_tasks | 任务执行器健康状态 |
| 账号管理 | `apps/desktop` 账号视图 | platform enum、validation | N/A | N/A | PublishAccount、login status | publish_accounts | Playwright 授权 |
| 设置 | `apps/desktop` 设置视图 | provider/settings types | Provider config test | 输出目录检查 | platform capability | app_settings、provider_configs | dependency checks |
| 发布链路 | 工作台发布步骤 + 任务中心 | publish metadata validation | 标题/描述生成可选 | 封面/视频文件校验 | publish/direct/draft | publish tasks、accounts | Playwright 上传 |

## 禁止耦合规则

- UI 层不得直接拼 FFmpeg 命令；需要媒体处理时经由 `@mirax/media-pipeline` 或 `@mirax/sidecar-manager`。
- UI 层不得直接操作 Playwright；平台授权和发布自动化必须由 `@mirax/sidecar-manager` 或后续发布 sidecar 适配层承载。
- `@mirax/core` 保持纯逻辑，不导入 Tauri、SQLite、Node 文件系统、Provider SDK。
- `@mirax/local-store` 只负责持久化和查询，不推进 workflow 阶段，不调用模型。
- Provider 配置中的 API Key 第一版可按现有类型存储，但 UI 持久化前必须沿用 `sanitizeDesktopDraftForStorage` 类似规则避免草稿泄露密钥。
- 旧版 `main.jsc` 只能作为接口和字段线索，不允许复用旧版生产代码。

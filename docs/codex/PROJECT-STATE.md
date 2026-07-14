# Mirax AI 项目状态

> **活动进度唯一入口：** 本文件由 Codex 维护。`docs/superpowers/` 仅保留历史计划与设计；Codex Memories 只用于辅助召回，冲突时以本文件和当前仓库状态为准。

## 当前口径

Mirax AI 目前处在 **first usable release / 真实能力逐步接入** 阶段。

当前产品判断口径：

- UI 主体已经完成。
- 今天已接入真实 AI 文本生成 / 文案改写能力。
- 本地 faster-whisper 转写已完成本机 dogfood 验证。
- 其它创作、媒体、发布能力先按 **mock / 未完整真实接入** 管理。
- 工程交付可进入 dogfood / pre-release 准备；这不等于产品内真实发布能力已接入。
- 产品能力后续仍按创作链路从前往后接真实能力，不直接跳到平台发布。

## 已完成

- [x] **Codex 工作流接管**
  - 活动状态源已迁移到 `docs/codex/PROJECT-STATE.md`，未来计划写入 `docs/codex/plans/`。
  - `docs/superpowers/plans/` 与 `docs/superpowers/specs/` 作为历史证据保留。
  - Superpowers plugin 已卸载，活动入口不再依赖 Superpowers skills 或已缺失的旧自动调度 skill。
  - Codex Memories 只作为辅助召回；项目状态与当前仓库事实优先。

- [x] **新版 UI 主体**
  - Workbench 8 个阶段页面已完成。
  - 声音库、形象库、素材库、任务中心、账号管理、设置页已完成基础 UI。
  - 资产库导入 / 新建入口当前为诚实「暂未接入」，不伪造资源。

- [x] **基础状态与本地存储**
  - Provider 设置、AppSettings、Workbench draft、发布任务、发布历史已支持 SQLite 优先与 localStorage fallback。
  - API Key / token 类敏感信息不进入普通 snapshot / 日志 / task payload。

- [x] **真实 AI 文本生成 / 文案改写**
  - 已支持显式选择「文案改写」Provider。
  - 多 Provider 不再 fallback 到第一条。
  - 改写目标、提示词模板、目标字数已传入真实 rewrite 调用。
  - 改写参数已持久化到 Workbench draft。
  - 重新生成时显示真实 provider / model 调用状态。
  - 改写请求运行中、完成、失败都有界面反馈，不再让用户误以为按钮无响应。
  - Provider 配置就绪后可直接用于改写，测试连接只作为主动检查，不再成为每次使用前的硬门槛。
  - active 但不可用的 provider 会显示未就绪，不再显示绿色“使用中”。
  - 改写生成后停留在第 2 步，用户可检查/编辑结果并点击「采用此文案」进入下一阶段；结果实时写入 `project.notes` 供下游使用。
  - 底部通用「下一步」按钮已接入阶段感知路由：在文案改写阶段且已生成非空文案时，点击「下一步」会先触发「采用此文案」反馈，再进入下一阶段，防止绕过采用确认。

- [x] **视频 / 素材分析最小链路**
  - 本地视频 → FFmpeg 抽取 16kHz mono WAV（Task 1A）已完成。
  - OpenAI `/audio/transcriptions` 文件上传真实转写（Task 1B）已完成。
  - transcript 进入 rewrite/script 链路已打通。
  - 计划文档：`docs/superpowers/plans/2026-07-03-video-material-analysis-task1.md`。

- [x] **真实语音转写链路**
  - `WhisperProvider` 读取 Task 1A 生成的 `audioPath`，multipart POST 到 OpenAI `/audio/transcriptions`。
  - 解析 `verbose_json` 返回真实 text / segments。
  - apiKey 仅进入 Authorization header，不进入日志、错误、snapshot、测试 fixture。
  - 真实失败不 fallback 到 mock，不伪造 transcript。
  - Task 1B review fix 完成：模型限制为 whisper-1、language 归一化为 ISO-639-1、音频大小限制 25MB。
  - 本地 `local-whisper` Provider 已接入 faster-whisper，默认 venv 为 `~/.local/share/mirax-ai/asr-venv`（Rust 侧展开 `~` 到 `HOME`），默认 `tiny` / `cpu` / `int8`。
  - `local-whisper` 的 Python 解释器路径已支持在 Provider 配置中覆盖，并持久化到 SQLite；连接测试与真实转写使用同一路径。
  - 本地视频 → FFmpeg 抽音频 → faster-whisper 转写 → transcript → 文案改写链路已通过本机 dogfood。
  - 本地 ASR 中文输出已做简体归一化，避免工作台显示繁体转写结果。
  - 已完成 `tiny` / `base` 质量验收（60 秒 demo 素材，CPU / int8）：`tiny` 约 3.5 秒但繁体残留与错漏词多；`base` 约 5× 实时、质量明显更好；默认保持 `tiny`，`base` 作为手动质量选项。

- [x] **ElevenLabs 普通 TTS 接入（Workbench 第 4 阶段）**
  - `ElevenLabsTtsProvider` 已加入 `@mirax/provider-ai`，调用官方 `POST /v1/text-to-speech/{voiceId}`。
  - API Key 复用现有 SQLite `provider_secrets` 持久化；Voice ID 与 model 持久化到 `provider_configs`。
  - 设置页新增「ElevenLabs TTS」provider 类型，支持 API Key / Voice ID / Model 配置。
  - 保存 Provider 时通过 `persistNow()` 显式等待 SQLite 写入完成，避免立即重启导致 Key 未落库。
  - 编辑已保存 Provider 时显示「API Key 已保存在本机，不会回显；留空将保留当前 Key」提示。
  - 产物固定输出 `speech.mp3`；CosyVoice 与 mock 保持各自原有产物行为。
  - 二进制写入走新增 Rust command `write_binary_file`，时长探测走 `probe_audio_duration`（ffprobe）。
  - Rust 侧对写入/探测路径做归一化与目录穿越校验，限制在 `audioOutput` 根目录内；新增 `check_audio_file` 用于启动时恢复校验。
  - 真实语音合成成功后，将相对路径 / 时长 / 格式写入 Workbench draft；重启后若 `speech.mp3` 仍存在则恢复第 4 步已完成状态、真实时长与播放器，不再调用 ElevenLabs。
  - 本地 SQLite 启动迁移已改为幂等：先建表、以 `PRAGMA table_info` 判断并仅补齐缺失列；仅为空的 `elevenlabs-tts` 配置回填默认 Voice ID，迁移不读写 `provider_secrets` 或 API Key。
  - desktop Vite 开发环境已将 `@mirax/local-store` 显式 alias 到 workspace 源码，避免加载旧 `dist` 而跳过上述迁移；已增加该 alias 的回归测试。
  - 桌面端人工验收已通过：Provider 配置可在完整重启后恢复；已有 `speech.mp3` 可恢复、播放，且不重新调用 ElevenLabs。
  - 错误统一返回 `synthesis-failed`，不伪造成功；错误信息不得泄露 API Key、响应体或完整本地路径。
  - 配置完整并启用后可直接在第 4 阶段生成语音，不强制预先连接测试；FFmpeg 路径验证仅用于生成后的 ffprobe 时长探测，不作为 provider 就绪门槛。
  - **明确：本次接入仅为普通 TTS，不代表声音克隆、ElevenLabs 商用许可、数字人、视频合成或发布已完成。**

- [x] **ElevenLabs Instant Voice Clone — Task 1：身份、SQLite 模型与原子绑定基础**
  - `ProjectDraft` 已具备稳定 UUID；旧 desktop draft 恢复时保留已存项目 ID。
  - 已建立声音样本根、托管样本和项目克隆绑定三张 SQLite 表；每项目一条 active 绑定由 partial unique index 约束。
  - 迁移先建表、以 `PRAGMA table_info` 补列、再建索引；迁移不读写 `provider_secrets` 或 API Key。
  - `replaceActiveProjectVoiceClone` 使用触发器支持的单条 `UPDATE ... RETURNING` 完成旧 active 替换、新声音激活与结果确认，避免 Tauri SQLite 连接池把手写事务拆到不同连接。
  - 已补真实内存 SQLite 回归：实际执行迁移后验证旧 active 记录变为 `replaced`、新 `remote-created` 记录变为 `active`；聚焦测试 62/62、全仓 typecheck 与 diff 空白检查均通过。
  - **明确：这仅完成声音克隆的持久化基础，不代表样本导入、远端 IVC、speech resolver 或 Workbench UI 已完成。**

- [x] **ElevenLabs Instant Voice Clone — Task 2：项目身份与 SQLite-only 样本目录设置**
  - 新建与旧草稿恢复均保持稳定 `project.id`，并同步 `workflow.projectId`；缺失旧 ID 会立即写回 SQLite。
  - 原始 `project.voiceSamplePath` 不进入 desktop localStorage 或 SQLite draft payload。
  - 声音样本目录记录和 active root ID 仅写入 SQLite；SQLite 不可用时返回 `local-store-unavailable`，不回退 localStorage、临时目录或 session 状态。
  - SQLite 初始快照可恢复 active root 到内存；浏览器 snapshot 创建、恢复及手工注入均排除该字段。
  - 无关设置保存会保留既有 active root；用户显式清除后不会写回旧值；directory picker 只接受 Tauri 目录选择结果。
  - 聚焦测试 136/136、全仓 typecheck 与 diff 空白检查均通过。
  - **明确：这仍不包含托管样本文件复制/删除、远端 IVC、speech resolver 或 Workbench voice-clone UI。**

- [x] **ElevenLabs Instant Voice Clone — Task 3：受限原生托管样本文件操作**
  - 新增原生 `import_voice_sample`、`read_managed_voice_sample`、`delete_managed_voice_sample` 命令，以及对应 TypeScript 包装。
  - 导入仅接受常规 `.wav` / `.mp3` / `.m4a` / `.flac` / `.aac` 文件，拒绝目录、符号链接、路径穿越和超过 25 MiB 的样本；复制写入根目录内的唯一临时文件并在成功后原子改名。
  - 托管读取与删除只允许所选根目录内的普通文件；读取不会沿最终文件符号链接，普通 TTS 的读写命令行为未改变。
  - 样本失败信息不回显来源绝对路径或凭证；聚焦 Rust 测试 18/18、TypeScript 测试 3/3、`cargo check`、全仓 typecheck 与 diff 空白检查均通过。
  - **明确：这只完成本地受限样本文件操作，不代表远端 IVC、项目克隆生命周期、speech resolver 或 Workbench voice-clone UI 已完成。**

- [x] **ElevenLabs Instant Voice Clone — Task 4：IVC 传输与调用级 Voice ID**
  - ElevenLabs IVC 使用 `files[]` multipart 上传受限托管样本；请求只带 `xi-api-key`，不手工设置 multipart `Content-Type`。
  - IVC 对 401/403、其它 HTTP 失败、网络错误和缺失 `voice_id` 均返回结构化安全错误，不回显 API Key、样本路径或响应体；支持显式远端声音删除用于补偿。
  - 克隆 Provider 只接受用户显式选择、启用且凭证/模型完整的 ElevenLabs 配置，不再选择 CosyVoice 或第一个 Provider。
  - TTS 调用使用调用级 `voiceId`；默认 Voice ID 是否可用交由项目解析器决定。

- [x] **ElevenLabs Instant Voice Clone — Task 5：项目克隆生命周期与语音解析器**
  - 新增 SQLite/root 前置检查、授权确认、托管复制、请求开始、远端检查点、验证等待、原子激活与失败补偿的显式生命周期。
  - 远端 ID 必须先持久化为 `remote-created` 再激活；检查点失败时最佳努力删除远端声音且绝不激活；激活失败时保留可恢复状态并记录清理结果。
  - 原子替换会验证恰好激活请求的 clone，否则回滚旧 active 绑定。
  - 解析器只对“无项目 clone”使用显式默认 Voice ID；已绑定 clone 的 Provider 禁用、删除或失去凭证时返回 `project-voice-unavailable`，不回退其它 Provider。
  - 聚焦测试 72/72、全仓 typecheck 与 diff 空白检查均通过。
  - **明确：Task 6 已完成 App / Workbench 接线并进入人工验证；在 Task 7 完成全量回归和真实 BYOK dogfood 前，不宣称真实 IVC 已验收。**

- [x] **百炼 Qwen-TTS + CosyVoice（手工 OSS URL）代码接入**
  - 新增 `bailian-qwen-tts` 与 `bailian-cosyvoice` 两类真实 Provider 配置；API Key 继续仅走 SQLite `provider_secrets`，业务空间 Base URL 在持久化及运行前清理敏感 URL 组成部分。
  - Qwen-TTS 使用本地受管样本生成 data URI 创建音色；CosyVoice 要求用户先将所选样本的同一份副本手工上传至 OSS，再在当前声音克隆会话中填写短期 HTTPS URL。
  - CosyVoice 的 OSS URL 仅存在于单次组件状态与请求体：不会进入 SQLite、draft、localStorage、错误文案或日志；切换 Provider、选择新样本、成功或失败后均清空。
  - 项目 active clone 记录保存实际百炼 provider 类型与远端 voice ID；speech resolver 使用该 clone 的同一 providerConfigId，不回退到 ElevenLabs、mock 或其它默认声音。
  - 百炼非实时合成返回的临时音频 URL 会立即下载并写入既有受限本地 audioOutput，项目草稿只保存本地产物路径。
  - 已验证：相关测试 184/184、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web`、`git diff --check`；尚未使用用户的真实百炼 Key / Workspace / OSS URL 发起远端 dogfood，不能宣称远端调用已验收。

- [x] **百炼桌面端原生 JSON 网络桥接（代码验证）**
  - 已确认百炼北京业务空间接口拒绝 WebView 的跨域预检；声音克隆和语音合成的 JSON POST 现通过 Tauri Rust `reqwest` 发出，不再依赖浏览器 `fetch`。
  - 原生命令仅接受 `https://*.cn-beijing.maas.aliyuncs.com/api/v1/services/...`，不记录 API Key、样本 data URI 或完整远端响应体；非 2xx 只提取并脱敏 `code`、`message`、`request_id` 供当前会话诊断使用。
  - 声音克隆页面保留最近 10 条可清除的本次会话诊断；不写入 SQLite、browser storage 或项目草稿。服务端字段若含 URL、路径、data URI、Bearer、签名等敏感标记会被隐藏。
  - 已按百炼接口限制修复自动命名：Qwen `preferred_name` 只使用字母、数字、下划线且最多 16 字符；CosyVoice `prefix` 只使用字母数字且最多 10 字符。
  - 克隆成功后停留在当前阶段显示“已就绪”和 Voice ID；失败状态即使没有标准 Error 也会显示可读的兜底提示和诊断，不会误显示为“待克隆”。
  - 非 Error 形式的底层失败会安全提取字符串或对象 `message`；含路径、URL、data URI、签名或凭据的诊断仍会隐藏，不会进入页面或会话日志。
  - 已定位 SQLite code 5 根因：Tauri SQL 使用连接池，旧版 `BEGIN IMMEDIATE` 与后续更新是多次插件调用，可能落在不同连接；持锁连接与执行更新的连接因此互相冲突。现已移除无效的 `busy_timeout` 延迟方案。
  - 项目声音激活改为 SQLite trigger + 单条 `UPDATE ... RETURNING`，旧 active 替换、新声音激活和结果确认在同一连接、同一语句内原子完成；双真实连接交替执行回归已覆盖该场景。
  - 本地激活失败后重试会优先恢复同项目、同 Provider 配置下最新的 `remote-created` 结果，不再次创建付费远端声音；等待清理的远端记录不会被恢复。
  - 已确认当前真实 Qwen 记录在 SQLite 中为唯一 `active` 绑定；完成页现明确显示“声音克隆已完成”和远端已绑定状态，禁止重复克隆，删除操作默认折叠且不会向 Qwen 展示 ElevenLabs 专用远端删除入口。应用重启后会从 SQLite 恢复 Voice ID、Provider 与安全文件名，但不会恢复原始样本绝对路径。
  - 已确认 Qwen-TTS 成功响应可能在 `output.audio.data` 为空时返回 `http://dashscope-result-*.oss-*.aliyuncs.com/...` 签名结果 URL；此前前端只接受 HTTPS，因而把真实成功结果误报为“未返回有效音频地址”。
  - 合成结果现仅允许百炼专用 DashScope 结果 OSS 主机名的 HTTP/HTTPS URL，并通过独立 Tauri Rust 命令下载；原生下载禁用重定向、限制 50 MiB，随后继续写入既有受限本地 audioOutput，不开放通用 URL 下载能力。
  - 本轮已验证：聚焦前端测试 69/69、Rust 测试 23/23、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web`。
  - 2026-07-14 用户已完成真实 Qwen 合成、受限本地落盘与页面播放 dogfood，并确认听到克隆声音；百炼 Qwen 克隆与合成主链路已通过人工验收。
  - 语音结果页已补齐真实桌面动作：重复合成停留在当前阶段；“下载音频”使用原生另存为对话框；“在文件夹中显示”通过系统文件管理器定位受限 audioOutput 内的产物；恢复默认设置和文件操作均显示结果反馈。
  - 结果页动作本轮已完成代码验证（聚焦前端测试 60/60、Rust 测试 23/23），仍需重启桌面应用后逐项完成人工交互验收。

- [x] **mock / 未接入能力的诚实标识**
  - Review 阶段显示「Mock 复核」。
  - Publish 阶段显示「Mock 发布」。
  - 任务中心显示「本地模拟任务」。
  - 账号管理显示「Mock 账号」。

- [x] **Workbench stage mode 诚实状态**
  - 配置了 provider 但未验证时，相关阶段显示 `not-connected`，不再静默回落到 mock。
  - 已覆盖 transcribe / speech / voice-clone / avatar 的误导状态修复。

## 当前仍是 mock / 未完整真实接入

- [ ] **声音克隆真实 BYOK dogfood**
  - ElevenLabs、百炼 Qwen-TTS 与百炼 CosyVoice 的代码路径已接通；仍需用用户授权声音、真实百炼 API Key / 业务空间和 CosyVoice OSS 临时 URL 完成人工验收。
  - OSS 自动上传、STS/AccessKey、对象管理/删除，以及 MiniMax 均未实现，仍需独立规划。

- [ ] **数字人生成**
  - 目前产品可用口径仍按 mock / 未完整真实接入处理。

- [ ] **视频合成**
  - 当前不作为已完成真实产品能力管理；后续需要在前置素材、音频、数字人真实产物稳定后再验收。

- [ ] **Review / Publish / 任务中心 / 账号管理**
  - 已加 mock 标识。
  - 真实发布 API、OAuth / 凭证托管、平台任务状态回传尚未接入。
  - 发布属于后段能力，不作为当前下一步。

## 下一步

当前最新任务：**百炼 Qwen-TTS 克隆、合成、落盘和播放已通过真实 dogfood；语音结果页按钮已接入实际动作，等待重启应用后逐项手测。**

- ElevenLabs TTS Provider 已实现并接入设置页与 App.vue 执行流程 ✅
- API Key 走现有 SQLite `provider_secrets`，Voice ID / model 持久化到 `provider_configs` ✅
- Rust `write_binary_file` / `probe_audio_duration` 命令已添加，含路径校验 ✅
- 产物 MP3、CosyVoice/mock 保持原有产物行为 ✅
- 不强制连接测试，配置完整启用后即可在第 4 阶段生成语音 ✅
- README 与 PROJECT-STATE 已同步 ✅

计划文档：`docs/superpowers/plans/2026-07-10-real-tts-provider.md`

优先顺序：

1. [x] 盘点当前素材导入入口与 Workbench material parsing / transcribe 阶段实际输入（已完成）。
2. [x] 设计最小真实链路：本地视频/音频文件 -> 可转写音频 -> transcript -> rewrite/script（已完成）。
3. [x] 实现 Task 1A：本地视频 → FFmpeg 音频抽取产物（已完成）。
4. [x] 实现 Task 1B：真实转写端点（OpenAI Whisper 文件上传）（已完成）。
5. [x] 接入并验证本地 faster-whisper Provider（已完成）。
6. [x] 同步本文件，把完成项移动到「已完成」（已完成）。
7. [x] 文案改写结果采用闭环（已完成）。
8. [x] 文案改写提示词增强（已移除 `buildUserPrompt` 公共导出，保持模块内部函数）。
9. [x] ElevenLabs 普通 TTS 接入 Workbench 第 4 阶段（已完成）。

当前进行中：**语音合成结果页动作人工验收。**百炼 Qwen-TTS 的真实声音克隆、合成、受限本地落盘与播放已由用户确认成功。结果页的重新合成、原生另存为、系统文件夹定位及操作反馈已完成代码验证；下一步是重启桌面应用逐项手测这些动作，通过后再验收 CosyVoice 手工 OSS URL。OSS 自动上传/对象管理和 MiniMax 仍为后续独立任务。当前修复计划为 `docs/codex/plans/2026-07-14-bailian-native-http-bridge.md`。

下一步候选：

- **声音克隆 BYOK 验收**：先验证百炼 Qwen-TTS，再验证百炼 CosyVoice 手工 OSS URL；仅允许本人或已获授权声音，且开始克隆前必须显式勾选确认。应用将样本复制到用户选择的样本目录、记录存入 SQLite，并保留至用户手动删除，原文件不动。克隆 Voice ID 仅归属项目和样本记录，不覆盖 Provider 默认 Voice ID；用户自行配置 API Key，应用不提供或运营云端 Key。
- **OSS 自动上传**：待手工 URL 验收后，再单独设计 STS 临时凭证、私有对象上传、短效签名 URL 与删除语义；不得将长期 OSS 凭证写入 browser snapshot。
- **数字人生成**：在 TTS 产物稳定后，规划真实数字人 provider 接入。

暂不做：

- 真实发布平台接入。
- 多平台 OAuth。
- 发布状态回传。
- 画面理解 / OCR / 高级视频分析的一次性大规划。

## 后续路线

建议按这个顺序推进：

1. 视频 / 素材分析
2. 真实语音转写链路
3. 真实脚本生成 / 改写增强
4. 真实 TTS / 声音克隆
5. 真实数字人生成
6. 真实视频合成验收
7. Review / Publish 真实能力规划
8. 真实平台发布

## 恢复入口

新任务先读：

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/codex/PROJECT-STATE.md`
4. 本文件「当前进行中」或「下一步」明确指向的计划

补充规则：

- 后续新计划写入 `docs/codex/plans/`。
- `docs/superpowers/plans/` 与 `docs/superpowers/specs/` 只作为历史证据和仍在收尾的旧计划引用。
- Codex 可按需使用本地 Memories 恢复旧决策，但必须用当前仓库和本文件验证可能过期的信息。

相关参考：

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `docs/product-architecture/README.md`
- `docs/product-architecture/publish-automation-security-design.md`

## 工作区注意事项

- 不要重复安排 SQLite、rewrite provider selection、mock 标识收敛。
- 不要把 mock 当成真实能力。
- 不要跳过视频 / 素材分析直接做发布。
- 不要提交未跟踪截图或临时 plans/specs，除非用户明确要求。

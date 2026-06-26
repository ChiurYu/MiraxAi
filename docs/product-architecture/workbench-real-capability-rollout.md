# Workbench 真实能力接入顺序

> 本文档是阶段 5 P0 Task 5 的设计产物，用于对齐 Workbench 8 个阶段从 mock 切换到真实能力的顺序、依赖、失败状态与回退策略。**本文档不接真实服务、不实现真实调用源码。**

## 当前状态

- 所有阶段默认仍使用 `mock provider` / `mock renderer` / `mock publisher`。
- 真实 provider / sidecar 仅作为可配置开关存在；`useWorkflowRuntime` 通过 `getStageMode(stageId)` 提供 `mock` / `real` / `not-connected` 运行时边界。具体 UI 如何展示当前能力模式（例如徽标、提示条）属于后续 UI polish，不在本 Task 范围内。
- 产物路径已按 `outputRoot/<projectId>/<stage>/<fileName>` 设计，错误状态已统一为 `MediaRendererError` 等结构化错误。

## 推荐真实化顺序

排序原则：

1. **先文本、后媒体**：纯文本阶段（rewrite）风险最低、回滚最容易。
2. **先独立生成、后视频渲染**：语音/数字人逐步引入本地 sidecar 与真实 provider。
3. **transcribe 后置**：它依赖 FFmpeg + Whisper，放在 speech/voice-clone 之后，避免第一版就要处理本地视频。
4. **review 不切换真实能力**：仅做状态校验与人工确认。
5. **publish 见 Task 6**：不在本 Task 实现真实平台发布。

| 顺序 | 阶段 | 说明 |
|---|---|---|
| 1 | `rewrite` | 纯文本改写，OpenAI-compatible LLM，风险最低 |
| 2 | `speech` | 文本 → 音频，可先用内置 voiceId，依赖 CosyVoice 等 |
| 3 | `voice-clone` | 样本 → voiceId，真实化前可先验证样本文件 |
| 4 | `transcribe` | 视频 → 文案，依赖 FFmpeg/Whisper |
| 5 | `avatar` | 音频 + 形象 → 数字人视频，依赖 HeyGem 等 |
| 6 | `compose` | 数字人视频 + 音频 + 字幕/BGM → 成片，依赖 FFmpeg |
| 7 | `review` | 人工复核，无真实能力切换，仅状态校验 |
| 8 | `publish` | 多平台发布交接，见 `docs/superpowers/plans/2026-06-25-real-capability-foundation.md` Task 6 |

## 阶段依赖与产物

| 阶段 | 输入依赖（阶段） | 输入产物 / 源素材 | 输出产物 | 失败时影响范围 |
|---|---|---|---|---|
| `transcribe` | 无 | `sourceVideoPath` | `transcriptText`（session） | 阻断 `rewrite` |
| `rewrite` | `transcribe` | 无（使用 `transcriptText`） | `notes` | 阻断 `speech` |
| `voice-clone` | 无 | `voiceSamplePath` | `voiceId`、`voiceName`（session） | `speech` 需回退到内置 voiceId 或失败 |
| `speech` | `rewrite`、`voice-clone` | `notes` | `audioPath` | 阻断 `avatar`、`compose` |
| `avatar` | `speech` | `audioPath` | `avatarVideoPath` | 阻断 `compose` |
| `compose` | `avatar`、`speech` | `avatarVideoPath`、`audioPath` | `finalVideoPath`、`coverPath`、`subtitlePath` | 阻断 `review`、`publish` |
| `review` | `compose` | `finalVideoPath`、`coverPath` | 无（确认状态） | 阻断 `publish` |
| `publish` | `compose` | `finalVideoPath` | `publishTaskIds`（session） | 任务失败，可重试/重新授权 |

> 注：session 级产物（`transcriptText`、`voiceId`、`voiceName`、`publishTaskIds`）尚未进入 `ProjectDraft` 持久化；是否需要持久化由对应真实化 Task 单独决定。

## 阶段真实接入前置条件

在把某个阶段从 `mock` 切换到 `real` 之前，必须同时满足：

1. **Provider 配置已启用且连接测试通过**：对应 `ApiKeyProviderConfig.enabled === true`，`connectionTest` 返回 `ok`。
2. **所需 sidecar 依赖已就绪**：
   - `transcribe`：`ffmpeg` 可执行、`whisper` 服务可访问。
   - `voice-clone` / `speech`：`cosyvoice` 服务可访问（或对应 provider）。
   - `avatar`：`heygem` 或同类服务可访问。
   - `compose`：`ffmpeg` 可执行。
3. **前置阶段产物状态为 `ready`**：通过 `getStagePrerequisites(stageId)` 检查 `artifactInputs` 非空。
4. **当前阶段输入参数通过校验**：调用 `validateProjectDraft` 或阶段专用校验函数。
5. **用户已明确同意切换**：不自动升级；默认保持 `mock`。

## 阶段能力、Mock 状态与失败状态

### `transcribe` — 对标视频文案提取

- **Provider / sidecar 能力**：FFmpeg 提取音轨 + Whisper/LLM 转写。
- **Mock 状态**：模拟延迟 1.2s，返回固定分段文案；不读取真实视频。
- **真实接入前置**：FFmpeg 已安装、Whisper 服务可访问、`sourceVideoPath` 存在且可读取。
- **失败状态**：
  - `missing-prerequisite`：`sourceVideoPath` 为空。
  - `ffmpeg-unavailable`：FFmpeg 未就绪。
  - `transcribe-failed`：转写服务返回错误。
- **跳过 / 重试**：不可跳过；允许重试；失败时保持原视频输入可见。

### `rewrite` — 爆款文案仿写

- **Provider 能力**：OpenAI-compatible LLM。
- **Mock 状态**：返回固定改写文案与标题建议。
- **真实接入前置**：LLM provider 配置启用、连接测试通过、`transcriptText` 非空。
- **失败状态**：
  - `missing-prerequisite`：原始文案为空。
  - `provider-error`：LLM 调用失败或返回空。
- **跳过 / 重试**：不可跳过；允许重试；用户可手动编辑文案。

### `voice-clone` — 声音克隆

- **Provider / sidecar 能力**：CosyVoice / 本地声音克隆服务；样本 → voiceId。
- **Mock 状态**：返回 `voiceId` 与样本文件名。
- **真实接入前置**：声音克隆服务可访问、`voiceSamplePath` 存在且格式有效。
- **失败状态**：
  - `missing-prerequisite`：未选择样本文件。
  - `clone-failed`：服务无法从样本生成 voiceId。
- **跳过 / 重试**：不可跳过；允许重试；`speech` 可回退到内置 voiceId（需用户确认，不自动）。

### `speech` — 语音合成

- **Provider / sidecar 能力**：CosyVoice / TTS 服务；`voiceId` + `script` → `audioPath`。
- **Mock 状态**：返回模拟 `audioPath` 与估算时长。
- **真实接入前置**：TTS 服务可访问、`notes` 非空、voiceId 可用（或用户明确使用内置 voiceId）。
- **失败状态**：
  - `missing-prerequisite`：文案为空。
  - `voice-unavailable`：voiceId 无效。
  - `synthesis-failed`：合成服务失败。
- **跳过 / 重试**：不可跳过；允许重试。

### `avatar` — 数字人口播

- **Provider / sidecar 能力**：HeyGem / 数字人服务；`audioPath` + `avatarId` → `avatarVideoPath`。
- **Mock 状态**：返回模拟 `avatarVideoPath`。
- **真实接入前置**：数字人服务可访问、`audioPath` 非空、已选择形象。
- **失败状态**：
  - `missing-prerequisite`：缺少音频。
  - `avatar-failed`：数字人生成失败。
- **跳过 / 重试**：不可跳过；允许重试。

### `compose` — 视频合成

- **Provider / sidecar 能力**：FFmpeg；`avatarVideoPath` + `audioPath` + 字幕/BGM → `finalVideoPath` / `coverPath` / `subtitlePath`。
- **Mock 状态**：`mockRenderer` 返回按真实目录组织的路径，但不调用 FFmpeg。
- **真实接入前置**：FFmpeg 可执行、前置视频/音频路径非空。
- **失败状态**：
  - `missing-prerequisite`：缺少数字人视频或音频（`MediaRendererError`）。
  - `render-failed`：FFmpeg 命令执行失败。
- **跳过 / 重试**：不可跳过；允许重试。

### `review` — 人工复核

- **Provider / sidecar 能力**：无真实能力切换，仅做状态校验。
- **Mock 状态**：校验发布元数据与视频路径。
- **真实接入前置**：`finalVideoPath` 存在、`canPublish` 为 true。
- **失败状态**：
  - `missing-prerequisite`：视频未生成。
  - `publish-readiness-failed`：标题/描述/封面/平台/账号未就绪。
- **跳过 / 重试**：**可跳过**（`required: false`）；失败后可返回编辑。

### `publish` — 多平台发布

- **Provider / sidecar 能力**：平台 Publisher + Playwright 浏览器 / 官方 API。
- **Mock 状态**：`mockPublisher` 创建任务，不实际调用平台。
- **真实接入前置**：`finalVideoPath` 存在、账号已授权、平台能力匹配。
- **失败状态**：
  - `missing-prerequisite`：视频未生成。
  - `unauthorized`：账号凭证过期。
  - `platform-limit`：视频格式/时长/大小不符。
  - `network` / `rate-limited`：可重试。
- **跳过 / 重试**：不可跳过；支持重试（Task 6 设计字段 `retryCount`）。

## 运行时模式设计

- 类型：`WorkflowStageRuntimeMode = "mock" | "real" | "not-connected"`（定义于 `@mirax/core`）。
- 默认值：`createDefaultStageModes()` 返回所有阶段为 `"mock"`。
- `useWorkflowRuntime` 接受可选 `stageModes` 配置，并提供 `getStageMode(stageId)`。
- UI 层当前**不展示**能力模式徽标；未来 UI polish 可考虑增加「Mock 结果 / 真实结果 / 真实能力未接入」等提示，但**不属于本 Task**。
- **不回退伪造**：阶段设为 `real` 但真实能力未接入时，executor 必须返回诚实错误，不得自动 fallback 到 mock 伪造成功。

## 阶段切换检查清单（未来每个真实化 Task 使用）

1. 在 `useWorkflowRuntime` 中把目标阶段 `stageModes` 设为 `real`。
2. 在 `executeStage` / executor 中按 `stageId` 与 `getStageMode(stageId)` 路由到真实 provider / renderer。
3. 调用前检查 `getStagePrerequisites(stageId)`：
   - 前置阶段状态为 `completed` 或 `skipped`；
   - `artifactInputs` 字段非空；
   - sidecar 依赖状态为 `ready`。
4. 真实调用失败时抛出结构化错误，`useWorkflowRuntime.processStage` 标记阶段 `failed` 并写入日志。
5. 阶段组件不展示能力模式徽标；未来 UI polish 再决定是否增加提示。
6. 只允许一次切换一个阶段；该阶段真实化 Task 验收通过后再规划下一阶段。

## 回退 / 降级规则

- 阶段从 `real` 切回 `mock` 是允许的，回退后重新执行该阶段会使用 mock 路径。
- 某阶段失败后，下游所有阶段状态通过 `markStageDirty` 重置为 `pending`，防止使用过时的 mock/真实产物。
- 不允许通过 mock 结果绕过真实阶段的失败：如果某阶段配置为 `real` 但执行失败，不能自动用 mock 结果替换。

## 相关文件

- `packages/core/src/types.ts`：`WorkflowStageRuntimeMode`。
- `packages/core/src/workflow.ts`：`STAGE_PREREQUISITES`、`getStagePrerequisites`、`getRecommendedRealizationOrder`、`createDefaultStageModes`。
- `packages/core/tests/workflow.test.ts`：依赖与顺序测试。
- `apps/desktop/src/composables/useWorkflowRuntime.ts`：`stageModes` / `getStageMode`。
- `apps/desktop/src/composables/useWorkflowRuntime.test.ts`：模式默认/自定义测试。

## 明确不做

- 不实现任何真实网络/本地服务调用。
- 不修改 mock provider 默认行为。
- 不一次性替换多个阶段。
- 不伪造「真实能力已接入」的 UI 状态。
- 不将 session 级产物（`transcriptText`、`voiceId`、`publishTaskIds`）写入 localStorage 或 SQLite（除非对应真实化 Task 单独规划）。

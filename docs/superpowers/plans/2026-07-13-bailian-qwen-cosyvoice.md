# 百炼 Qwen-TTS 与 CosyVoice 实施计划

> **For agentic workers:** 每一步先写失败测试，再做最小实现；不得提交、推送或覆盖工作区无关改动。

**目标：** 在保持 ElevenLabs 行为不变的前提下，接入真实百炼 Qwen-TTS（本地样本 data URI）与 CosyVoice（用户手工 OSS URL）声音复刻和后续语音合成。

**架构：** 新增两个明确的 provider 类型，复用现有 API Key SQLite secret 边界与项目级 active clone resolver。`BaiLianTtsProvider` 负责官方 REST 请求、临时音频 URL 下载与受限本地落盘；CosyVoice 的 OSS URL 仅存在于当前单次克隆请求中，不持久化。

## 约束

- API Key、完整样本路径、完整 OSS URL、原始百炼响应不得进入 localStorage、draft、SQLite 非 secret 表、错误信息或日志。
- Qwen 与 CosyVoice 的 `baseUrl` 都必须是已清理的百炼业务空间 `/api/v1` 根路径。
- CosyVoice 只接受 HTTPS 临时 URL；它不替代本地样本选择，二者必须同时存在。
- 远端创建检查点和 active 原子替换沿用既有语义；百炼删除补偿不在本轮范围。
- 不接 OSS SDK、AccessKey、STS、自动上传、对象删除或 MiniMax。

## Task 1 — Provider metadata、设置与选择器

**Files**

- Modify: `packages/core/src/types.ts`, `packages/core/src/validation.ts`, `packages/core/tests/validation.test.ts`
- Modify: `apps/desktop/src/composables/useAppSettings.ts`, `apps/desktop/src/composables/useAppSettings.test.ts`
- Modify: `apps/desktop/src/components/settings/AiServicesSettings.vue`, `apps/desktop/src/components/settings/AiServicesSettings.test.ts`
- Modify: `apps/desktop/src/composables/useVoiceCloneProvider.ts`, `apps/desktop/src/composables/useVoiceCloneProvider.test.ts`

**Steps**

1. 写失败测试：两个 provider 均要求 API Key、baseUrl、model；可保存但 API Key 不进 browser snapshot；设置页提供正确模型预设；selector 仅接受用户明确选择的 ready provider。
2. 运行 focused 测试，确认失败。
3. 增加 `bailian-qwen-tts`、`bailian-cosyvoice` union、校验、readiness 和设置表单；默认 Qwen `qwen3-tts-vc-2026-01-22`、CosyVoice `cosyvoice-v3.5-flash`。
4. 将 voice clone selector 扩展为构造百炼 provider，但不让百炼失败回退到 ElevenLabs 或 mock。
5. 重新运行 focused 测试。

## Task 2 — 可测百炼 REST Provider

**Files**

- Create: `packages/provider-ai/src/baiLianTtsProvider.ts`, `packages/provider-ai/tests/bailian-tts-provider.test.ts`
- Modify: `packages/provider-ai/src/types.ts`, `packages/provider-ai/src/index.ts`

**Steps**

1. 写失败测试：Qwen data URI enrollment、CosyVoice URL enrollment、两类合成 endpoint/payload、`output.audio.url` 下载落盘、错误清理、URL/API key/本地路径不泄漏。
2. 运行 provider 测试，确认失败。
3. 实现最小 `BaiLianTtsProvider`：注入 fetch transport、文件读取、临时下载、二进制写入、时长探测；只解析必要响应字段。
4. 验证 Qwen 创建模型与合成模型一致；CosyVoice URL 只在 `CloneVoiceInput` 扩展字段中传递，Provider 不保存它。
5. 重新运行 provider focused tests。

## Task 3 — 生命周期、speech resolver 与 UI

**Files**

- Modify: `apps/desktop/src/features/voice-clone/voiceCloneLifecycle.ts` and tests
- Modify: `apps/desktop/src/features/voice-clone/voiceCloneResolver.ts` and tests if needed
- Modify: `apps/desktop/src/composables/useSpeechProvider.ts`, tests
- Modify: `apps/desktop/src/components/workbench/stages/VoiceCloningStage.vue`, tests
- Modify: `apps/desktop/src/App.vue` and its focused/runtime tests only where callback data must flow

**Steps**

1. 写失败测试：百炼 clone 写入正确 provider 值；CosyVoice 在缺少 HTTPS URL 时拒绝；URL 不进入 clone/sample record、browser snapshot或 error；speech 使用 active clone 对应 provider config。
2. 运行 focused tests，确认失败。
3. 最小扩展 input/dependencies，让 CosyVoice URL 仅在组件 state → stage run → provider clone 的一次调用中流动；切换 provider/完成/失败时清空。
4. 增加 Qwen/CosyVoice speech provider 构造与正确本地输出格式；保持 ElevenLabs/本地 CosyVoice 现有路径。
5. 更新授权说明、模型选择提示与本地样本要求；不做 UI 大重构。

## Task 4 — 验收与状态同步

1. 运行全部相关 provider、core、desktop focused tests。
2. 运行 `pnpm typecheck`、`pnpm --filter @mirax/desktop build:web`、`git diff --check`。
3. 检查 diff，不触碰无关文件或泄漏 key/URL/path。
4. 更新 `docs/superpowers/PROJECT-STATE.md`：区分“代码已验证”与“待用户真实百炼凭证手测”，并保留后续 OSS 自动上传为未规划/未实施。

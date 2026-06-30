# Speech 阶段接入 CosyVoice / TTS Provider 实施规划

> **For agentic workers:** 本文档是**规划文档**，用于对齐 Workbench `speech` 阶段从 mock 切换到真实 TTS / CosyVoice provider 的范围、顺序、边界与验收标准。真实源码实现需等每个 Task 单独派工后按本规划执行。步骤用 checkbox（`- [ ]`）语法跟踪。未来逐 Task 执行时推荐使用 superpowers:subagent-driven-development 或 superpowers:executing-plans。

**目标：** 把 Workbench `speech` 阶段从 mock provider（模拟 `audioPath` 与估算时长）切换为用户自配置并启用的 TTS / CosyVoice provider，做到：mock 仍是默认路径、real 仅在用户显式配置并启用后生效、未接入/失败时诚实报错不伪造音频、不把 apiKey/token/baseUrl 写入日志 / snapshot / 任务 payload。

**架构：** speech 是阶段 5 真实化顺序中的第 2 站（文本 → 音频，见 `docs/product-architecture/workbench-real-capability-rollout.md`）。真实能力封装在 `@mirax/provider-ai` 的 TTS provider 边界内，桌面端通过 `useWorkflowRuntime.getStageMode("speech")` 与 `useAppSettings().providerConfigs` 选择 mock 或 real；executor 成功时只接受 provider 返回的真实 `audioPath`，失败时由 `processStage` 标记 `failed`，UI 在 `SpeechSynthesisStage.vue` 区分 mock / real / not-configured / failed / success。

**技术栈：** pnpm workspace、TypeScript、Vue 3、Vite、Vitest；`@mirax/core`（provider 配置类型、阶段运行时模式、产物路径规则）、`@mirax/provider-ai`（`AiProvider.synthesizeSpeech`、结构化错误、fake transport 测试）、`@mirax/sidecar-manager`（CosyVoice 依赖检测边界）、`apps/desktop`（`App.vue`、`useWorkflowRuntime`、`useAppSettings`、`SpeechSynthesisStage.vue`）。

---

## 背景

- PR #4 已合并到 `main`，CI passed。`rewrite` 阶段接入 OpenAI-compatible LLM provider 已完成并合并，不再重复执行 rewrite Task。
- 阶段 5 真实化顺序文档明确：`speech` 排在 `rewrite` 之后，输出 `audioPath`，下游阻断 `avatar` 与 `compose`。
- 当前 `AiProvider.synthesizeSpeech(input)` 契约为 `voiceId + script + projectId -> audioPath + durationSeconds`。
- 当前 mock provider 返回模拟 `audioPath` 与估算时长；`OpenAiCompatibleProvider.synthesizeSpeech` 仍未接线；`App.vue` 的 speech 分支直接调用全局 `aiProvider.synthesizeSpeech`。
- 当前 `SpeechSynthesisStage.vue` 展示预计时长、音频文件名与播放入口；如果真实化失败，必须避免把估算值、模拟路径或空文件展示成真实产物。

## 全局约束

1. 本计划只覆盖 `speech` 一个阶段；不得接入或改造 `voice-clone / avatar / compose / publish`。
2. 默认运行时仍为 `mock`；`real` 仅在用户配置并启用 TTS / CosyVoice provider 后生效。
3. `real` 未配置、未连接或失败时必须诚实失败，**不得** fallback 到 mock 伪造成功。
4. 不伪造音频、时长、文件大小、波形；没有真实文件就不展示为可播放真实产物。
5. `apiKey` / token / `baseUrl` 不进入日志、snapshot、任务 payload、测试 fixture 或错误详情。
6. 测试必须使用 fake transport / fake service，不联网、不依赖真实 CosyVoice。
7. 不实现 keychain / OS 安全存储；apiKey 仍只允许当前会话内存使用。
8. 不 commit、不 push，由总控 review 后再决定后续动作。

## 初始规划范围

- 2026-06-29 初始任务只产出计划文档 `docs/superpowers/plans/2026-06-29-real-speech-provider.md` 与 `docs/superpowers/PROJECT-STATE.md` 状态更新。
- 后续已按用户「继续」指令逐 Task 执行 Task 1–5；每个 Task 独立实现、review、验收。

## Task 1：确认 TTS provider / CosyVoice 调用契约与结构化错误

**状态：已完成。**

**目标：** 在 `@mirax/provider-ai` 内锁定真实 TTS 的输入 / 输出 / 错误契约：`SynthesizeSpeechInput` 可表达脚本、voiceId、项目 ID 与必要的 TTS 参数；`SynthesizeSpeechResult` 只返回真实服务生成并已落盘或可访问的 `audioPath` 与可信 `durationSeconds`；错误码至少覆盖 `not-configured / not-connected / unauthorized / network / bad-response`，必要时增加 `voice-unavailable / synthesis-failed`，但不得暴露凭证。

**实现摘要（2026-06-29）：**

- 新增 `CosyVoiceProvider` 与 `createCosyVoiceProvider(options)`，当前只实现 `synthesizeSpeech`，其他 AI 阶段保持未接线错误，避免把 speech 计划扩散到 voice-clone / avatar。
- `SynthesizeSpeechInput` 新增可选 `speed` / `emotion` 字段；mock provider 缺省行为不变。
- `AiProviderErrorCode` 新增 `voice-unavailable` 与 `synthesis-failed`，用于区分 voiceId 不可用与真实 TTS 合成失败。
- CosyVoice provider 支持注入 fake transport；默认 transport 复用现有 fetch transport。单测覆盖成功、缺 voiceId、缺文案、401、坏响应、baseUrl token 不进入 endpoint / error message、缺 baseUrl。
- `testAiProviderConnection` 新增 `mode: "cosyvoice"` 分支，使用清洗后的 baseUrl 做 `/health` 轻量探测；fake service 测试覆盖成功、缺 baseUrl、403、URL token 不进入请求 endpoint。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run packages/provider-ai/tests              34 passed
./node_modules/.bin/tsc -p packages/provider-ai/tsconfig.json --noEmit passed
```

备注：`pnpm test packages/provider-ai/tests` 在当前机器被 pnpm ignored-builds 预检拦截（`ERR_PNPM_IGNORED_BUILDS: esbuild@0.21.5`），因此本次使用仓库已安装的 Vitest / tsc 二进制完成等价验证。

**允许修改文件：**

- `packages/provider-ai/src/types.ts`
- `packages/provider-ai/src/openAiCompatible.ts` 或新建 `packages/provider-ai/src/cosyVoiceProvider.ts`
- `packages/provider-ai/src/connectionTest.ts`
- `packages/provider-ai/src/index.ts`
- `packages/provider-ai/tests/mock-provider.test.ts`
- `packages/provider-ai/tests/connection-test.test.ts`
- 可选新建：`packages/provider-ai/tests/cosyvoice-provider.test.ts`
- 可选新建：`docs/product-architecture/speech-provider-boundary.md`
- `docs/superpowers/plans/2026-06-29-real-speech-provider.md`
- `docs/superpowers/PROJECT-STATE.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- `apps/*`
- `packages/media-pipeline/*`
- `packages/provider-publish/*`

**验证命令：**

```bash
pnpm test packages/provider-ai/tests
pnpm typecheck
```

**验收标准：**

- [x] TTS 真实调用通过可注入 fake transport / fake service 测试，CI 不联网。
- [x] mock provider 的 `synthesizeSpeech` 默认行为不回归。
- [x] 真实 provider 不返回模拟 `audioPath`、模拟时长、模拟文件大小或波形。
- [x] 所有错误 message 不含 apiKey、token、完整 baseUrl、完整响应体。
- [x] 连接测试能区分未配置、未连接、鉴权失败、网络失败、坏响应。

**明确不做：**

- 不实现 voice-clone 真实声音训练。
- 不调用真实 CosyVoice。
- 不把音频产物写入 SQLite / localStorage。

## Task 2：设计 speech executor 从 mock 切到 real 的路由

**状态：已完成。**

**目标：** 在桌面端把 speech 执行从固定 mock `aiProvider.synthesizeSpeech` 改为按 `runtime.getStageMode("speech")` 路由：`mock` 走现有 mock provider；`real` 且 TTS / CosyVoice 配置就绪时构造真实 provider；`real` 但配置缺失或连接不就绪时抛结构化错误并标记失败；不自动切换 voice-clone、avatar、compose。

**实现摘要（2026-06-29）：**

- 新增 `findEnabledSpeechProviderConfig(configs)`，只选择 `enabled === true && provider === "cosyvoice"` 的配置；非 speech provider 不会被误选。
- 新增 `selectSpeechProvider({ stageMode, providerConfigs, mockProvider })`：`mock` 返回现有 mock provider；`not-connected` 返回结构化错误；`real` 仅在 CosyVoice 配置包含 apiKey 与合法 baseUrl 时构造 `createCosyVoiceProvider`。
- `selectSpeechProvider` 在构造真实 provider 前使用 `sanitizeBaseUrlForStorage` 清洗 baseUrl，剔除 username/password/query/hash，避免 URL token 进入真实 endpoint。
- `App.vue` 的 `speech` 分支改为按 `runtime.getStageMode("speech")` 选择 provider；mock 模式保留原有 voiceId / script fallback；real 模式要求已有 `project.notes` 与真实 `selectedVoiceId`，缺失时抛 `not-configured` / `voice-unavailable`，不 fallback 到 mock。
- real 成功后才写入 `generatedAudioPath` / `generatedAudioDuration`；失败路径不写入新的音频产物。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run apps/desktop/src/composables                                75 passed
./node_modules/.bin/vitest run packages/provider-ai/tests apps/desktop/src/composables     107 passed
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json            passed
./node_modules/.bin/tsc -p packages/provider-ai/tsconfig.json --noEmit                     passed
```

**允许修改文件：**

- `apps/desktop/src/App.vue`
- 可选新建：`apps/desktop/src/composables/useSpeechProvider.ts`
- `apps/desktop/src/composables/useAppSettings.ts`
- `apps/desktop/src/composables/useAppSettings.test.ts`
- 可选新建：`apps/desktop/src/composables/useSpeechProvider.test.ts`
- `apps/desktop/src/composables/useWorkflowRuntime.test.ts`
- `docs/superpowers/plans/2026-06-29-real-speech-provider.md`
- `docs/superpowers/PROJECT-STATE.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- `apps/desktop/src/components/workbench/stages/VoiceCloningStage.vue`
- `apps/desktop/src/components/workbench/stages/AvatarGenerationStage.vue`
- `apps/desktop/src/components/workbench/stages/VideoCompositionStage.vue`
- `packages/media-pipeline/*`

**验证命令：**

```bash
pnpm test apps/desktop/src/composables
pnpm test apps/desktop/src/composables/useWorkflowRuntime.test.ts
pnpm --filter @mirax/desktop typecheck
pnpm typecheck
```

**验收标准：**

- [x] `getStageMode("speech") === "mock"` 时现有 mock 行为不变。
- [x] `getStageMode("speech") === "real"` 只选择启用且适用于 TTS 的 provider（优先 `provider === "cosyvoice"`，如需兼容 custom 必须显式校验）。
- [x] 无启用 TTS provider、无 apiKey/token、无合法 baseUrl、voiceId 无效或脚本为空时返回诚实错误。
- [x] real 失败不写 `generatedAudioPath` / `generatedAudioDuration`，不让下游误以为 speech completed。
- [x] provider 选择逻辑是可单测纯函数，不把复杂分支埋在 `App.vue`。

**明确不做：**

- 不改变 `voice-clone` 默认 mock 行为；缺少真实 voiceId 时只允许使用明确的内置 voiceId 策略，且必须在 UI / 日志中诚实表达。
- 不新增自动重试、队列、后台任务系统。

## Task 3：设计 audioPath 产物路径、安全边界与失败状态

**状态：已完成。**

**目标：** 明确真实 TTS 音频的输出路径、文件存在性、时长来源和失败清理规则：`audioPath` 必须来自真实 provider 的产物或下载后落盘路径，路径遵守既有 `outputRoot/<projectId>/speech/<fileName>` 规则；`durationSeconds` 必须来自服务可信元数据或本地音频探测，不用脚本文字估算冒充真实时长。

**实现摘要（2026-06-29）：**

- `SynthesizeSpeechInput` 新增 `outputPath?: string`，由桌面端 real speech 路径传入 provider；mock provider 忽略该字段，默认行为不变。
- 新增 `buildSpeechOutputPath(audioOutputRoot, projectId)`，生成稳定目标路径：`audioOutput/<projectId>/speech/speech.wav`，并在 `App.vue` real speech 调用中传给 CosyVoice provider。
- `CosyVoiceProvider.synthesizeSpeech` 把 `outputPath` 透传到 fake/real service 请求体；测试断言 fake transport 收到该字段。
- `CosyVoiceProvider` 对真实响应加强校验：必须返回非空 `audioPath` 与正数 `durationSeconds`，否则抛 `synthesis-failed`；不再把缺失时长转换为 `0`。
- `App.vue` 仍只在 provider resolve 成功后写入 `generatedAudioPath` / `generatedAudioDuration`；上述 provider 校验失败会阻止下游误用旧/假产物。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run packages/provider-ai/tests/cosyvoice-provider.test.ts apps/desktop/src/composables/useSpeechProvider.test.ts  20 passed
./node_modules/.bin/vitest run packages/provider-ai/tests apps/desktop/src/composables                                            110 passed
./node_modules/.bin/tsc -p packages/provider-ai/tsconfig.json --noEmit                                                           passed
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json                                                  passed
```

**允许修改文件：**

- `packages/core/src/types.ts`
- `packages/core/src/workflow.ts`
- `packages/core/tests/workflow.test.ts`
- `packages/provider-ai/src/types.ts`
- `packages/provider-ai/tests/cosyvoice-provider.test.ts`
- `apps/desktop/src/App.vue`
- `apps/desktop/src/components/workbench/WorkbenchSidePanel.vue`
- 可选新建：`docs/product-architecture/speech-artifact-boundary.md`
- `docs/superpowers/plans/2026-06-29-real-speech-provider.md`
- `docs/superpowers/PROJECT-STATE.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- `apps/desktop/src/components/workbench/stages/AvatarGenerationStage.vue`
- `apps/desktop/src/components/workbench/stages/VideoCompositionStage.vue`
- `packages/local-store/*`（除非后续单独规划持久化）

**验证命令：**

```bash
pnpm test packages/core/tests/workflow.test.ts
pnpm test packages/provider-ai/tests
pnpm --filter @mirax/desktop typecheck
pnpm typecheck
```

**验收标准：**

- [x] `audioPath` 只在真实 TTS 成功后写入，失败时保留旧可用产物或清空策略必须明确且可测。
- [x] `durationSeconds` 不用 `estimatedSeconds` 伪装真实结果；真实缺失时 UI 显示未知或失败。
- [x] 不记录文件大小、波形、采样率等未真实取得的数据。
- [x] 日志只写安全摘要，例如「语音合成失败：network」，不写完整 URL、token、响应体。
- [x] 下游 `avatar / compose` 只消费成功的 `audioPath`。

**明确不做：**

- 不实现音频波形分析。
- 不实现音频文件持久化迁移或清理守护进程。

## Task 4：设计 SpeechSynthesisStage 的 mock / real / not-configured / failed / success UI 状态

**状态：已完成。**

**目标：** 让 `SpeechSynthesisStage.vue` 诚实呈现五种状态：mock（模拟产物）、real ready/running、not-configured（真实 TTS 未配置或未连接）、failed（真实失败且不展示成功产物）、success（真实音频可播放）。真实失败时保留文案与声音选择入口，允许用户修复配置后重试；不得把估算时长或模拟路径展示成真实成功。

**实现摘要（2026-06-29）：**

- `SpeechSynthesisStage.vue` 新增 `mode?: WorkflowStageRuntimeMode` 与 `errorMessage?: string` props。
- 新增 mock / real / not-connected / failed 展示：mock 显示「Mock 音频」徽标；not-connected 显示「真实 TTS 未连接」提示并禁用合成按钮；real ready 显示真实调用提示；failed 显示安全错误摘要与失败状态。
- result 时长展示收紧：真实模式没有正数 `audioDuration` 时显示「时长未知」，不再用估算时长冒充真实结果。
- `App.vue` 新增 `speechMode` / `speechErrorMessage`，speech 失败时写入安全错误摘要，并传给 `SpeechSynthesisStage`。
- `App.vue` 在 real speech 调用前清空旧 `generatedAudioPath` / `generatedAudioDuration`，避免真实失败后继续展示 stale audio；静态测试覆盖该接线。
- 新增 `SpeechSynthesisStage.test.ts` 静态 UI 契约测试，覆盖 mock 标注、not-connected 提示、real 提示、失败横幅、按钮禁用、敏感字面量检查与 App props 接线。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run apps/desktop/src/components/workbench packages/provider-ai/tests apps/desktop/src/composables  140 passed
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json                                      passed
./node_modules/.bin/tsc -p packages/provider-ai/tsconfig.json --noEmit                                               passed
cd apps/desktop && ../../apps/desktop/node_modules/.bin/vite build                                                  passed
```

**允许修改文件：**

- `apps/desktop/src/components/workbench/stages/SpeechSynthesisStage.vue`
- 可选新建：`apps/desktop/src/components/workbench/stages/speechSynthesisStage.utils.ts`
- 可选新建：`apps/desktop/src/components/workbench/stages/SpeechSynthesisStage.test.ts`
- `apps/desktop/src/App.vue`
- `docs/superpowers/plans/2026-06-29-real-speech-provider.md`
- `docs/superpowers/PROJECT-STATE.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- `apps/desktop/src/components/workbench/stages/ScriptRewritingStage.vue`
- `apps/desktop/src/components/workbench/stages/VoiceCloningStage.vue`
- `apps/desktop/src/components/workbench/stages/AvatarGenerationStage.vue`
- `apps/desktop/src/components/workbench/stages/VideoCompositionStage.vue`

**验证命令：**

```bash
pnpm test apps/desktop/src/components/workbench
pnpm --filter @mirax/desktop typecheck
pnpm --filter @mirax/desktop build:web
pnpm typecheck
```

**验收标准：**

- [x] mock 模式可标注「Mock 音频」，但不阻断现有流程。
- [x] not-configured 显示设置指引，生成按钮禁用或点击后只产出诚实错误。
- [x] failed 展示安全错误摘要，保留文案与更换声音入口，不显示「已生成」。
- [x] success 仅在 `audioPath` 存在且当前执行成功时展示音频文件和播放入口。
- [x] 组件模板和测试不包含 apiKey、token、完整 baseUrl、`sk-` 等敏感字面量。

**明确不做：**

- 不做新的视觉大改。
- 不新增波形、字幕对齐、批量试听。

## Task 5：整体验收与测试计划

**状态：已完成。**

**目标：** 在 Task 1–4 完成后做一次 speech 阶段整体验收：验证 mock 默认不变、real 配置路径生效、真实失败诚实失败、安全边界不泄露、受保护文件未修改、CI 级命令通过。

**实现摘要（2026-06-29）：**

- 复验 provider-ai、desktop composables、workbench 组件、全仓测试、desktop 类型检查、provider-ai 类型检查与 desktop Vite build。
- 受保护文件检查通过：`docs/reverse-engineering/legacy-ui-gap-list.md`、`.codex/dispatch-state.json`、`docs/人工提示词.md` 无 diff。
- 本阶段没有联网，没有依赖真实 CosyVoice；所有真实路径测试均使用 fake transport / fake service。
- 复审修复已纳入验收：CosyVoice 连接测试清洗 `/health` endpoint；real speech 调用前清空旧音频产物，失败后不展示 stale audio。
- 未 commit / push，等待总控 review。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run packages/provider-ai/tests                         34 passed
./node_modules/.bin/vitest run apps/desktop/src/composables                       77 passed
./node_modules/.bin/vitest run apps/desktop/src/components/workbench              29 passed
./node_modules/.bin/vitest run                                                    222 passed
./node_modules/.bin/tsc -p packages/provider-ai/tsconfig.json --noEmit            passed
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json   passed
cd apps/desktop && ../../apps/desktop/node_modules/.bin/vite build                passed
git diff --check                                                                  passed
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md .codex/dispatch-state.json docs/人工提示词.md  no output
```

**允许修改文件：**

- `docs/superpowers/plans/2026-06-29-real-speech-provider.md`
- `docs/superpowers/PROJECT-STATE.md`
- 必要时只允许补测前 4 个 Task 已列明的测试文件。

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- 任何未在 Task 1–4 列明的源码文件。

**验证命令：**

```bash
pnpm test packages/provider-ai/tests
pnpm test apps/desktop/src/composables
pnpm test apps/desktop/src/components/workbench
pnpm test
pnpm typecheck
pnpm --filter @mirax/desktop build:web
git diff --check
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md .codex/dispatch-state.json docs/人工提示词.md
```

**验收标准：**

- [x] mock 默认路径、rewrite 已合并行为、下游 avatar/compose 现有行为均不回归。
- [x] real speech 成功路径只接受 fake service 单测证明，不要求真实 CosyVoice。
- [x] real speech 失败不产生模拟音频、不写 `audioPath` 成功产物、不 fallback 到 mock。
- [x] apiKey/token/baseUrl 不出现在日志、snapshot、任务 payload、测试 fixture、错误 UI。
- [x] 计划与 `PROJECT-STATE.md` 同步，且明确下一步由总控 review 后再派工实现。

**明确不做：**

- 不 commit / push。
- 不开启 voice-clone / avatar / compose / publish 真实化。

## 后续执行顺序

1. Task 1 provider 契约与 fake transport 测试。
2. Task 2 桌面端 speech provider 选择与 executor 路由。
3. Task 3 `audioPath` 产物与失败边界。
4. Task 4 speech UI 五态。
5. Task 5 全链路验收。

Task 1–5 已完成并通过本地验收。等待总控 review；不要修改受保护文件，不要 commit / push。

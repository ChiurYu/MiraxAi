# Voice-clone 阶段接入 CosyVoice Provider 实施规划

> **For agentic workers:** 本文档用于对齐 Workbench `voice-clone` 阶段从 mock 切换到真实 CosyVoice provider 的范围、顺序、边界与验收标准。步骤用 checkbox（`- [ ]`）语法跟踪。

**目标：** 把 Workbench `voice-clone` 阶段从 mock `voiceId` 切换为用户自配置并启用的 CosyVoice provider。默认仍为 mock；real 仅在用户启用 CosyVoice 后生效；真实失败时诚实失败，不伪造 `voiceId`，不 fallback 到 mock。

## 全局约束

1. 本计划只覆盖 `voice-clone` 一个阶段；不接入或改造 `speech / avatar / compose / publish`。
2. 默认运行时仍为 `mock`；`real` 仅在用户配置并启用 CosyVoice provider 后生效。
3. `real` 未配置、未连接或失败时必须诚实失败，不得 fallback 到 mock 伪造 `voiceId`。
4. 不伪造声音训练结果、样本时长、文件大小、声纹质量或训练进度。
5. `apiKey` / token / `baseUrl` 不进入日志、snapshot、任务 payload、测试 fixture 或错误详情。
6. 测试必须使用 fake transport / fake service，不联网、不依赖真实 CosyVoice。
7. 不实现 keychain / OS 安全存储；apiKey 仍只允许当前会话内存使用。
8. 不 commit、不 push，由总控 review 后再决定后续动作。

## Task 1：确认 voice-clone provider 调用契约与结构化错误

**状态：已完成。**

**目标：** 在 `@mirax/provider-ai` 内实现 `CosyVoiceProvider.cloneVoice(input)`，输入为 `voiceSamplePath + projectId`，输出只接受真实服务返回的 `voiceId` 与可信 `samplePath`；错误码覆盖未配置、未连接、鉴权失败、网络失败、坏响应与 `clone-failed`。

**实现摘要（2026-06-29）：**

- `AiProviderErrorCode` 新增 `clone-failed`。
- `CosyVoiceProvider.cloneVoice` 接入 `/voice-clone`，请求体只包含 `samplePath`、`projectId`、`model`。
- 真实响应必须包含非空 `voiceId` 与 `samplePath`，否则抛 `clone-failed`。
- fake transport 测试覆盖成功、缺样本路径、缺 `voiceId`、鉴权/服务失败与 URL token 不泄漏。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run packages/provider-ai/tests/cosyvoice-provider.test.ts  12 passed
./node_modules/.bin/tsc -p packages/provider-ai/tsconfig.json --noEmit                passed
```

**验收标准：**

- [x] 使用 fake transport 测试成功、缺样本路径、401/403、坏响应、URL token 不泄漏。
- [x] 真实 provider 不返回 mock `voiceId`。
- [x] 错误 message 不含 apiKey、token、完整 baseUrl、完整响应体。

## Task 2：设计 voice-clone executor 从 mock 切到 real 的路由

**状态：已完成。**

**目标：** 桌面端 `voice-clone` 按 `runtime.getStageMode("voice-clone")` 路由：mock 走现有 mock provider；real 且 CosyVoice 配置就绪时构造真实 provider；real 缺配置或未连接时抛结构化错误并标记失败。

**实现摘要（2026-06-29）：**

- 新增 `findEnabledVoiceCloneProviderConfig`，只选择启用的 CosyVoice provider。
- 新增 `selectVoiceCloneProvider`，支持 mock / not-connected / real 三类路由；real 构造 provider 前清洗 baseUrl。
- `App.vue` 的 `voice-clone` 分支按 `runtime.getStageMode("voice-clone")` 选择 provider。
- real 调用前清空旧 `selectedVoiceId` / `selectedVoiceName`，成功后才写入新的真实结果。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run apps/desktop/src/composables/useAppSettings.test.ts apps/desktop/src/composables/useVoiceCloneProvider.test.ts  28 passed
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json                                                    passed
```

**验收标准：**

- [x] mock 模式现有行为不变。
- [x] real 模式只选择启用的 CosyVoice provider。
- [x] 无样本、无 apiKey、无合法 baseUrl 时诚实失败。
- [x] real 失败不写新的 `selectedVoiceId` / `selectedVoiceName`，不让 speech 误以为 voice-clone completed。

## Task 3：设计 VoiceCloningStage 的 mock / real / not-configured / failed / success UI 状态

**状态：已完成。**

**目标：** `VoiceCloningStage.vue` 诚实展示 mock、real ready/running、not-connected、failed、success 五种状态。真实失败保留样本选择入口，允许用户修复配置后重试。

**实现摘要（2026-06-29）：**

- `VoiceCloningStage.vue` 新增 `mode` / `errorMessage` props。
- UI 新增 Mock 声音、真实声音克隆、真实声音克隆未连接、失败提示与真实模式提示。
- not-connected 禁用克隆按钮；failed 只展示安全错误摘要，不展示「已就绪」。
- 新增静态 UI 契约测试，覆盖提示文案、按钮禁用、敏感字面量检查与 App props 接线。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run apps/desktop/src/components/workbench/stages/VoiceCloningStage.test.ts  8 passed
./node_modules/.bin/vitest run packages/provider-ai/tests apps/desktop/src/composables apps/desktop/src/components/workbench  163 passed
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json                                           passed
```

**验收标准：**

- [x] mock 模式标注「Mock 声音」。
- [x] not-connected 显示设置指引并禁用克隆按钮。
- [x] failed 展示安全错误摘要，不显示「已就绪」。
- [x] success 仅在 `voiceId` 存在且当前执行成功时展示。
- [x] 模板和测试不包含 apiKey、token、完整 baseUrl、`sk-` 等敏感字面量。

## Task 4：整体验收与测试计划

**状态：已完成。**

**目标：** 复验 provider-ai、desktop composables、workbench 组件、全仓测试、类型检查、desktop build、受保护文件 diff。

**实现摘要（2026-06-29）：**

- 复验 provider-ai、desktop composables、workbench 组件、全仓测试、desktop 类型检查、provider-ai 类型检查与 desktop Vite build。
- 受保护文件检查通过：`docs/reverse-engineering/legacy-ui-gap-list.md`、`.codex/dispatch-state.json`、`docs/人工提示词.md` 无 diff。
- 本阶段没有联网，没有依赖真实 CosyVoice；所有真实路径测试均使用 fake transport / fake service。
- 未 commit / push，等待总控 review。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run packages/provider-ai/tests apps/desktop/src/composables apps/desktop/src/components/workbench  163 passed
./node_modules/.bin/vitest run                                                                            245 passed
./node_modules/.bin/tsc -p packages/provider-ai/tsconfig.json --noEmit                                    passed
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json                           passed
cd apps/desktop && ../../apps/desktop/node_modules/.bin/vite build                                        passed
```

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

- [x] mock 默认路径、speech 已完成行为、下游 avatar/compose 现有行为均不回归。
- [x] real voice-clone 成功路径只接受 fake service 单测证明，不要求真实 CosyVoice。
- [x] real voice-clone 失败不产生模拟声音、不写 `voiceId` 成功产物、不 fallback 到 mock。
- [x] apiKey/token/baseUrl 不出现在日志、snapshot、任务 payload、测试 fixture、错误 UI。
- [x] 计划与 `PROJECT-STATE.md` 同步，且明确下一步由总控 review 后再派工。

Task 1–4 已完成并通过本地验收。等待总控 review；不要修改受保护文件，不要 commit / push。

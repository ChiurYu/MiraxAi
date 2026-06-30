# Transcribe 阶段接入 Whisper Provider 实施规划

> **For agentic workers:** 本文档用于对齐 Workbench `transcribe` 阶段从 mock 切换到真实 Whisper-compatible provider 的范围、顺序、边界与验收标准。步骤用 checkbox（`- [ ]`）语法跟踪。

**目标：** 把 Workbench `transcribe` 阶段从 mock 文案提取切换为用户自配置并启用的 Whisper provider。默认仍为 mock；real 仅在用户启用 Whisper provider 后生效；真实失败时诚实失败，不伪造 transcript，不 fallback 到 mock。

## 全局约束

1. 本计划只覆盖 `transcribe` 一个阶段；不接入或改造 `voice-clone / speech / avatar / compose / publish`。
2. 默认运行时仍为 `mock`；`real` 仅在用户配置并启用 Whisper provider 后生效。
3. `real` 未配置、未连接或失败时必须诚实失败，不得 fallback 到 mock 伪造 transcript。
4. 不伪造文案、分段、音轨、时长、文件大小或识别置信度。
5. `apiKey` / token / `baseUrl` 不进入日志、snapshot、任务 payload、测试 fixture 或错误详情。
6. 测试必须使用 fake transport / fake service，不联网、不依赖真实 Whisper。
7. 不实现 FFmpeg 抽音轨、不实现 keychain / OS 安全存储。
8. 不 commit、不 push，由总控 review 后再决定后续动作。

## Task 1：确认 Whisper provider 调用契约与结构化错误

**状态：已完成。**

**目标：** 在 `@mirax/provider-ai` 内实现 Whisper-compatible `transcribe(input)`，输入为 `sourceVideoPath + language`，输出只接受真实服务返回的非空 `text` 与可信 `segments`；错误码覆盖未配置、未连接、鉴权失败、网络失败、坏响应与 `transcribe-failed`。

**实现摘要（2026-06-29）：**

- 新增 `WhisperProvider` 与 `createWhisperProvider(options)`，当前只实现 `transcribe`，其他 AI 阶段保持未接线错误。
- `AiProviderErrorCode` 新增 `transcribe-failed`。
- Whisper provider 调用 `/transcribe`，请求体只包含 `sourceVideoPath`、`language`、`model`。
- 真实响应必须包含非空 `text` 与可信 `segments`，否则抛 `transcribe-failed`。
- `testAiProviderConnection` 新增 `mode: "whisper"` 分支，使用清洗后的 baseUrl 做 `/health` 探测。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run packages/provider-ai/tests/whisper-provider.test.ts packages/provider-ai/tests/connection-test.test.ts  22 passed
./node_modules/.bin/tsc -p packages/provider-ai/tsconfig.json --noEmit                                                passed
```

**验收标准：**

- [x] 使用 fake transport 测试成功、缺素材路径、401/403、坏响应、URL token 不泄漏。
- [x] 真实 provider 不返回 mock transcript。
- [x] 错误 message 不含 apiKey、token、完整 baseUrl、完整响应体。

## Task 2：设计 transcribe executor 从 mock 切到 real 的路由

**状态：已完成。**

**目标：** 桌面端 `transcribe` 按 `runtime.getStageMode("transcribe")` 路由：mock 走现有 mock provider；real 且 Whisper 配置就绪时构造真实 provider；real 缺配置或未连接时抛结构化错误并标记失败。

**实现摘要（2026-06-29）：**

- 新增 `findEnabledTranscribeProviderConfig`，只选择启用的 Whisper provider。
- 新增 `selectTranscribeProvider`，支持 mock / not-connected / real 三类路由；real 构造 provider 前清洗 baseUrl。
- `App.vue` 的 `transcribe` 分支按 `runtime.getStageMode("transcribe")` 选择 provider。
- real 调用前清空旧 `transcriptText`，成功后才写入新 transcript，避免 rewrite 误用旧文本。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run apps/desktop/src/composables/useAppSettings.test.ts apps/desktop/src/composables/useTranscribeProvider.test.ts  30 passed
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json                                                   passed
```

**验收标准：**

- [x] mock 模式现有行为不变。
- [x] real 模式只选择启用的 Whisper provider。
- [x] 无素材、无合法 baseUrl、无 model 时诚实失败。
- [x] real 失败不写新的 `transcriptText`，不让 rewrite 误以为 transcribe completed。

## Task 3：设计 MaterialParsingStage 的 mock / real / not-configured / failed / success UI 状态

**状态：已完成。**

**目标：** `MaterialParsingStage.vue` 诚实展示 mock、real ready/running、not-connected、failed、success 五种状态。真实失败保留素材选择入口，允许用户修复配置后重试。

**实现摘要（2026-06-29）：**

- `MaterialParsingStage.vue` 新增 `status` / `mode` / `errorMessage` props。
- UI 新增 Mock 解析、真实转写、真实转写未连接、失败提示与真实模式提示。
- not-connected 禁用解析按钮；failed 展示安全错误摘要。
- 新增静态 UI 契约测试，覆盖提示文案、按钮禁用、敏感字面量检查与 App props 接线。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run apps/desktop/src/components/workbench/stages/MaterialParsingStage.test.ts  8 passed
./node_modules/.bin/vitest run packages/provider-ai/tests apps/desktop/src/composables apps/desktop/src/components/workbench  190 passed
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json                                           passed
```

**验收标准：**

- [x] mock 模式标注「Mock 解析」。
- [x] not-connected 显示设置指引并禁用解析按钮。
- [x] failed 展示安全错误摘要，不展示为成功解析。
- [x] success 仅在当前阶段 completed 时展示。
- [x] 模板和测试不包含 apiKey、token、完整 baseUrl、`sk-` 等敏感字面量。

## Task 4：整体验收与测试计划

**状态：已完成。**

**目标：** 复验 provider-ai、desktop composables、workbench 组件、全仓测试、类型检查、desktop build、受保护文件 diff。

**实现摘要（2026-06-29）：**

- 复验 provider-ai、desktop composables、workbench 组件、全仓测试、desktop 类型检查、provider-ai 类型检查与 desktop Vite build。
- 本阶段没有联网，没有依赖真实 Whisper；所有真实路径测试均使用 fake transport / fake service。
- 未实现 FFmpeg 抽音轨、文件探测、队列或取消处理。
- 未 commit / push，等待总控 review。

**验证结果（2026-06-29）：**

```text
./node_modules/.bin/vitest run packages/provider-ai/tests apps/desktop/src/composables apps/desktop/src/components/workbench  190 passed
./node_modules/.bin/vitest run                                                                            272 passed
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

- [x] mock 默认路径、voice-clone/speech 已完成行为、下游 rewrite 现有行为均不回归。
- [x] real transcribe 成功路径只接受 fake service 单测证明，不要求真实 Whisper。
- [x] real transcribe 失败不产生模拟 transcript、不写成功产物、不 fallback 到 mock。
- [x] apiKey/token/baseUrl 不出现在日志、snapshot、任务 payload、测试 fixture、错误 UI。
- [x] 计划与 `PROJECT-STATE.md` 同步，且明确下一步由总控 review 后再派工。

Task 1–4 已完成并通过本地验收。等待总控 review；不要修改受保护文件，不要 commit / push。

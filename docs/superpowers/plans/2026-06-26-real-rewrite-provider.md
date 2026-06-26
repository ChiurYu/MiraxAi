# Rewrite 阶段接入 OpenAI-compatible LLM Provider 实施规划

> **For agentic workers:** 本文档是**规划文档**，用于对齐 Workbench `rewrite` 阶段从 mock 切换到真实 OpenAI-compatible LLM provider 的范围、顺序、边界与验收标准。真实源码实现需等每个 Task 单独派工后按本规划执行。步骤用 checkbox（`- [ ]`）语法跟踪。未来逐 Task 执行时推荐使用 superpowers:subagent-driven-development 或 superpowers:executing-plans。

**目标：** 把 Workbench `rewrite` 阶段从 mock provider（固定文案）切换为用户自配置的 OpenAI-compatible LLM provider，做到：mock 仍是默认路径、real 仅在用户显式配置并启用后生效、未接入/失败时诚实报错不伪造成功、API Key 等敏感字段不进入日志 / snapshot / 任务 payload。

**架构：** rewrite 是阶段 5 真实化顺序中的第 1 站（纯文本、风险最低、回滚最容易，见 `docs/product-architecture/workbench-real-capability-rollout.md`）。真实能力封装在 `@mirax/provider-ai` 的 `OpenAiCompatibleProvider` 内，桌面端通过 `useWorkflowRuntime` 的 `stageModes` / `getStageMode("rewrite")` 与 `useAppSettings().providerConfigs` 选择 provider，executor 按 stageMode 路由到 mock 或 real，UI 在 `ScriptRewritingStage.vue` 区分 mock / 未接入 / 失败 / 成功四种表现。

**技术栈：** pnpm workspace、TypeScript、Vue 3、Vite、Vitest；`@mirax/core`（provider 配置类型、阶段运行时模式）、`@mirax/provider-ai`（`AiProvider`、`OpenAiCompatibleProvider`、`testAiProviderConnection`）、`apps/desktop`（`App.vue`、`useWorkflowRuntime`、`useAppSettings`、`ScriptRewritingStage.vue`）。

---

## 背景

- 阶段 4 P1 Stitch UI Vue 迁移已合并（PR #2）。Workbench 8 阶段、资产库、任务中心、账号管理、设置页均已落地，但真实能力大多为 mock / 诚实空态。
- 阶段 5 P0「真实能力接入前置基础设施与执行顺序」（`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`）Task 1–6 **已全部完成**，**PR #3 已合并到 `main`**（merge commit `60b6cd3`，CI passed）。已就位的前置基础设施：
  1. GitHub Actions CI（`.github/workflows/ci.yml`，跑 `pnpm test` / `pnpm typecheck` / `desktop build:web`，不联网）。
  2. Provider 配置安全边界：`sanitizeProviderConfigForStorage` / `sanitizeBaseUrlForStorage`，snapshot 不含 `apiKey`，恢复时 `apiKey` 归零。
  3. sidecar / 本地依赖检测分层（检测接口与运行接口分离）。
  4. 真实媒体产物路径与结构化错误（`MediaRendererError`、产物状态机）。
  5. 工作台真实化顺序文档：`rewrite` 排第 1；`@mirax/core` 提供 `WorkflowStageRuntimeMode`、`STAGE_PREREQUISITES`、`createDefaultStageModes`；`useWorkflowRuntime` 提供 `getStageMode(stageId)`。
  6. 发布自动化安全边界与失败恢复。
- 真实化顺序文档明确：`rewrite` 是第一个真实化阶段——纯文本改写、OpenAI-compatible LLM、风险最低、回滚最容易。
- 因此**下一阶段真实能力接入从 `rewrite` 开始**：本计划规划如何把 `rewrite` 安全地从 mock 切到 real，并保持其余 7 个阶段不变。

### 当前 rewrite 链路事实（真实化基线，勿丢失）

- `apps/desktop/src/App.vue:48`：`const aiProvider = createMockAiProvider({ artifactRoot: "/Users/Shared/MiraxAI" })`，全 App 共用单一 mock 实例。
- `apps/desktop/src/App.vue:53`：`const { appSettings } = useAppSettings()`——**当前未解构 `providerConfigs`**，rewrite 真实化必须接入它。
- `apps/desktop/src/App.vue:167-170`：`useWorkflowRuntime({ projectId: "demo-project", executor: executeStage })`——**未传 `stageModes`**，故所有阶段 `getStageMode` 默认 `"mock"`。
- `apps/desktop/src/App.vue:241-256`：`executeStage` 的 `rewrite` 分支：校验 `transcriptText`，调 `aiProvider.rewriteScript({ transcript, productName: project.value.name, sellingPoints: ["通勤","大容量","质感"] })`，写 `project.notes = result.script`，并 `prep.updateMetadata({ title, description })`。`sellingPoints` 为硬编码。
- `apps/desktop/src/components/workbench/stages/ScriptRewritingStage.vue`：props 仅 `modelValue / transcriptText / running / status`，UI-only 状态 `activeGoal`（改写目标）、`activePreset`（提示词模板）、`targetLength`（目标字数）**当前不进入 executor**；版本历史在 `status` 由 `running → completed` 且 `notes` 非空时记录；失败态无专属错误展示。
- `packages/provider-ai/src/openAiCompatible.ts`：`OpenAiCompatibleProvider.rewriteScript` 抛 `UNWIRED_ERROR`；`createOpenAiCompatibleProvider(options)` 接收 `{ baseUrl, apiKey, model }`。
- `packages/provider-ai/src/connectionTest.ts`：`testAiProviderConnection`，`mock` 返回 ok，`openai-compatible` 返回固定「尚未接入」诚实错误。
- `packages/core` provider 配置：`ApiKeyProviderConfig { id, label, provider, apiKey, baseUrl?, model?, enabled }`（`types.ts:47`）；`validateProviderConfig`（`validation.ts:41`，校验名称 / API Key / Base URL 格式）。

---

## 全局约束

每个 Task 的要求都隐式包含本节，违反任一条即视为该 Task 不通过。

1. 不得修改 `docs/reverse-engineering/legacy-ui-gap-list.md`。
2. 不得修改 `.codex/dispatch-state.json`。
3. 不得修改 `docs/人工提示词.md`。
4. 默认不 `git commit`、不 `git push`，由总控统一 review、验证、提交。
5. API Key、Token、Cookie、`baseUrl` 中的 token 等凭证明文，不得进入日志（`addLog` message）、snapshot、任务 payload、测试 fixture、错误信息或 Git。
6. 未真实接入或调用失败时，必须保持诚实状态：不伪造文案、不记录版本、不显示「已生成」。real 失败**不得**自动 fallback 到 mock 伪造成功。
7. 本阶段只真实化 `rewrite` **一个**阶段；不得触碰 `transcribe / voice-clone / speech / avatar / compose / review / publish` 的 provider 行为。
8. mock 为默认运行时模式；real 仅作为「用户显式配置并启用 LLM provider + 选择 real」后的可配置开关。

---

## 本次派工范围（重要）

- **本次派工只产出两件交付物**：本计划文档 `docs/superpowers/plans/2026-06-26-real-rewrite-provider.md` 与 `docs/superpowers/PROJECT-STATE.md` 的状态更新。
- **本次不修改任何 `packages/*` 或 `apps/*` 源码**，不实现真实 OpenAI 调用。
- 下文 Task 1–5 是后续**逐个派工执行**的真实化步骤；每个 Task 独立 review、独立验收，验收通过后才规划 / 派工下一个 Task。
- Task 间存在顺序依赖：Task 1（provider 契约与错误类型）→ Task 2（executor 路由）→ Task 3（配置读取边界）→ Task 4（UI 状态）→ Task 5（测试与验收收尾）。Task 3 的安全约束在 Task 2 接线时即需遵守，Task 5 在前 4 个完成后做整体验收。

---

## Task 1：确认 provider-ai 真实调用边界与错误类型

**状态：已完成。**

**目标：** 在写真实切换接线之前，先锁定 `AiProvider.rewriteScript` 真实化所需的输入 / 输出 / 错误契约：定义一套结构化错误类型，区分「未配置 / 未连接 / 鉴权失败 / 网络失败 / 响应解析失败」；确认 mock 与 real 共享同一 `RewriteScriptResult` 形状；在 `OpenAiCompatibleProvider` 中提供**默认基于 fetch 的 runtime transport** 用于真实调用，同时暴露可注入 transport 接口，使单测可用 fake transport、CI 不触达外部服务。本 Task 在 `@mirax/provider-ai` 包内闭环，不接触桌面端。

**允许修改文件：**

- 修改：`packages/provider-ai/src/types.ts`（新增结构化错误类型，如 `AiProviderErrorCode` 与 `AiProviderError`；新增 transport 接口，如 `OpenAiCompatibleTransport` / `ChatCompletionRequest` / `ChatCompletionResponse`，允许构造函数注入；如确需把改写目标 / 提示词模板 / 目标字数 / 卖点纳入真实请求，以**可选字段**扩展 `RewriteScriptInput`，保持 mock 仍可运行）
- 修改：`packages/provider-ai/src/openAiCompatible.ts`（定义 `rewriteScript` 真实实现的请求构造、响应解析与错误抛出点；默认使用基于 `fetch` 的 runtime transport 发起真实 OpenAI-compatible `/chat/completions` 调用；构造函数允许注入 fake transport 用于测试；仅在**构造参数缺失 / transport 构造失败 / 连接测试失败**时返回 `not-connected` / `not-configured` 语义错误，不要把“未注入 transport”作为桌面端 real 模式的最终状态）
- 修改：`packages/provider-ai/src/connectionTest.ts`（`openai-compatible` 分支使用默认 transport 对 `/models` 或一个极轻量 endpoint 做探测，返回可区分 `unauthorized / network / bad-response / not-connected` 的结构化结果，message 不含敏感信息）
- 修改：`packages/provider-ai/tests/mock-provider.test.ts`（补充 mock 与 real 结果形状一致性、可选字段缺省时 mock 行为不变）
- 修改：`packages/provider-ai/tests/connection-test.test.ts`（补充错误码映射、message 不含 apiKey / baseUrl token 的断言）
- 可选创建：`packages/provider-ai/tests/openai-compatible.test.ts`（用 fake transport 覆盖 rewrite 成功 / 鉴权失败 / 网络失败 / 坏响应）
- 可选创建：`docs/product-architecture/rewrite-provider-boundary.md`（rewrite provider 真实调用边界说明）
- 修改：`docs/superpowers/plans/2026-06-26-real-rewrite-provider.md`（本 Task checkbox / 验证结果）
- 修改：`docs/superpowers/PROJECT-STATE.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`、`.codex/dispatch-state.json`、`docs/人工提示词.md`
- `apps/` 下任何源码（Task 1 只动 provider-ai 包与文档，不接线桌面端）
- `packages/core`、`packages/media-pipeline`、`packages/provider-publish`、`packages/local-store`、`packages/sidecar-manager`
- `packages/provider-ai/src/mock.ts`（不得在 mock 中混入真实网络调用）

**验证命令：**

```bash
pnpm test packages/provider-ai/tests
pnpm typecheck
```

**验收标准：**

- [x] 定义结构化错误类型，错误码至少覆盖：`not-configured`（无启用配置 / 无 key / 无 model）、`not-connected`（连接测试未通过 / transport 初始化失败）、`unauthorized`（401/403）、`network`（超时 / 连接失败 / DNS 失败）、`bad-response`（响应非预期 / 解析失败 / 空 choices）。
- [x] `RewriteScriptInput` / `RewriteScriptResult` 形状被 mock 与 real 共享；任何新增字段均为**可选**，缺省时 `createMockAiProvider().rewriteScript` 行为与现状一致（现有 `mock-provider.test.ts` 不回归）。
- [x] `OpenAiCompatibleProvider` 默认使用基于 `fetch` 的 runtime transport 发起真实 OpenAI-compatible `/chat/completions` 调用；构造函数支持注入 fake transport，单测注入 fake transport 后**不触发任何真实网络请求**。
- [x] `createOpenAiCompatibleProvider(options)` 在 `options` 缺 `apiKey` / `model` 时直接拒绝并返回 `not-configured` 语义错误；`baseUrl` 可选，缺省使用官方 OpenAI endpoint。不要把构造参数缺失作为“未注入 transport”的半成品状态。
- [x] `testAiProviderConnection` 的 `openai-compatible` 分支使用默认 transport 做轻量探测，能返回上述错误码语义；其 `message` 与所有错误 message 中**不含** apiKey、baseUrl 中的 token、完整响应体；允许出现 provider id、model、HTTP 状态码范围。
- [x] 单测（fake transport）覆盖 rewrite 的成功、`unauthorized`、`network`、`bad-response` 四条路径，且 CI 不联网即可通过。

**明确不做什么：**

- 不在 `mock.ts` 里发起真实网络调用。
- 不把 apiKey 写入测试 fixture、快照或日志。
- 不接线桌面端 executor / UI（属 Task 2 / Task 4）。
- 不实现 `transcribe / cloneVoice / synthesizeSpeech / generateAvatarVideo` 的真实调用。
- 不读取 `providerConfigs` 或 `localStorage`（provider-ai 包不依赖桌面端存储）。
- 不把「未注入 transport」作为桌面端 real 模式的最终状态；默认 transport 必须让真实调用可闭环。

---

## Task 2：设计 rewrite executor 如何从 mock 切到 real

**状态：已完成。**

**目标：** 在桌面端把 rewrite 的执行从「固定调用单一 mock 实例」改为「按 `getStageMode("rewrite")` 与已启用 LLM 配置选择 provider」：`mock` → 走 `createMockAiProvider`；`real` 且配置就绪 → 走 `createOpenAiCompatibleProvider({ baseUrl, apiKey, model })` 并**真实调用**；`real` 但配置 / 连接不就绪 → 抛 Task 1 定义的诚实错误（由 `processStage` 标记 `failed`）。为可测性，把 rewrite 的 provider 选择与执行抽成可单测的纯函数 / 工厂，不把分支逻辑埋死在 `App.vue` 的 `switch` 里。

**实现摘要：**

- 新建 `apps/desktop/src/composables/useRewriteProvider.ts`，导出纯函数 `selectRewriteProvider({ stageMode, providerConfigs, mockProvider })`，返回 `{ ok, provider }` 或 `{ ok: false, error: AiProviderError }`。
- 新建 `apps/desktop/src/composables/useRewriteProvider.test.ts`，覆盖 mock / not-connected / real 成功 / real 配置错误 / 非法 provider / 无 fallback 等 14 个场景。
- 修改 `apps/desktop/src/App.vue` 的 `executeStage` rewrite 分支：按 `runtime.getStageMode("rewrite")` 选择 provider；`real` 模式失败时抛出结构化错误，由 `processStage` 标记 `failed`。
- **Review Fix（2026-06-26）：** `selectRewriteProvider` 不再只取第一个 enabled provider，而是显式选择第一个 `enabled && (provider === "openai" || provider === "custom")` 的配置；若仅有非改写类 provider（whisper / cosyvoice / heygem）被启用，返回 `not-configured` 诚实错误。
- `deriveRewriteSellingPoints` 改为优先从 `draft.name` / `draft.notes` 提取候选卖点，缺省时退化为安全默认。
- 未修改 `useWorkflowRuntime.ts`：其 `stageModes` 默认仍全为 `"mock"`，无需调整即可保持默认行为不变。
- 同步更新根目录 `vitest.config.ts`，为 workspace 包添加与 Vite 一致的 alias，确保测试解析到源码而非陈旧的 `dist`。

**验证结果（2026-06-26）：**

```text
pnpm test apps/desktop/src/composables/useWorkflowRuntime.test.ts   13 passed
pnpm test apps/desktop/src/composables                              52 passed
pnpm --filter @mirax/desktop typecheck                              passed
pnpm typecheck                                                      passed
pnpm test                                                           164 passed
```

**验收标准：**

- [x] `getStageMode("rewrite") === "mock"` 时，rewrite 行为与现状逐字一致（固定文案、写 `notes`、`prep.updateMetadata`），现有相关测试不回归。
- [x] `getStageMode("rewrite") === "real"` 且存在「启用且为 OpenAI-compatible 的配置（`provider === "openai"` 或 `provider === "custom"`）+ 内存中有 `apiKey` + 有合法 `model` + 必要时 `baseUrl` 合法」时，executor 调用 `createOpenAiCompatibleProvider({ baseUrl, apiKey, model }).rewriteScript(...)` 发起**真实 LLM 调用**；调用失败时按 Task 1 契约返回结构化错误，由 `processStage` 标记 `failed`，**不 fallback 到 mock**。
- [x] `real` 但无启用配置 / 无 apiKey 时，返回 `not-configured` 诚实错误，不静默改用 mock。
- [x] provider 选择逻辑可被独立单测（输入 mode + 配置数组，断言选中的 provider 类型或「未就绪」原因）。
- [x] `sellingPoints` 不再硬编码，改为来自 `draft` 或 rewrite UI 输入；缺省时退化为安全默认，不抛错。
- [x] 默认 `stageModes` 仍使 rewrite 为 `mock`：未配置 / 未切换时 App 启动行为不变。

**允许修改文件：**

- 修改：`apps/desktop/src/App.vue`（`executeStage` 的 `rewrite` 分支改为按运行时模式路由；`useWorkflowRuntime` 传入 `stageModes`；把硬编码 `sellingPoints` 改为来自 draft / UI 的输入。其余阶段分支不动）
- 修改：`apps/desktop/src/composables/useWorkflowRuntime.ts`（如需，扩展按阶段选择 provider 的边界注释 / 类型；保持 `processStage` 失败处理语义不变）
- 可选创建：`apps/desktop/src/composables/useRewriteProvider.ts`（rewrite provider 选择工厂：输入 `stageMode` + 启用的 `ApiKeyProviderConfig`，输出 `AiProvider` 或结构化「未就绪」原因）
- 可选创建：`apps/desktop/src/composables/useRewriteProvider.test.ts`
- 修改：`apps/desktop/src/composables/useWorkflowRuntime.test.ts`（如调整了 runtime 契约，补对应测试）
- 修改：`docs/superpowers/plans/2026-06-26-real-rewrite-provider.md`、`docs/superpowers/PROJECT-STATE.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`、`.codex/dispatch-state.json`、`docs/人工提示词.md`
- `packages/provider-ai/src/mock.ts`（不改 mock 默认行为）
- `apps/desktop/src/components/workbench/stages/ScriptRewritingStage.vue`（UI 状态属 Task 4）
- 其余阶段（`transcribe / voice-clone / speech / avatar / compose / review / publish`）的 executor 分支

**验证命令：**

```bash
pnpm test apps/desktop/src/composables/useWorkflowRuntime.test.ts
pnpm test apps/desktop/src/composables
pnpm --filter @mirax/desktop typecheck
pnpm typecheck
```

**验收标准：**

- [ ] `getStageMode("rewrite") === "mock"` 时，rewrite 行为与现状逐字一致（固定文案、写 `notes`、`prep.updateMetadata`），现有相关测试不回归。
- [ ] `getStageMode("rewrite") === "real"` 且存在「启用且为 OpenAI-compatible 的配置（`provider === "openai"` 或 `provider === "custom"`）+ 内存中有 `apiKey` + 有合法 `model` + 必要时 `baseUrl` 合法」时，executor 调用 `createOpenAiCompatibleProvider({ baseUrl, apiKey, model }).rewriteScript(...)` 发起**真实 LLM 调用**；调用失败时按 Task 1 契约返回结构化错误，由 `processStage` 标记 `failed`，**不 fallback 到 mock**。
- [ ] `real` 但无启用配置 / 无 apiKey 时，返回 `not-configured` 诚实错误，不静默改用 mock。
- [ ] provider 选择逻辑可被独立单测（输入 mode + 配置数组，断言选中的 provider 类型或「未就绪」原因）。
- [ ] `sellingPoints` 不再硬编码，改为来自 `draft` 或 rewrite UI 输入；缺省时退化为安全默认，不抛错。
- [ ] 默认 `stageModes` 仍使 rewrite 为 `mock`：未配置 / 未切换时 App 启动行为不变。

**明确不做什么：**

- 不在 executor 内绕过 `OpenAiCompatibleProvider` 直接写 `fetch`（所有真实 HTTP 细节留在 `@mirax/provider-ai`）。
- 不改 mock provider 默认产物。
- 不一次性切换多个阶段的 stageMode。
- 不把 apiKey 传入日志或任何持久化路径（详见 Task 3）。
- 不引入自动重试 / 自动降级调度。

---

## Task 3：设计 API Key / baseUrl / model 配置读取边界

**状态：已完成。**

**目标：** 明确 rewrite 真实化时 provider 配置（`apiKey` / `baseUrl` / `model`）从哪里读、到哪里为止，确认敏感字段**不进入日志、snapshot、任务 payload**。读取源是 `useAppSettings().providerConfigs`（内存 `ref`，恢复后 `apiKey` 恒为空串，仅当前会话用户输入后内存可见）；落点只允许：rewrite executor 内存中的一次性 provider 构造参数。

**实现摘要：**

- 在 `useAppSettings.ts` 中新增并导出纯函数 `findEnabledRewriteProviderConfig(configs)`，明确「启用的 rewrite LLM 配置」选取规则：`enabled === true && (provider === "openai" || provider === "custom")`。
- `useRewriteProvider.ts` 的 `selectRewriteProvider` 改用上述函数选择配置，保持错误消息准确（区分「未启用任何 provider」与「启用的 provider 不适用于改写」）。
- **Review Fix（2026-06-26）：** `selectRewriteProvider` 在构造真实 provider 前，使用 `@mirax/core` 的 `sanitizeBaseUrlForStorage` 对 `config.baseUrl` 进行内存清洗：custom provider 必须提供合法 baseUrl，否则返回 `not-configured`；openai provider 的 baseUrl 可选，但若提供则必须合法；含 username/password/query/hash 的 baseUrl 会被清洗为 `origin + pathname` 后再传入 `createOpenAiCompatibleProvider`，避免敏感 token 进入真实请求 endpoint。
- `App.vue` 的 rewrite 分支添加安全边界注释，说明 `apiKey` / `baseUrl` 仅作为内存构造参数，`addLog` message 与 `prep.updateMetadata` 的 `title` / `description` 均来自受控的 LLM 结果或结构化错误，不含凭证。
- 未修改 `useAppSettings.ts` 的 `createSnapshot` / `restore` 与 `desktopDraft.ts` 的 sanitize 行为，仅补充测试与文档：
  - `useAppSettings.test.ts` 新增 `findEnabledRewriteProviderConfig` 选取规则测试（覆盖跨 provider 排序、disabled、非改写 provider 等场景）。
  - `desktopDraft.test.ts` 新增 `restoreDesktopDraft` 对旧数据中带 token/query/hash 的 `baseUrl` 的清洗回归测试。
- 创建 `docs/product-architecture/rewrite-credential-read-boundary.md`，记录读取源、允许落点、禁止落点与失败处理约定。

**验证结果（2026-06-26）：**

```text
pnpm test apps/desktop/src/composables/useRewriteProvider.test.ts   17 passed
pnpm test apps/desktop/src/composables/useAppSettings.test.ts       14 passed
pnpm test apps/desktop/src/runtime/desktopDraft.test.ts             4 passed
pnpm --filter @mirax/desktop typecheck                              passed
pnpm typecheck                                                      passed
```

**验收标准：**

- [x] rewrite 真实路径读取的 `apiKey` 仅存在于内存，且仅作为 `createOpenAiCompatibleProvider({ baseUrl, apiKey, model })` 的一次性参数；不写入任何 `ref` 持久化 / `localStorage` / draft。
- [x] `useAppSettings().createSnapshot()` 输出 JSON 中**不含** `apiKey` 字段（沿用 `sanitizeProviderConfigForStorage`），测试覆盖「新增 / 编辑 provider 后 snapshot 无 key」。
- [x] `addLog` 写入的 rewrite 相关 message 不含 apiKey、不含 baseUrl 中的 token；失败信息只暴露错误码 / 概要，不含完整 URL 与响应体。
- [x] `prep.updateMetadata` 的 `title` / `description` 来自 LLM 文案结果，不含凭证；`desktopDraft` 持久化不携带 provider apiKey。
- [x] 「启用的 rewrite LLM 配置」的选取规则明确：
  - `enabled === true`；
  - `provider === "openai"` 或 `provider === "custom"`；
  - `apiKey` 非空；
  - `model` 非空且合法（由 `validateProviderConfig` 校验）；
  - 当 `provider === "custom"` 时，`baseUrl` 必须非空且经过 `sanitizeBaseUrlForStorage` 校验为合法 URL；
  - 当 `provider === "openai"` 时，`baseUrl` 可选，缺省使用官方 OpenAI endpoint（内存默认值）；
  - 任一不满足即视为 `not-configured`。

**允许修改文件：**

- 修改：`apps/desktop/src/App.vue`（解构并读取 `providerConfigs` 用于 rewrite；确保传入 `addLog` 的 message、`prep.updateMetadata` 的 `title` / `description` 不含 apiKey 或 baseUrl token）
- 修改：`apps/desktop/src/composables/useAppSettings.ts`（如需，新增「选出当前启用的 rewrite LLM 配置」的只读 getter；不改 `createSnapshot` 的 sanitize 行为）
- 修改：`apps/desktop/src/composables/useAppSettings.test.ts`（补充 snapshot 不含 `apiKey` 的回归断言，覆盖新增 getter）
- 修改：`apps/desktop/src/runtime/desktopDraft.ts`（仅确认 draft 不携带 provider apiKey；如已满足则只加注释 / 测试）
- 可选修改：`apps/desktop/src/runtime/desktopDraft.test.ts`
- 可选创建：`docs/product-architecture/rewrite-credential-read-boundary.md`
- 修改：`docs/superpowers/plans/2026-06-26-real-rewrite-provider.md`、`docs/superpowers/PROJECT-STATE.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`、`.codex/dispatch-state.json`、`docs/人工提示词.md`
- `packages/core/src/validation.ts` 中 `sanitizeProviderConfigForStorage` / `sanitizeBaseUrlForStorage` 的既有行为（只可复用，不可削弱）
- 任何把 apiKey 写入 `localStorage` / SQLite / fixture 的改动

**验证命令：**

```bash
pnpm test apps/desktop/src/composables/useAppSettings.test.ts
pnpm test apps/desktop/src/runtime/desktopDraft.test.ts
pnpm --filter @mirax/desktop typecheck
pnpm typecheck
```

**验收标准：**

- [ ] rewrite 真实路径读取的 `apiKey` 仅存在于内存，且仅作为 `createOpenAiCompatibleProvider({ baseUrl, apiKey, model })` 的一次性参数；不写入任何 `ref` 持久化 / `localStorage` / draft。
- [ ] `useAppSettings().createSnapshot()` 输出 JSON 中**不含** `apiKey` 字段（沿用 `sanitizeProviderConfigForStorage`），测试覆盖「新增 / 编辑 provider 后 snapshot 无 key」。
- [ ] `addLog` 写入的 rewrite 相关 message 不含 apiKey、不含 baseUrl 中的 token；失败信息只暴露错误码 / 概要，不含完整 URL 与响应体。
- [ ] `prep.updateMetadata` 的 `title` / `description` 来自 LLM 文案结果，不含凭证；`desktopDraft` 持久化不携带 provider apiKey。
- [ ] 「启用的 rewrite LLM 配置」的选取规则明确：
  - `enabled === true`；
  - `provider === "openai"` 或 `provider === "custom"`；
  - `apiKey` 非空；
  - `model` 非空且合法（由 `validateProviderConfig` 校验）；
  - 当 `provider === "custom"` 时，`baseUrl` 必须非空且经过 `sanitizeBaseUrlForStorage` 校验为合法 URL；
  - 当 `provider === "openai"` 时，`baseUrl` 可选，缺省使用官方 OpenAI endpoint（内存默认值）；
  - 任一不满足即视为 `not-configured`。

**明确不做什么：**

- 不实现 keychain / OS 安全存储（本阶段 apiKey 仅会话内存；持久化安全存储留待后续专项）。
- 不放宽既有 sanitize / snapshot 规则。
- 不把 baseUrl / apiKey 打进任何遥测、控制台日志或错误上报。
- 不修改发布凭证（`credentialRef`）相关逻辑。

---

## Task 4：设计 ScriptRewritingStage 的真实 / 未接入 / 失败状态

**状态：已完成。**

**目标：** 让 `ScriptRewritingStage.vue` 据运行时能力模式与执行结果，诚实呈现四种表现：**mock**（当前固定文案行为，可标注「Mock 结果」）、**real 未接入 / 未配置**（提示「真实 LLM 未接入，请在设置中配置并启用 provider」，「重新生成」按钮禁用或点击后诚实报错，不产出文案）、**real 失败**（展示 Task 1 错误码对应的友好信息，不记录版本、不显示「已生成」）、**real 成功**（正常展示并记录版本）。核心红线：real 未接入 / 失败时**绝不**调用 `addVersion`、绝不把 mock 文案当真实结果。

**实现摘要：**

- 修改 `apps/desktop/src/components/workbench/stages/ScriptRewritingStage.vue`：新增 props `mode?: WorkflowStageRuntimeMode` 与 `errorMessage?: string`；新增 computed `isMock` / `isReal` / `isNotConnected` / `hasError` / `canRun` / `modeLabel` / `resultPlaceholder`；`textarea` 在 `isNotConnected` 时禁用，`resultPlaceholder` 在未接入时提示无法生成；生成按钮 `canRun` 在未接入时禁用。
- 新增四态 UI 横幅：
  - `not-connected`：黄色警告条「真实 LLM 未连接。请在设置中配置并启用 OpenAI-compatible provider 后再试。」
  - `real` 失败：红色错误条显示来自父组件的安全错误摘要。
  - `real` 进行中 / 未成功：蓝色信息条提示「真实 LLM 模式：将使用设置中启用的 provider 发起真实调用。」
  - `mock` 或 `mode` 缺省：标题旁显示「Mock 结果」徽章。
- 版本记录条件收敛：原 watcher 无条件在 `status: running → completed` 且 `notes` 非空时 `addVersion`；现在由纯函数 `shouldRecordVersion(prev, next, script, mode)` 决定，只有 `mode === "mock"` / `"real"` / `undefined` 且 `script` 非空时才记录；`not-connected` 完成时不记录版本。
- 新建 `apps/desktop/src/components/workbench/stages/scriptRewritingStage.utils.ts` 导出 `shouldRecordVersion`，把 Vue 无关逻辑抽成可单测纯函数，避免为静态断言引入 `@vue/test-utils`。
- 新建 `apps/desktop/src/components/workbench/stages/ScriptRewritingStage.test.ts`：6 条 `shouldRecordVersion` 测试覆盖 mock / real / not-connected / 空脚本 / 非 running / 非 completed；6 条静态 UI 契约测试覆盖「Mock 结果」文案、未连接提示、真实模式提示、错误横幅、模板中无 apiKey/baseUrl/token/sk- 字面量、未连接时禁用输入区与生成按钮。
- 修改 `apps/desktop/src/App.vue`：新增 `rewriteErrorMessage` ref；`rewriteMode` computed 取自 `runtime.getStageMode("rewrite")`；执行前清空错误，provider 选择失败或真实调用失败时写入 `rewriteErrorMessage` 并继续抛出由 `processStage` 标记 `failed`；将 `mode` 与 `error-message` 传入 `<ScriptRewritingStage />`。未修改其他阶段或 executor 分支。

**验证结果（2026-06-26）：**

```text
pnpm test apps/desktop/src/components/workbench                                  21 passed
pnpm --filter @mirax/desktop typecheck                                           passed
pnpm --filter @mirax/desktop build:web                                           passed
pnpm typecheck                                                                   passed
pnpm test                                                                        187 passed
git diff --check                                                                 no output
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md .codex/dispatch-state.json docs/人工提示词.md  no output
```

**允许修改文件：**

- 修改：`apps/desktop/src/components/workbench/stages/ScriptRewritingStage.vue`（新增能力模式 / 未接入 / 失败状态的 props 与展示；失败态错误条；real 未配置时禁用生成入口；版本仅在 real 成功或 mock 时记录）
- 修改：`apps/desktop/src/App.vue`（向 `ScriptRewritingStage` 传入 rewrite 的能力模式与最近一次错误信息；不改其他阶段模板绑定）
- 可选创建：`apps/desktop/src/components/workbench/stages/ScriptRewritingStage.test.ts`（覆盖四种状态渲染与「real 失败不记录版本」）
- 可选创建：`apps/desktop/src/components/workbench/stages/scriptRewritingStage.utils.ts`
- 修改：`docs/superpowers/plans/2026-06-26-real-rewrite-provider.md`、`docs/superpowers/PROJECT-STATE.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`、`.codex/dispatch-state.json`、`docs/人工提示词.md`
- 其余 7 个 stage 组件（`MaterialParsingStage` / `VoiceCloningStage` / `SpeechSynthesisStage` / `AvatarGenerationStage` / `VideoCompositionStage` / `ContentReviewStage` / `PublishStage`）
- `packages/provider-ai`、`packages/core`（UI Task 不改包契约）

**验证命令：**

```bash
pnpm test apps/desktop/src/components/workbench
pnpm --filter @mirax/desktop typecheck
pnpm --filter @mirax/desktop build:web
pnpm typecheck
```

**验收标准：**

- [x] mock 模式：渲染与交互与现状一致（固定文案、版本历史、对比功能可用）；若加「Mock 结果」标注，不得阻断现有流程。
- [x] real 未配置 / 未连接：显示明确「真实能力未接入」提示并指向设置页；「重新生成」禁用或点击后只产出诚实错误，**不**写入 `notes`、**不**记录版本。
- [x] real 失败（`status === "failed"`）：展示对应错误码的友好信息（来自 executor / 日志），保留用户输入与原始文案可见以便重试；**不**记录版本、**不**显示「已生成」。
- [x] real 成功：正常展示改写结果并记录会话级版本；版本记录条件从「`running → completed`」收敛为「`running → completed` 且当前为 mock 或 real 成功」，杜绝把失败 / 未接入误记为版本。
- [x] 组件不暴露 apiKey / baseUrl；错误展示不渲染敏感字段。

**明确不做什么：**

- 不伪造「真实能力已接入」的成功态。
- 不在 real 未接入时用 mock 文案填充结果区。
- 不改其他阶段 UI。
- 不新增与 rewrite 无关的视觉重构（YAGNI）。

---

## Task 5：测试与验收计划

**状态：未开始（待派工）。**

**目标：** 为 rewrite 真实化提供完整的自动化与手动验收，确保：mock 默认路径零回归、real 路径在「配置就绪 / 未配置 / 失败」三态下行为正确、敏感字段不外泄、CI 不联网仍全绿。本 Task 在 Task 1–4 完成后做整体收尾验收，并在缺口处补测。

**允许修改文件：**

- 修改 / 创建：`packages/provider-ai/tests/*`（rewrite 真实契约与错误码、连接测试断言的缺口补齐）
- 修改 / 创建：`apps/desktop/src/composables/useRewriteProvider.test.ts`、`apps/desktop/src/composables/useWorkflowRuntime.test.ts`、`apps/desktop/src/composables/useAppSettings.test.ts`
- 修改 / 创建：`apps/desktop/src/components/workbench/stages/ScriptRewritingStage.test.ts`
- 创建：浏览器交互校验脚本（如 `/tmp/mirax-rewrite-real-check.js`，验证 mock 默认与 real 未配置诚实提示；临时脚本，不入 Git）
- 修改：`docs/superpowers/plans/2026-06-26-real-rewrite-provider.md`、`docs/superpowers/PROJECT-STATE.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`、`.codex/dispatch-state.json`、`docs/人工提示词.md`
- 任何把真实 apiKey 写入仓库测试 fixture 的改动
- 让测试联网访问真实 LLM 服务的改动

**验证命令：**

```bash
pnpm test
pnpm typecheck
pnpm --filter @mirax/desktop build:web

# 受保护文件检查（应无输出）
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md .codex/dispatch-state.json docs/人工提示词.md
```

**验收标准：**

- [ ] 单测覆盖 provider 层：rewrite 成功 / `unauthorized` / `network` / `bad-response` / `not-configured` / `not-connected`，全部用 fake transport，不联网。
- [ ] 单测覆盖桌面端：provider 选择工厂三态（mock / real 就绪 / real 未就绪）、snapshot 无 apiKey、`ScriptRewritingStage` 四状态。
- [ ] mock 默认路径全链路零回归：未配置任何 provider 时 App 启动与 rewrite 行为与合并前一致。
- [ ] `pnpm test`、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web` 全绿；CI（`ci.yml`）在不联网环境通过。
- [ ] 手动 / 脚本验收记录：real 未配置时诚实提示、real 失败时不记录版本、日志与 UI 不含凭证。
- [ ] 受保护文件 `git diff` 检查无输出。

**明确不做什么：**

- 不把真实可用的 apiKey 提交进仓库或 CI secret 用于联网测试。
- 不依赖外部 LLM 服务做 CI 断言。
- 不为本阶段引入 E2E / 真机发布测试。
- 不扩大验收范围到其他真实化阶段。

---

## 计划完成标准

1. `docs/superpowers/plans/2026-06-26-real-rewrite-provider.md` 已存在，包含 Task 1–5 的完整目标、允许 / 禁止修改文件、验证命令、验收标准与明确不做什么。
2. `docs/superpowers/PROJECT-STATE.md` 已更新：记录 PR #3 已合并（merge `60b6cd3`，CI passed）、阶段 5 P0 完成、下一阶段进入 rewrite 真实 LLM provider 规划，并把最新计划入口指向本文件。
3. 全局约束重申不修改 `legacy-ui-gap-list.md`、`.codex/dispatch-state.json`、`docs/人工提示词.md`。
4. 本次派工未实现任何真实 OpenAI 调用、未修改任何 `packages/*` / `apps/*` 源码。
5. 验证命令覆盖 `pnpm test`、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web` 与受保护文件 diff 检查。

---

## 验证汇总

```bash
# 计划文档存在性与 Task 完整性
rg -n 'Rewrite 阶段接入 OpenAI-compatible LLM Provider 实施规划' docs/superpowers/plans/2026-06-26-real-rewrite-provider.md
echo "Task 列表:" && rg -n '^## Task [1-5]：' docs/superpowers/plans/2026-06-26-real-rewrite-provider.md

# 受保护文件检查（应无输出）
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md .codex/dispatch-state.json docs/人工提示词.md

# 本次改动范围（应仅含两份文档）
git status --short

# 文档空白 / 冲突标记检查
git diff --check
```

# 真实能力接入前置基础设施与执行顺序规划

> **规划文档，非实现计划。** 本文档用于对齐下一阶段工作范围、顺序与验收标准；具体源码实现需等每个 Task 单独派工后按本规划执行。

**目标：** 在接入真实 AI / 语音克隆 / 数字人 / 视频渲染 / 平台发布之前，先补齐 CI、Provider 配置与调用边界、sidecar / 本地依赖检测、真实媒体产物路径与错误状态、工作台真实化顺序、发布自动化安全边界与失败恢复等前置基础设施与规划，并落地最小可执行的 CI。

**总体优先级：** 先 CI 与基础设施边界，再接真实 AI / 语音 / 数字人 / 视频 / 发布。每个 Task 独立验收，不得夹带未规划源码实现。

**技术栈：** pnpm workspace、TypeScript、Vue 3、Vite、Tauri 2、Vitest、GitHub Actions、SQLite（`@mirax/local-store`）、FFmpeg、CosyVoice、HeyGem、Playwright。

---

## 全局约束

1. 不得修改 `docs/reverse-engineering/legacy-ui-gap-list.md`。
2. 不得修改 `.codex/dispatch-state.json`。
3. 默认不 `git commit`、不 `git push`，由总控统一 review、验证、提交。
4. API Key、Token、Cookie、凭证明文不得进入日志、snapshot、任务 payload、测试 fixture 或 Git。
5. 未真实调用的能力必须保持诚实空态，不伪造文件、时长、分辨率、成功率。
6. 阶段 5 P0 完成前，工作台 UI 仍保留 mock provider 作为默认路径，真实 provider 仅作为可配置开关存在。

---

## Task 1：补 GitHub Actions CI

**状态：已完成。** CI workflow 已落地为 `.github/workflows/ci.yml`，覆盖 `push` 到 `main` 与所有 PR。

**目标：** 建立仓库级 CI，在每次 push / PR 时自动跑 `pnpm test`、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web`，并确保 CI 环境与本地开发环境一致。CI 通过是阶段 5 后续 Task 合并的前置条件。

**允许修改文件：**

- 创建：`.github/workflows/ci.yml`
- 修改：`package.json`（仅新增/调整 CI 所需 scripts，如 `test`、`typecheck`、`build:web` 的别名或并发参数）
- 修改：`.nvmrc` 或 `package.json > engines`（如 Node 版本约束缺失）
- 修改：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`（本计划 Task 1 checkbox/验证结果）
- 修改：`docs/superpowers/PROJECT-STATE.md`（当前阶段 / 最新可执行任务）

**禁止修改文件：**

- `apps/`、`packages/` 源码（Task 1 只新增 CI 与配置，不修改业务代码；若 CI 暴露既有问题，先记录后单独 Task 修复）。
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

**验证命令：**

```bash
# 本地预演 CI 步骤
pnpm install
pnpm test
pnpm typecheck
pnpm --filter @mirax/desktop build:web

# GitHub Actions 触发后检查
gh run list --workflow=ci.yml --limit 5
gh run view <run-id>
```

**验收标准：**

1. `.github/workflows/ci.yml` 存在，触发条件至少覆盖 `push` 到 `main` 与所有 PR。
2. CI job 按顺序或并发执行：install → `pnpm test` → `pnpm typecheck` → `pnpm --filter @mirax/desktop build:web`。
3. 所有命令在 CI 环境中退出码为 0；若失败，必须明确报错步骤与日志链接。
4. CI 不访问外部 AI/语音/数字人/FFmpeg/平台真实服务；仅使用仓库内 mock 与单元测试。
5. `package.json` 中相关 scripts 名称与 CLAUDE.md 常用命令一致，无破坏性改动。

**明确不做什么：**

- 不接入真实 AI / 语音 / 数字人 / 视频 / 发布服务。
- 不新增测试文件（Task 1 只搭 CI；若发现既有测试不足，记录到后续 Task）。
- 不修改源码以“让 CI 通过”——除非源码修改属于已规划 Task。
- 不配置 release、签名、DMG 打包或 Tauri 真实构建（仅需 `build:web`，不涉及 Rust）。

---

## Task 2：梳理 Provider 配置与真实调用边界

**目标：** 明确 AI Provider（`@mirax/provider-ai`）与发布 Provider（`@mirax/provider-publish`）从 mock 切换到真实调用的配置、凭证管理、调用边界与日志规范，确保 API Key 等敏感信息不进日志、不进 snapshot、不进任务 payload。

**允许修改文件：**

- 修改：`packages/provider-ai/src/types.ts`（明确 provider 配置字段、凭证引用字段）
- 修改：`packages/provider-ai/src/openAiCompatible.ts`（仅补充真实调用边界设计/TODO，不实现完整网络调用）
- 修改：`packages/provider-ai/src/connectionTest.ts`（扩展连接测试输入/输出契约）
- 修改：`packages/provider-publish/src/types.ts`（明确 publisher 配置、账号状态、凭证引用字段）
- 修改：`packages/core/src/providerConfig.ts` 或同目录相关类型文件（如存在）
- 修改：`apps/desktop/src/composables/useAppSettings.ts`（仅梳理 `providerConfigs` 持久化规则，确保 API Key 不进入 `createSnapshot`）
- 修改：`apps/desktop/src/runtime/desktopDraft.ts`（仅梳理 draft 中 provider 配置规则，沿用 `sanitizeDesktopDraftForStorage`）
- 修改：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`（本计划 Task 2 checkbox/验证结果）
- 修改：`docs/superpowers/PROJECT-STATE.md`
- 可选创建：`docs/product-architecture/provider-credential-boundary.md`（边界设计说明文档）

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- 直接修改 UI 组件以“预实现”真实 provider 调用。

**验证命令：**

```bash
pnpm test packages/provider-ai/tests
pnpm test packages/provider-publish/tests
pnpm --filter @mirax/desktop typecheck
pnpm typecheck
```

**验收标准：**

1. `ApiKeyProviderConfig` / `OpenAiCompatibleProviderOptions` 中 API Key 字段类型明确；持久化接口使用 `credentialRef` 或内存字段，snapshot 中不保存明文。
2. `useAppSettings.ts` 的 `createSnapshot` 输出 JSON 中不包含 `apiKey` 字段；回归测试覆盖新增/编辑 provider 后 snapshot 无 key。
3. `connectionTest.ts` 的输入/输出契约能区分 `mock` 与 `openai-compatible`，且 `openai-compatible` 模式在 MVP 阶段返回“尚未接入”的诚实错误。
4. 日志/错误信息规范明确：禁止打印 API Key、base URL 中的 token、完整响应体；允许打印 provider id、model、状态码范围。
5. 真实调用边界文档（或在代码注释/TODO 中）说明：
   - 哪些阶段由 `AiProvider` 提供服务；
   - 哪些字段进入 provider 输入；
   - 失败时返回的错误结构（`{ ok: false, message: string }` 或异常）。

**明确不做什么：**

- 不实现真实的 OpenAI /  Claude / 其他 LLM 网络调用。
- 不实现真实的语音克隆、语音合成、数字人视频生成网络调用。
- 不将 API Key 明文写入 `.env`、配置文件或测试 fixture。
- 不修改发布账号登录/授权流程（属于 Task 6）。

---

## Task 3：梳理 sidecar / 本地依赖检测

**目标：** 明确 FFmpeg、CosyVoice、HeyGem、Playwright 四类本地依赖的检测方式、配置来源、健康检查输出与 UI 状态映射，使设置页“本地依赖”能反映真实环境，而不是只保存字符串。

**允许修改文件：**

- 修改：`packages/sidecar-manager/src/config.ts`（扩展 `SidecarConfig` 字段，如 `cosyVoiceMode`、`heygemMode`、`playwrightBrowserName` 等可选字段）
- 修改：`packages/sidecar-manager/src/dependencyChecks.ts`（将“字符串非空检查”升级为“可执行文件/可访问服务检查”的接口设计，保留现有简单检查作为 fallback）
- 修改：`packages/sidecar-manager/src/serviceStatus.ts`（明确服务健康轮询契约）
- 修改：`packages/sidecar-manager/tests/dependency-checks.test.ts`（补充契约/边界测试，不依赖真实本地服务）
- 修改：`apps/desktop/src/components/settings/LocalDependenciesSettings.vue`（仅调整 UI 状态映射，不实现真实文件选择器或服务启动）
- 修改：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`
- 修改：`docs/superpowers/PROJECT-STATE.md`
- 可选创建：`docs/product-architecture/sidecar-health-check-boundary.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- 直接调用 Tauri fs/shell 或 Node `child_process` 以“真实启动/检测”sidecar（接口设计阶段不落地真实调用）。

**验证命令：**

```bash
pnpm test packages/sidecar-manager/tests
pnpm --filter @mirax/desktop typecheck
pnpm typecheck
```

**验收标准：**

1. `DependencyCheckInput` / `DependencyCheckResult` 能表达：未配置、已配置但不可访问/不可执行、已就绪三种状态。
2. 每个依赖有清晰的“检测接口”与“运行接口”分层：
   - 检测：验证路径/URL/浏览器是否存在且可访问；
   - 运行：启动/停止服务（本 Task 只设计接口，不实现）。
3. 设置页每张卡只显示自身状态 pill（已就绪 / 需配置 / 未就绪），不重复展示全局清单。
4. 测试覆盖：缺失路径返回 `ok: false`；格式错误的 URL 返回明确 message；状态字符串不暴露本地文件绝对路径（仅 UI 展示需要时由桌面端安全获取）。
5. 文档明确说明：
   - FFmpeg 检测为“可执行文件存在 + `ffmpeg -version` 可返回版本”；
   - CosyVoice / HeyGem 检测为“HTTP 健康端点可达或本地进程端口监听”；
   - Playwright 检测为“指定浏览器已安装”。

**明确不做什么：**

- 不实现真实 FFmpeg 调用。
- 不实现真实 CosyVoice / HeyGem 服务启动、停止、端口探测。
- 不实现 Playwright 浏览器自动安装。
- 不修改工作台运行逻辑以依赖 sidecar 状态。

---

## Task 4：设计真实媒体产物路径与错误状态

**目标：** 明确 `@mirax/media-pipeline` 与 `@mirax/core` 中视频、音频、数字人视频、成片、封面的真实产物路径规则、文件存在性校验、错误状态与 UI 展示规范，不伪造文件、时长、分辨率、码率。

**允许修改文件：**

- 修改：`packages/media-pipeline/src/types.ts`（明确 `MediaRenderer` 输入/输出、产物路径、错误类型）
- 修改：`packages/media-pipeline/src/mockRenderer.ts`（让 mock renderer 的产物路径与真实路径规则一致，但仍不实际调用 FFmpeg）
- 修改：`packages/media-pipeline/src/ffmpegCommands.ts`（补充命令构建辅助函数的输入校验与错误处理设计）
- 修改：`packages/media-pipeline/tests/ffmpeg-commands.test.ts`（补充路径/错误边界测试）
- 修改：`packages/core/src/projectDraft.ts` 或同目录相关类型文件（明确 `ProjectDraft` 中产物字段语义与校验）
- 修改：`apps/desktop/src/composables/useWorkflowRuntime.ts`（仅明确产物传递与错误处理边界，不改动 mock executor 行为）
- 修改：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`
- 修改：`docs/superpowers/PROJECT-STATE.md`
- 可选创建：`docs/product-architecture/media-artifact-path-design.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- 直接修改 Workbench stage UI 以“假装”真实产物已生成。

**验证命令：**

```bash
pnpm test packages/media-pipeline/tests
pnpm test apps/desktop/src/composables/useWorkflowRuntime.test.ts
pnpm --filter @mirax/desktop typecheck
pnpm typecheck
```

**验收标准：**

1. 每个产物类型有明确路径字段：`audioPath`、`avatarVideoPath`、`finalVideoPath`、`coverPath`，并区分“绝对路径 / 项目相对路径 / URL”。
2. 产物状态机：`pending`（未生成）→ `running`（生成中）→ `ready`（文件存在且可访问）→ `failed`（错误信息）→ `stale`（文件被删除或路径失效）。
3. 产物元数据仅展示真实可获取项：文件名、生成时间、路径；不伪造时长、分辨率、码率、文件大小。若需要展示，必须从文件或渲染器真实输出中读取。
4. 错误状态设计：
   - 前置产物缺失时抛出/返回诚实错误（如“缺少音频，无法生成数字人视频”）；
   - 渲染器失败时返回 `{ ok: false, error: { code, message, stageId } }`；
   - UI 展示错误时不隐藏原输入，允许用户重试或修改参数。
5. `mockRenderer` 的路径输出遵循真实规则（如按 `outputRoot/<projectId>/<stage>/...` 组织），且测试验证路径非空、可解析。

**明确不做什么：**

- 不实际调用 FFmpeg 或生成真实媒体文件。
- 不伪造 `durationSeconds`、`width`、`height`、`bitrate`、`fileSize`。
- 不将产物路径持久化到 localStorage（超出当前草案设计范围，除非单独规划）。
- 不实现真实文件系统监听或自动重试。

---

## Task 5：设计工作台各阶段从 mock 到真实能力的接入顺序

**目标：** 制定 Workbench 8 个阶段（`transcribe → rewrite → voice-clone → speech → avatar → compose → review → publish`）从 mock 切换到真实能力的安全顺序、依赖检查点与降级策略，确保每次只替换一个阶段，失败时可回退到 mock 或保持诚实错误。

**允许修改文件：**

- 修改：`packages/core/src/workflow.ts` 或同目录相关文件（明确阶段依赖、前置产物检查函数）
- 修改：`apps/desktop/src/composables/useWorkflowRuntime.ts`（增加 provider/runtime 选择逻辑设计，保留 mock 为默认）
- 修改：`apps/desktop/src/components/workbench/stages/*.vue`（仅调整 stage 组件对“真实能力未接入”的状态展示，不实现真实调用）
- 修改：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`
- 修改：`docs/superpowers/PROJECT-STATE.md`
- 可选创建：`docs/product-architecture/workbench-real-capability-rollout.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- 一次性替换多个阶段的真实能力。

**验证命令：**

```bash
pnpm test apps/desktop/src/composables/useWorkflowRuntime.test.ts
pnpm --filter @mirax/desktop typecheck
pnpm typecheck
```

**验收标准：**

1. 阶段接入顺序文档化，建议顺序为：
   1. `rewrite`（纯文本，风险最低，可配置 OpenAI-compatible LLM）。
   2. `speech`（文本 → 音频，依赖 `voice-clone` 或预置 voiceId，可用 CosyVoice）。
   3. `voice-clone`（样本 → voiceId，真实能力前可先验证样本文件）。
   4. `transcribe`（视频 → 文案，依赖 FFmpeg/Whisper）。
   5. `avatar`（音频 + 形象 → 数字人视频，依赖 HeyGem 或同类服务）。
   6. `compose`（数字人视频 + 音频 + 字幕/BGM → 成片，依赖 FFmpeg）。
   7. `review`（人工复核，无真实能力切换，仅状态校验）。
   8. `publish`（发布交接，见 Task 6）。
2. 每个阶段切换真实能力前必须满足的依赖检查点：
   - Provider 配置已启用且连接测试通过；
   - 所需 sidecar 依赖已就绪；
   - 前置阶段产物状态为 `ready`；
   - 当前阶段输入参数通过 `validateProjectDraft` 校验。
3. `useWorkflowRuntime` 支持按阶段选择 provider：mock 或真实；真实 provider 未接入时返回诚实错误，不 fallback 到 mock 自动伪造。
4. 阶段组件 UI 明确区分：mock 结果 / 真实结果 / 未接入 / 错误；不隐藏“未接入”提示。
5. 每个阶段的真实化工作拆分为独立 future Task，不在本 Task 中实现。

**明确不做什么：**

- 不实现任何阶段的真实网络/本地服务调用。
- 不修改 mock provider 默认行为（真实 provider 仅作为可配置开关）。
- 不一次性替换多个阶段。
- 不伪造“真实能力已接入”的 UI 状态。

---

## Task 6：设计发布自动化的账号、凭证、安全边界与失败恢复

**目标：** 明确 `Publisher` 从 mock publisher 切换到真实平台发布的账号管理、凭证存储、安全边界、失败恢复与任务状态机，确保平台登录/授权凭证不进入 Git、不进入任务 payload、不通过 mock 绕过真实授权。

**允许修改文件：**

- 修改：`packages/provider-publish/src/types.ts`（明确 `PublishAccount` 凭证引用、`Publisher` 授权/发布/状态查询接口）
- 修改：`packages/provider-publish/src/platformProfiles.ts`（补充各平台授权方式、draft 支持、最大文件/时长限制）
- 修改：`packages/provider-publish/src/mockPublisher.ts`（让 mock 返回更真实的任务生命周期与失败原因，仍不实际调用平台）
- 修改：`packages/local-store/src/schema.ts`（明确 `publish_accounts` 表字段，凭证字段改为 `credential_ref` 或外键引用）
- 修改：`packages/local-store/src/repositories.ts`（如需要，仅调整 `publishAccounts` 接口签名）
- 修改：`apps/desktop/src/features/accounts/mockAccounts.ts`（扩展账号视图模型，区分真实/模拟账号状态）
- 修改：`apps/desktop/src/views/AccountManagementView.vue`（仅调整账号状态展示与授权 handoff UI，不实现真实 OAuth）
- 修改：`apps/desktop/src/features/task-center/publishTaskStore.ts`（明确任务状态机与失败重试字段）
- 修改：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`
- 修改：`docs/superpowers/PROJECT-STATE.md`
- 可选创建：`docs/product-architecture/publish-automation-security-design.md`

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- 直接实现平台 OAuth / Cookie / Token 自动获取或绕过官方登录。

**验证命令：**

```bash
pnpm test packages/provider-publish/tests
pnpm test apps/desktop/src/features/task-center/publishTaskStore.test.ts
pnpm test apps/desktop/src/composables/usePublishPreparation.test.ts
pnpm --filter @mirax/desktop typecheck
pnpm typecheck
```

**验收标准：**

1. `PublishAccount` 中敏感字段不保存明文：使用 `credentialRef` 指向 keychain/安全存储/本地加密 store；schema 中不出现 `cookie`、`token`、`password` 明文列。
2. 发布任务状态机扩展为：`pending → submitted → processing → completed / failed / cancelled / retryable`；失败时记录 `errorCode`、`errorMessage`、`failedAt`、`retryCount`。
3. 失败恢复设计：
   - 凭证过期 → 标记 `reauthorize`，引导用户重新授权；
   - 网络/平台限流 → 标记 `retryable`，支持延迟重试；
   - 视频格式不符 → 标记 `failed`，提供平台限制说明；
   - 用户取消 → 标记 `cancelled`，不可自动重试。
4. `Publisher.publish` 接口明确区分：
   - 输入：`PublishHandoffInput`（不含凭证，仅含 videoPath / metadata / platformIds / mode）；
   - 内部通过账号 `credentialRef` 获取凭证；
   - 输出：`PublishHandoffResult` 包含 per-platform 子结果与任务 ID 列表。
5. mock publisher 返回更真实的失败场景（如“账号未授权”“平台草稿模式不支持”），不伪装成功。
6. 文档明确：
   - 哪些平台支持 direct / draft；
   - 授权方式（OAuth、二维码、Cookie 导入等）为运行障碍，只记录不绕过；
   - 真实发布需要 Playwright 浏览器或平台官方 API。

**明确不做什么：**

- 不实现真实平台 OAuth / 登录 / Cookie 获取。
- 不将平台 Cookie / Token 明文写入 SQLite、localStorage 或测试 fixture。
- 不通过 mock 返回“发布成功”来绕过未实现的平台授权。
- 不实现自动重试调度器（仅设计字段与状态机）。

---

## 计划完成标准

1. `docs/superpowers/PROJECT-STATE.md` 已更新，记录 PR #2 合并与阶段 5 P0 入口。
2. `docs/superpowers/plans/2026-06-25-real-capability-foundation.md` 已存在，包含 Task 1–6 的完整目标、允许/禁止修改文件、验证命令、验收标准与明确不做什么。
3. 全局约束中重申不修改 `docs/reverse-engineering/legacy-ui-gap-list.md` 与 `.codex/dispatch-state.json`。
4. 未实现任何真实 AI / 语音 / 数字人 / 视频 / 发布源码；Task 1 仅落地 CI 配置。
5. 验证命令列表已覆盖 `pnpm test`、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web`、受保护文件 diff 检查。

---

## 验证汇总

```bash
# 全仓自动验证
pnpm test
pnpm typecheck
pnpm --filter @mirax/desktop build:web

# 受保护文件检查
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md .codex/dispatch-state.json

# 新计划与状态文件检查
git status --short
rg -n '真实能力接入前置基础设施与执行顺序' docs/superpowers/plans/2026-06-25-real-capability-foundation.md
echo "Task 列表:" && rg -n '^## Task [1-6]:' docs/superpowers/plans/2026-06-25-real-capability-foundation.md
```

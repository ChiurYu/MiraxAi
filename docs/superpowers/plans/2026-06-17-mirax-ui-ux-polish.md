# 阶段 4 P0.5：Mirax AI UI/UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在阶段 4 三个 P0 功能计划完成后，对 Mirax AI 桌面端的工作台、设置、Provider、sidecar、发布准备和 mock 任务流程做一次统一 UI/UX polish，让产品从“可用”推进到“愿意长期使用”。

**Architecture:** 本计划不新增核心业务能力，不改变 P0 的 mock 边界，不接入真实平台发布。它只在既有 P0 功能之上统一信息架构、视觉层级、状态表达、响应式布局、空/错/运行状态和页面验收标准。执行时允许使用 `ui-ux-pro-max` 做设计判断，但每个改动必须落回可验证的源码和浏览器检查。

**Tech Stack:** Vue 3、Vite、Tauri desktop webview、lucide-vue-next、现有 `apps/desktop/src/styles.css` design tokens、Playwright/browser smoke。

---

## Resume Here

**当前计划状态：** 已完成。阶段 4 P0.5 UI/UX polish Task 1 → Task 5 已全部完成并通过验收，不要重复执行。

**执行前置条件：**
- `docs/superpowers/plans/2026-06-17-mirax-workbench-workflow-architecture.md` 已完成。
- `docs/superpowers/plans/2026-06-17-mirax-settings-provider-sidecar.md` 已完成。
- `docs/superpowers/plans/2026-06-17-mirax-publish-prep-mock-tasks.md` 已完成。
- 当前分支已通过 P0 全量验证。

**同步优化原则：**
- P0 执行期间允许做阻塞型 UI 修复：页面打不开、按钮不可用、阶段缺失、状态不可见、明显重复主操作、布局重叠。
- P0 执行期间不要做大范围视觉重构；把非阻塞 UI 建议登记到本计划。
- 本计划执行时才统一处理视觉层级、布局密度、空状态、错误状态、运行状态和响应式 polish。

---

## File Structure

**可能修改文件：**
- `apps/desktop/src/App.vue`：工作台组合视图、发布准备入口、任务历史入口。
- `apps/desktop/src/styles.css`：全局 design tokens、布局、按钮、卡片、表单、状态样式。
- `apps/desktop/src/components/workbench/WorkbenchShell.vue`：左侧导航、顶部运行控制、项目概览。
- `apps/desktop/src/components/workbench/WorkflowStageCard.vue`：阶段卡片结构、actions 区域、状态布局。
- `apps/desktop/src/components/settings/SettingsView.vue`：设置 / Provider / sidecar 页面，若 P0 设置计划创建了该文件。
- `apps/desktop/src/components/publish/PublishPrepView.vue`：发布准备页面，若 P0 发布计划创建了该文件。
- `apps/desktop/src/components/task-center/TaskCenterPreview.vue`：任务中心预览，若 P0 发布计划创建了该文件。
- `docs/product-architecture/design-decisions/workbench-workflow.md`：工作台 UI 决策记录。
- `docs/product-architecture/design-decisions/settings-provider-sidecar.md`：设置 UI 决策记录。
- `docs/product-architecture/design-decisions/account-publish-flow.md`：发布准备 UI 决策记录。

**禁止修改文件：**
- `packages/`，除非发现 UI 需要的新类型已经在 P0 计划中明确允许。
- `docs/reverse-engineering/legacy-ui-gap-list.md`。
- `.codex/dispatch-state.json`。
- 大型二进制资产、录屏、DMG、ASAR 解包目录。

---

## Task 1：建立 UI/UX 决策基线

**目标：** 把 P0 polish 的设计标准写清楚，避免工位凭感觉改 UI。

**允许修改文件：**
- 创建或修改：`docs/product-architecture/design-decisions/workbench-workflow.md`
- 创建或修改：`docs/product-architecture/design-decisions/settings-provider-sidecar.md`
- 创建或修改：`docs/product-architecture/design-decisions/account-publish-flow.md`

**禁止修改文件：**
- `apps/`
- `packages/`
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：补齐工作台 UI 决策**

在 `docs/product-architecture/design-decisions/workbench-workflow.md` 中记录：

```markdown
# 工作台 Workflow UI/UX 决策

## 目标用户

短视频运营、内容团队和个体创作者，需要在一个桌面工作台中完成素材输入、文案、声音、数字人、成片、复核和发布准备。

## UI 原则

- 首屏必须让用户看到当前项目、整体进度、下一步操作和至少 4 个阶段卡片。
- 每个阶段卡片只有一个主操作；辅助操作使用次级按钮或文本按钮。
- 状态必须可扫读：待执行、运行中、已完成、失败、已跳过。
- 运行中状态必须同时体现在顶部控制和当前阶段卡片。
- 错误状态必须显示失败原因和可重试入口。
- 产物路径、任务 ID、平台结果需要支持长文本换行，不得撑破卡片。
- 明暗主题必须都满足基本可读性，避免低对比文本。

## 工作台布局

- 左侧导航保持窄 rail，用于模块切换，不承载主要配置。
- 顶部栏用于项目名、当前阶段、进度、主题切换、全局运行控制。
- 内容区按阶段卡片组织，优先保证操作效率和信息密度。
- 设置、执行记录和任务历史可以作为辅助卡片，但不能压低核心 workflow 的可见性。

## 验收

- 浏览器 1280x720 下无横向溢出。
- 浏览器 1440x900 下首屏可见核心流程。
- 页面无 Vite overlay，控制台无 error。
- 点击“运行下一步”后进度、日志和阶段状态同步变化。
```

- [x] **Step 2：补齐设置 UI 决策**

在 `docs/product-architecture/design-decisions/settings-provider-sidecar.md` 中记录：

```markdown
# 设置 / Provider / sidecar UI/UX 决策

## UI 原则

- 密钥字段默认隐藏，不能在页面普通文本中泄露 API Key。
- Provider 配置、sidecar 依赖、本地输出目录和提示词配置必须分区明确。
- 每个配置区必须有保存状态、校验结果和失败说明。
- sidecar 依赖状态使用可扫读状态行，区分未配置、已配置、检测失败。
- 不把技术错误直接裸露给普通用户；保留可复制的详情入口。

## 验收

- Provider 列表为空时有空状态和新增入口。
- API Key 输入不会被持久化到可提交源码或日志。
- 设置页在 1280px 宽度下无重叠。
- 表单标签、输入、帮助文本不互相遮挡。
```

- [x] **Step 3：补齐发布准备 UI 决策**

在 `docs/product-architecture/design-decisions/account-publish-flow.md` 中记录：

```markdown
# 账号管理与发布准备 UI/UX 决策

## UI 原则

- 发布前必须明确展示账号、平台、视频路径、标题、描述、封面、发布模式。
- mock 发布任务也要表现为真实任务队列，区分待提交、处理中、成功、失败、取消。
- 平台能力差异用配置说明，不在 UI 中暗示未支持平台已经真实可用。
- 发布确认必须是显式动作，取消后 publish 阶段回到 pending。

## 验收

- 发布准备页能清楚看到已选平台和账号状态。
- 创建 mock 发布任务后，任务状态和最近历史同步更新。
- 取消发布不会创建历史记录。
```

- [x] **Step 4：验证文档存在**

```bash
test -f docs/product-architecture/design-decisions/workbench-workflow.md
test -f docs/product-architecture/design-decisions/settings-provider-sidecar.md
test -f docs/product-architecture/design-decisions/account-publish-flow.md
```

预期：三个文件都存在。

---

## Task 2：工作台 UI polish

**目标：** 优化主 workflow 工作台的布局、状态层级和阶段卡片一致性。

**允许修改文件：**
- `apps/desktop/src/App.vue`
- `apps/desktop/src/styles.css`
- `apps/desktop/src/components/workbench/WorkbenchShell.vue`
- `apps/desktop/src/components/workbench/WorkflowStageCard.vue`

**禁止修改文件：**
- `packages/`
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：检查重复主操作**

运行：

```bash
rg -n "执行 视频合成|剪辑视频|运行下一步|运行全部" apps/desktop/src/App.vue apps/desktop/src/components/workbench
```

预期：
- 每个阶段卡片只有一个主操作按钮。
- 顶部只保留全局运行按钮。

- [x] **Step 2：统一阶段卡片 actions 区域**

调整 `WorkflowStageCard.vue` 和 `App.vue`，使每个阶段卡片主操作位于 actions slot；辅助操作保留在卡片内容或 heading-extra。

验收重点：
- 文案提取、文案改写、声音克隆、语音合成、数字人口播、视频合成、人工复核、多平台发布都只有一个主操作。
- 主操作禁用逻辑统一使用 `runtime.running.value || stageStatus === "completed"`。

- [x] **Step 3：优化工作台密度与响应式**

在 `apps/desktop/src/styles.css` 中检查并调整：
- `.workflow-board`
- `.workflow-card`
- `.card-heading`
- `.card-actions`
- `.artifact-box`
- `.video-preview`
- `.window-bar`
- `.toolbar-actions`

验收重点：
- 1280x720 下无横向滚动。
- 1440x900 下首屏至少可见核心工作台、顶部控制和多个阶段卡片。
- 长路径文本不会撑破卡片。

- [x] **Step 4：运行验证**

```bash
pnpm --filter @mirax/desktop typecheck
pnpm --filter @mirax/desktop build:web
pnpm --filter @mirax/desktop dev:web
```

浏览器检查：
- `http://127.0.0.1:1420/` 无 Vite overlay。
- 控制台无 error。
- 8 个 workflow 阶段可见。
- 点击“运行下一步”后进度、日志、当前阶段状态正常变化。

---

## Task 3：设置 / Provider / sidecar UI polish

**目标：** 在设置 P0 计划完成后，统一配置页的信息结构、表单状态和依赖检查呈现。

**允许修改文件：**
- `apps/desktop/src/App.vue`
- `apps/desktop/src/styles.css`
- `apps/desktop/src/components/settings/`
- `apps/desktop/src/components/provider/`
- `apps/desktop/src/components/sidecar/`

**禁止修改文件：**
- `packages/`
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：确认设置页面入口**

```bash
rg -n "Settings|Provider|sidecar|Sidecar|API Key|Base URL|输出目录" apps/desktop/src
```

预期：能定位设置页组件或 App.vue 中的设置区域。

- [x] **Step 2：优化配置分区**

把设置页分成以下区块：
- 通用设置：输出目录、主题、数据目录。
- AI Provider：Provider 列表、模型、Base URL、API Key。
- sidecar：FFmpeg、Playwright、Python 服务、HeyGem、CosyVoice。
- 数据与诊断：导出日志、清理缓存、版本信息。

每个区块必须有标题、简短说明、保存/检测状态。

- [x] **Step 3：验证密钥安全展示**

检查：

```bash
rg -n "apiKey|API Key|password|localStorage" apps/desktop/src
```

预期：
- API Key 输入使用 `type="password"`。
- API Key 不出现在普通文本、日志或任务历史中。

- [x] **Step 4：运行验证**

```bash
pnpm --filter @mirax/desktop typecheck
pnpm --filter @mirax/desktop build:web
pnpm --filter @mirax/desktop dev:web
```

浏览器检查：
- 设置页无重叠。
- 空 Provider 状态有新增入口。
- sidecar 依赖状态可扫读。
- 控制台无 error。

---

## Task 4：发布准备与 mock 任务 UI polish

**目标：** 在发布 P0 计划完成后，让发布准备、确认、mock 任务和最近历史形成清晰闭环。

**允许修改文件：**
- `apps/desktop/src/App.vue`
- `apps/desktop/src/styles.css`
- `apps/desktop/src/components/publish/`
- `apps/desktop/src/components/task-center/`

**禁止修改文件：**
- `packages/`
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：确认发布 UI 入口**

```bash
rg -n "发布准备|立即发布|发布模式|mock|task|history|任务历史|publish" apps/desktop/src
```

预期：能定位发布准备页、发布卡片、任务历史或任务中心预览。

- [x] **Step 2：优化发布确认信息**

确认 UI 中明确展示：
- 视频路径。
- 标题和描述。
- 封面状态。
- 目标平台。
- 账号状态。
- 发布模式：草稿或直接发布。
- 创建任务后的状态和任务 ID。

- [x] **Step 3：优化 mock 任务反馈**

mock 发布任务必须可区分：
- 待提交。
- 处理中。
- 成功。
- 失败。
- 取消。

失败状态必须显示原因和重试入口；取消状态不能生成历史记录。

- [x] **Step 4：运行验证**

```bash
pnpm --filter @mirax/desktop typecheck
pnpm --filter @mirax/desktop build:web
pnpm --filter @mirax/desktop dev:web
```

浏览器检查：
- 发布准备内容可扫读。
- 创建 mock 发布任务后任务历史更新。
- 取消发布后 publish 阶段回到 pending。
- 控制台无 error。

---

## Task 5：全局视觉一致性与验收

**目标：** 收尾检查 P0 UI 是否形成一致、可用、可验收的桌面端体验。

**允许修改文件：**
- `apps/desktop/src/App.vue`
- `apps/desktop/src/styles.css`
- `apps/desktop/src/components/`
- `docs/product-architecture/design-decisions/`

**禁止修改文件：**
- `packages/`
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：检查 design token 使用**

```bash
rg -n "--mx-[a-z0-9-]+" apps/desktop/src
rg -n "#[0-9a-fA-F]{3,8}|rgb\\(|rgba\\(" apps/desktop/src
```

预期：
- 主要颜色使用 `styles.css` 中定义的 token。
- 组件内没有大量临时硬编码颜色。

- [x] **Step 2：检查文案和按钮层级**

浏览器检查：
- 每个页面主操作清晰。
- 次级操作不会抢主操作。
- 危险操作有明确文案。
- 空状态和错误状态有下一步行动。

- [x] **Step 3：运行全量验证**

```bash
pnpm test packages/core
pnpm test apps/desktop/src/composables/useWorkflowRuntime.test.ts
pnpm test apps/desktop/src/composables/useWorkbenchDraft.test.ts
pnpm test apps/desktop/src/composables/useTaskCenterPreview.test.ts
pnpm --filter @mirax/desktop typecheck
pnpm --filter @mirax/desktop build:web
pnpm --filter @mirax/desktop dev:web
```

浏览器检查：
- 1280x720 无重叠、无横向溢出。
- 1440x900 首屏可见核心任务。
- 明暗主题可切换。
- 控制台无 error。
- 无 Vite overlay。

- [x] **Step 4：更新计划状态**

本计划完成后，在 `docs/superpowers/PROJECT-STATE.md` 的「进度入口」中登记：

```markdown
- 阶段 4 P0.5 UI/UX polish：`docs/superpowers/plans/2026-06-17-mirax-ui-ux-polish.md`
```

---

## 自检与验收

### 规格覆盖检查

| 要求 | 覆盖任务 |
| --- | --- |
| 工作台 workflow UI polish | Task 1、2、5 |
| 设置 / Provider / sidecar UI polish | Task 1、3、5 |
| 发布准备与 mock 任务 UI polish | Task 1、4、5 |
| UI/UX 决策文档 | Task 1、5 |
| 浏览器验收 | Task 2、3、4、5 |

### 禁止事项

- 不把旧版 UI 视觉作为 Mirax AI 的目标风格。
- 不新增真实平台自动发布。
- 不把视频号标记为真实已支持平台。
- 不修改 `legacy-ui-gap-list.md` 状态列。
- 不为了视觉 polish 改动 core/provider/local-store 的业务协议。

### 风险与待确认问题

1. **P0 功能尚未全部完成时执行本计划**：会导致 polish 范围反复变化。默认等三个 P0 计划完成后执行。
2. **App.vue 可能继续变大**：polish 时若继续堆模板，应考虑拆分阶段子组件，但不要在没有验证收益时大拆。
3. **路由是否进入 P0.5**：默认不引入 Vue Router；如果设置、发布、任务中心已经变成独立页面，再由执行工位提出。
4. **视觉资产**：本计划不引入大图或品牌插画；优先通过结构、密度、状态和 token 优化桌面工具体验。

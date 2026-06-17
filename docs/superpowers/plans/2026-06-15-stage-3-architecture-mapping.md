# 阶段 3：Mirax AI 新版产品架构映射实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把旧版功能卡、页面卡和阶段 2 静态分析结果映射为 Mirax AI 新版信息架构、工程模块、Provider / sidecar / 本地数据边界和后续阶段 4 可派工实施队列。

**Architecture:** 阶段 3 只产出架构映射文档，不修改应用源码，不启动 UI 实现。映射产物集中放在 `docs/product-architecture/`，按「证据来源 → 新版信息架构 → 工程模块 → 数据/Provider/sidecar → 发布链路 → UI/UX 与阶段 4 handoff」分文件维护，避免多人同时编辑一个巨型文档。

**Tech Stack:** Markdown、ripgrep、已有逆向证据文档、现有 pnpm monorepo 模块边界（Vue 3 + Tauri 2、`@mirax/core`、`@mirax/provider-ai`、`@mirax/media-pipeline`、`@mirax/provider-publish`、`@mirax/local-store`、`@mirax/sidecar-manager`）。

---

## Resume Here

**当前自动调度入口：** `docs/superpowers/plans/2026-06-15-stage-3-architecture-mapping.md`

**当前阶段：** 阶段 3：Mirax AI 新版产品架构映射（已完成）。

**已完成任务：** 阶段 0、阶段 1、阶段 2 已完成；阶段 2 已登记 `EV-STATIC-001` 到 `EV-STATIC-200`；阶段 3 Task 1 → Task 7 已全部完成，产出 `docs/product-architecture/` 下 6 份架构映射文档。

**当前任务：** 无。阶段 3 已收尾，不要重复执行 Task 1 → Task 7。

**下一步：** 进入阶段 4：按 `docs/product-architecture/ui-ux-and-phase-4-handoff.md` 的 P0 → P1 → P2 队列创建面向源码实现的 implementation plans。

**验证命令：**

```bash
test -f docs/superpowers/plans/2026-06-15-stage-3-architecture-mapping.md
test -d docs/product-architecture
rg -n "FC-HOME-PIPELINE|FC-ASSET-MANAGEMENT|FC-PROVIDER-SETTINGS|FC-PUBLISH-PREP" docs/product-architecture
rg -n "桌面工作台|素材管理|声音管理|形象管理|任务中心|账号管理|设置|Provider|sidecar|本地数据|发布链路" docs/product-architecture
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
```

预期：计划和阶段 3 文档存在；所有旧版功能卡和目标模块都能查到；`legacy-ui-gap-list.md` 没有 diff。

---

## 范围

本计划覆盖：

- 旧版功能卡到 Mirax AI 新版信息架构的归属映射。
- 旧版页面卡到新版导航、工作区和低频入口的映射。
- 旧版字段、状态、IPC 和运行障碍到新版工程模块的职责映射。
- 桌面工作台、素材管理、声音管理、形象管理、任务中心、账号管理、设置、Provider、sidecar、本地数据和发布链路。
- 对每项旧版能力标注：保留、重做、合并、延期、替代实现。
- 识别需要后续 UI/UX skill 的复杂页面和跨模块流程。
- 给阶段 4 生成源码实施计划提供排序、边界、验证建议和风险。

本计划不覆盖：

- 不修改 `apps/`、`packages/` 或任何源码。
- 不开始实现 UI、Provider、sidecar、数据库迁移或发布自动化。
- 不绕过旧版登录、激活、会员、权限或平台限制。
- 不复用旧版混淆代码或生产代码。
- 不修改 `docs/reverse-engineering/legacy-ui-gap-list.md` 状态列。
- 不提交、不推送。

---

## 目标文件结构

```text
docs/
  product-architecture/
    README.md
    stage-3-source-inventory.md
    legacy-function-to-information-architecture.md
    engineering-module-map.md
    workflow-and-release-chain.md
    data-provider-sidecar-contracts.md
    ui-ux-and-phase-4-handoff.md
  superpowers/
    PROJECT-STATE.md
    plans/
      2026-06-15-stage-3-architecture-mapping.md
```

`docs/product-architecture/` 是阶段 3 的唯一新增文档目录。后续源码 implementation plans 应读取这里的映射产物，但不要把阶段 3 文档当成源码实现完成证明。

---

## 全局验证命令

每个任务完成后至少运行对应任务的验证命令。阶段 3 最终验收前运行：

```bash
test -f docs/product-architecture/README.md
test -f docs/product-architecture/stage-3-source-inventory.md
test -f docs/product-architecture/legacy-function-to-information-architecture.md
test -f docs/product-architecture/engineering-module-map.md
test -f docs/product-architecture/workflow-and-release-chain.md
test -f docs/product-architecture/data-provider-sidecar-contracts.md
test -f docs/product-architecture/ui-ux-and-phase-4-handoff.md
rg -n "FC-HOME-PIPELINE|FC-ASSET-MANAGEMENT|FC-PROVIDER-SETTINGS|FC-PUBLISH-PREP" docs/product-architecture
rg -n "PAGE-HOME-WORKBENCH|PAGE-VOICE-MANAGEMENT|PAGE-AVATAR-MANAGEMENT|PAGE-MATERIALS|PAGE-TASK-CENTER|PAGE-ACCOUNT-MANAGEMENT|PAGE-SETTINGS|PAGE-PUBLISH-FLOW|PAGE-SECONDARY-ENTRYPOINTS" docs/product-architecture
rg -n "保留|重做|合并|延期|替代实现" docs/product-architecture
rg -n "@mirax/core|@mirax/provider-ai|@mirax/media-pipeline|@mirax/provider-publish|@mirax/local-store|@mirax/sidecar-manager" docs/product-architecture
rg -n "阶段 3|阶段 4|product-architecture" docs/superpowers/PROJECT-STATE.md
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
```

预期：全部文件存在；所有功能卡、页面卡、决策类型和工程包都被映射；`PROJECT-STATE.md` 指向阶段 3 进度；`legacy-ui-gap-list.md` 无 diff。

---

### Task 1：建立阶段 3 文档目录与证据源清单

**目标：** 建立 `docs/product-architecture/` 目录入口，列出阶段 3 允许使用的全部证据源、功能卡、页面卡、静态分析和运行障碍，确保后续任务只基于已登记证据做映射。

**允许修改文件：**

- 创建：`docs/product-architecture/README.md`
- 创建：`docs/product-architecture/stage-3-source-inventory.md`

**禁止修改文件：**

- `apps/`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- 与阶段 3 映射无关的文档

- [x] **Step 1：创建目录和 README**

创建 `docs/product-architecture/README.md`，内容必须包含以下小节：

```md
# Mirax AI 产品架构映射

本文是阶段 3 的入口，记录旧版「轻语 IP 智能体」能力到 Mirax AI 新版产品架构与工程模块的映射。

## 阶段边界

- 阶段 3 只做架构映射文档，不修改源码。
- 新版 UI 重新设计，不复制旧版视觉。
- 旧版登录、激活、会员、平台授权和云服务限制只记录为风险或替代实现，不作为绕过目标。
- 阶段 4 才把本目录产物转换为源码 implementation plans。

## 文档索引

| 文档 | 职责 |
| --- | --- |
| `stage-3-source-inventory.md` | 阶段 3 证据源、功能卡、页面卡和静态分析清单。 |
| `legacy-function-to-information-architecture.md` | 旧版功能到新版信息架构、导航和产品决策的映射。 |
| `engineering-module-map.md` | 新版 UI、core、provider、media、publish、local-store、sidecar 的职责边界。 |
| `workflow-and-release-chain.md` | 旧版 7 步生产流程到 Mirax AI workflow 与发布链路的映射。 |
| `data-provider-sidecar-contracts.md` | 本地数据、Provider、sidecar 和发布账号/任务状态的契约草案。 |
| `ui-ux-and-phase-4-handoff.md` | 需要 UI/UX skill 的复杂页面、设计产物落点和阶段 4 实施队列。 |
```

- [x] **Step 2：创建证据源清单**

创建 `docs/product-architecture/stage-3-source-inventory.md`，至少包含以下表格：

```md
# 阶段 3 证据源清单

## 固定入口

| 类型 | 路径 | 用途 |
| --- | --- | --- |
| 项目约定 | `AGENTS.md` | 调度、计划目录、gap-list 更新约束。 |
| 工位约定 | `CLAUDE.md` | monorepo、包职责、命令和协作约定。 |
| 项目状态 | `docs/superpowers/PROJECT-STATE.md` | 当前阶段、已完成阶段和下一步。 |
| 路线图 spec | `docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md` | 阶段 3 目标、完成标准和证据规则。 |

## 功能卡

| 功能卡 | 新版归属模块 | 阶段 3 使用方式 |
| --- | --- | --- |
| `docs/reverse-engineering/function-cards/FC-HOME-PIPELINE.md` | 桌面工作台 | 映射工作台、workflow、任务状态和发布前置。 |
| `docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md` | 声音管理、形象管理、素材管理、任务中心、账号管理 | 拆分聚合功能卡，形成新版资源与任务模块边界。 |
| `docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md` | 设置、Provider、sidecar、本地数据 | 映射设置分组、Provider 配置、依赖检查和本地数据管理。 |
| `docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md` | 发布链路、账号管理、Publish Provider | 映射标题封面、发布账号、发布方式、任务中心状态。 |

## 页面卡

| 页面卡 | 新版信息架构模块 |
| --- | --- |
| `PAGE-HOME-WORKBENCH` | 桌面工作台 |
| `PAGE-VOICE-MANAGEMENT` | 声音管理 |
| `PAGE-AVATAR-MANAGEMENT` | 形象管理 |
| `PAGE-MATERIALS` | 素材管理 |
| `PAGE-TASK-CENTER` | 任务中心 |
| `PAGE-ACCOUNT-MANAGEMENT` | 账号管理 |
| `PAGE-SETTINGS` | 设置 |
| `PAGE-PUBLISH-FLOW` | 发布链路 |
| `PAGE-SECONDARY-ENTRYPOINTS` | 设置、帮助、更新、日志、边缘状态 |

## 静态分析

| 静态分析 | 关键用途 |
| --- | --- |
| `SA-PUBLISH-FLOW.md` | 发布 IPC、平台 ID、账号字段、任务状态。 |
| `SA-VOICE-AVATAR.md` | 声音/形象 IPC、语音合成参数、数字人参数、sidecar 模块。 |
| `SA-MATERIALS-TASKS.md` | 素材字段、分类、向量化、任务字段和状态机。 |
| `SA-ACCOUNTS-AUTH.md` | 平台账号字段、授权接口、Playwright sidecar 边界。 |
| `SA-SECONDARY-ENTRYPOINTS.md` | 设置分类、配置字段、软件更新、日志、数据设置、依赖检查。 |
| `SA-WORKFLOW-NOTES.md` | 阶段 2 解包方法和搜索注意事项，只作为溯源，不作为新版实现细节。 |

## 运行障碍

| 文件 | 阶段 3 使用方式 |
| --- | --- |
| `docs/reverse-engineering/runtime-blockers.md` | 将登录、激活、云服务、模型、本地依赖、平台规则限制映射为新版风险和替代实现。 |
```

- [x] **Step 3：运行验证**

```bash
test -f docs/product-architecture/README.md
test -f docs/product-architecture/stage-3-source-inventory.md
rg -n "FC-HOME-PIPELINE|FC-ASSET-MANAGEMENT|FC-PROVIDER-SETTINGS|FC-PUBLISH-PREP" docs/product-architecture/stage-3-source-inventory.md
rg -n "SA-PUBLISH-FLOW|SA-VOICE-AVATAR|SA-MATERIALS-TASKS|SA-ACCOUNTS-AUTH|SA-SECONDARY-ENTRYPOINTS" docs/product-architecture/stage-3-source-inventory.md
```

预期：两个文件存在；四张功能卡和五份核心静态分析记录都能查到。

**验收标准：**

- `docs/product-architecture/README.md` 能说明阶段 3 边界和文档职责。
- `stage-3-source-inventory.md` 覆盖用户指定的输入文件和目录。
- 没有修改源码、`.codex/dispatch-state.json` 或 `legacy-ui-gap-list.md`。

---

### Task 2：映射旧版功能到新版信息架构

**目标：** 创建旧版页面和功能到新版 Mirax AI 信息架构的完整映射，覆盖桌面工作台、素材管理、声音管理、形象管理、任务中心、账号管理、设置和发布链路，并为每项能力标注保留、重做、合并、延期或替代实现。

**允许修改文件：**

- 创建：`docs/product-architecture/legacy-function-to-information-architecture.md`
- 修改：`docs/product-architecture/README.md`

**禁止修改文件：**

- `apps/`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `docs/reverse-engineering/function-cards/`
- `docs/reverse-engineering/pages/`

- [x] **Step 1：创建信息架构映射文档**

创建 `docs/product-architecture/legacy-function-to-information-architecture.md`，必须包含以下模块地图：

```md
# 旧版功能到 Mirax AI 新版信息架构映射

## 新版一级信息架构

| 新版模块 | 旧版来源 | 用户目标 | 阶段 3 决策 |
| --- | --- | --- | --- |
| 桌面工作台 | `PAGE-HOME-WORKBENCH`、`FC-HOME-PIPELINE` | 从对标素材到文案、声音、数字人、成片、发布准备的主流程。 | 重做：保留流程意图，不复制旧版视觉。 |
| 声音管理 | `PAGE-VOICE-MANAGEMENT`、`FC-ASSET-MANAGEMENT`、`EV-STATIC-100` | 训练、合成、试听和管理声音资产。 | 重做：第一版 mock 状态流转，真实 CosyVoice 后续接入。 |
| 形象管理 | `PAGE-AVATAR-MANAGEMENT`、`FC-ASSET-MANAGEMENT`、`EV-STATIC-100` | 上传、训练和管理数字人形象。 | 重做：第一版 mock 状态流转，真实 HeyGem 后续接入。 |
| 素材管理 | `PAGE-MATERIALS`、`FC-ASSET-MANAGEMENT`、`EV-STATIC-101` | 管理视频/图片素材、分类、搜索、抽帧和向量化。 | 重做并延期高级能力：先做本地上传、分类、文件名/描述搜索，向量化延后。 |
| 任务中心 | `PAGE-TASK-CENTER`、`FC-ASSET-MANAGEMENT`、`EV-STATIC-101` | 查看 workflow、素材处理、发布任务的状态、进度、失败和重试。 | 重做：统一任务表和状态机。 |
| 账号管理 | `PAGE-ACCOUNT-MANAGEMENT`、`FC-ASSET-MANAGEMENT`、`FC-PUBLISH-PREP`、`EV-STATIC-102` | 管理平台发布账号和登录状态。 | 替代实现：第一版 mock 账号，真实授权通过 Playwright sidecar。 |
| 设置 | `PAGE-SETTINGS`、`PAGE-SECONDARY-ENTRYPOINTS`、`FC-PROVIDER-SETTINGS` | 配置 Provider、本地依赖、输出目录、提示词、数据、更新和日志。 | 重做：保留旧版分组习惯，改为本地可控配置。 |
| 发布链路 | `PAGE-PUBLISH-FLOW`、`FC-PUBLISH-PREP`、`EV-STATIC-002` | 准备标题、描述、话题、封面、账号、发布方式并创建发布任务。 | 重做：先 mock publisher，真实平台发布后续接入。 |
| 帮助与边缘状态 | `PAGE-SECONDARY-ENTRYPOINTS`、`EV-STATIC-200` | 提供引导、日志、更新、数据恢复和依赖缺失提示。 | 合并：帮助、日志、更新放入设置/支持入口；登录激活不移植为强制门槛。 |
```

- [x] **Step 2：补充页面到导航映射**

在同一文件追加：

```md
## 页面到新版导航映射

| 旧版页面 | 新版导航位置 | 默认入口 | 说明 |
| --- | --- | --- | --- |
| `PAGE-HOME-WORKBENCH` | 主导航：工作台 | 应用启动默认页 | 承载主 workflow 和右侧预览/结果区域。 |
| `PAGE-VOICE-MANAGEMENT` | 主导航：声音 | 工作台选择声音时也可进入 | 声音资产独立管理，也服务 workflow `voice-clone` / `speech` 阶段。 |
| `PAGE-AVATAR-MANAGEMENT` | 主导航：形象 | 工作台选择形象时也可进入 | 数字人形象独立管理，也服务 workflow `avatar` 阶段。 |
| `PAGE-MATERIALS` | 主导航：素材 | 工作台导入对标素材时也可进入 | 素材库是对标视频、封面、BGM 和素材复用的统一入口。 |
| `PAGE-TASK-CENTER` | 主导航：任务 | 工作台执行后自动产生任务 | 展示 workflow、素材处理、发布任务。 |
| `PAGE-ACCOUNT-MANAGEMENT` | 主导航：账号 | 发布卡片选择账号时也可进入 | 平台账号管理和授权状态。 |
| `PAGE-SETTINGS` | 主导航：设置 | 顶栏支持入口也可进入 | 常规、模型、提示词、数据、更新、本地依赖。 |
| `PAGE-PUBLISH-FLOW` | 工作台发布步骤 + 任务中心结果 | 工作台第 6/7 步 | 不做独立发布确认页，除非后续运行态证据确认存在。 |
| `PAGE-SECONDARY-ENTRYPOINTS` | 设置 / 支持 / 引导 | 低频入口 | 帮助、日志、软件更新、数据恢复、依赖缺失提示合并管理。 |
```

- [x] **Step 3：补充旧版能力决策矩阵**

在同一文件追加：

```md
## 旧版能力决策矩阵

| 旧版能力 | 证据 | 新版模块 | 决策 | 理由 |
| --- | --- | --- | --- | --- |
| 学习对标 / 提取文案 | `FC-HOME-PIPELINE`、`PAGE-HOME-WORKBENCH` | 桌面工作台 + Provider | 重做 | 保留用户目标，Provider 实现由 mock 逐步替换真实解析。 |
| 改写文章 | `FC-HOME-PIPELINE`、`FC-PROVIDER-SETTINGS` | 桌面工作台 + Provider + 提示词 | 重做 | 旧版依赖云端模型，新版改为用户配置 Provider。 |
| 声音训练 / 合成 | `PAGE-VOICE-MANAGEMENT`、`EV-STATIC-100` | 声音管理 + Provider + sidecar | 重做 | 保留字段和状态，真实 CosyVoice 作为后续 sidecar。 |
| 形象训练 / 视频生成 | `PAGE-AVATAR-MANAGEMENT`、`EV-STATIC-100` | 形象管理 + Provider + sidecar | 重做 | 保留 V1/V2 模型版本概念，第一版 mock。 |
| 素材上传 / 分类 / 搜索 | `PAGE-MATERIALS`、`EV-STATIC-101` | 素材管理 + local-store + media-pipeline | 重做 | 本地文件、分类、描述搜索优先；向量化延期。 |
| 素材向量化 | `EV-STATIC-101`、`RB-ASSET-003` | 素材管理 + sidecar | 延期 | 依赖向量服务和索引策略，先保留数据字段和接口占位。 |
| 任务统计 / 筛选 / 重试 | `PAGE-TASK-CENTER`、`EV-STATIC-101` | 任务中心 + core + local-store | 重做 | 统一状态机，支持 workflow 和发布任务。 |
| 平台账号授权 | `PAGE-ACCOUNT-MANAGEMENT`、`EV-STATIC-102` | 账号管理 + provider-publish + sidecar | 替代实现 | 不绕过平台登录；第一版 mock，真实授权走 Playwright。 |
| 标题封面 / 发布准备 | `FC-PUBLISH-PREP`、`EV-STATIC-002` | 发布链路 + provider-publish | 重做 | 保留发布元数据和 direct/draft 语义。 |
| 登录 / 激活会员 | `RB-HOME-001`、`RB-HOME-002` | N/A | 不移植为强制门槛 | Mirax AI 第一版本地优先，不复制旧版账号/激活限制。 |
| 软件更新 | `EV-STATIC-200` | 设置 + Tauri updater | 替代实现 | 用 Tauri 2 Updater 替代旧版 `cloud.*`。 |
| 日志上传 | `EV-STATIC-200` | 设置 / 支持 | 替代实现 | 第一版本地导出/复制，云端上传待服务端明确。 |
```

- [x] **Step 4：更新 README 索引状态**

在 `docs/product-architecture/README.md` 的文档索引后追加一句：

```md
当前已完成：旧版功能到新版信息架构映射见 `legacy-function-to-information-architecture.md`。
```

- [x] **Step 5：运行验证**

```bash
test -f docs/product-architecture/legacy-function-to-information-architecture.md
rg -n "桌面工作台|声音管理|形象管理|素材管理|任务中心|账号管理|设置|发布链路" docs/product-architecture/legacy-function-to-information-architecture.md
rg -n "保留|重做|合并|延期|替代实现" docs/product-architecture/legacy-function-to-information-architecture.md
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
```

预期：所有新版模块和决策类型可查到；`legacy-ui-gap-list.md` 无 diff。

**验收标准：**

- 每张功能卡和每张页面卡都有新版归属。
- 每项重要旧版能力都有阶段 3 决策。
- 明确说明登录/激活不作为新版强制门槛。

---

### Task 3：映射新版工程模块职责边界

**目标：** 把阶段 3 信息架构映射为工程模块职责，明确桌面端 UI、core、Provider、media-pipeline、provider-publish、local-store、sidecar-manager 的边界和禁止耦合关系。

**允许修改文件：**

- 创建：`docs/product-architecture/engineering-module-map.md`
- 修改：`docs/product-architecture/README.md`

**禁止修改文件：**

- `apps/`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：创建工程模块地图**

创建 `docs/product-architecture/engineering-module-map.md`，必须包含：

```md
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
```

- [x] **Step 2：补充产品模块到工程模块映射**

追加：

```md
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
```

- [x] **Step 3：补充禁止耦合规则**

追加：

```md
## 禁止耦合规则

- UI 层不得直接拼 FFmpeg 命令；需要媒体处理时经由 `@mirax/media-pipeline` 或 `@mirax/sidecar-manager`。
- UI 层不得直接操作 Playwright；平台授权和发布自动化必须由 `@mirax/sidecar-manager` 或后续发布 sidecar 适配层承载。
- `@mirax/core` 保持纯逻辑，不导入 Tauri、SQLite、Node 文件系统、Provider SDK。
- `@mirax/local-store` 只负责持久化和查询，不推进 workflow 阶段，不调用模型。
- Provider 配置中的 API Key 第一版可按现有类型存储，但 UI 持久化前必须沿用 `sanitizeDesktopDraftForStorage` 类似规则避免草稿泄露密钥。
- 旧版 `main.jsc` 只能作为接口和字段线索，不允许复用旧版生产代码。
```

- [x] **Step 4：运行验证**

```bash
test -f docs/product-architecture/engineering-module-map.md
rg -n "@mirax/core|@mirax/provider-ai|@mirax/media-pipeline|@mirax/provider-publish|@mirax/local-store|@mirax/sidecar-manager" docs/product-architecture/engineering-module-map.md
rg -n "禁止耦合|不得直接|保持纯逻辑" docs/product-architecture/engineering-module-map.md
```

预期：所有 package 名称和禁止耦合规则可查到。

**验收标准：**

- 每个目标产品模块都有对应工程模块。
- 明确 UI、core、Provider、sidecar、本地数据职责边界。
- 明确旧版静态分析只能作为字段和接口线索。

---

### Task 4：映射工作流、任务中心和发布链路

**目标：** 把旧版首页 7 步生产流程映射到 Mirax AI 现有 8 个 workflow 阶段，并明确发布准备、发布账号、任务中心和发布结果的链路。

**允许修改文件：**

- 创建：`docs/product-architecture/workflow-and-release-chain.md`
- 修改：`docs/product-architecture/README.md`

**禁止修改文件：**

- `apps/`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：创建 workflow 映射表**

创建 `docs/product-architecture/workflow-and-release-chain.md`，必须包含：

```md
# Workflow 与发布链路映射

## 旧版 7 步到 Mirax AI 8 阶段映射

| 旧版步骤 | Mirax AI workflow 阶段 | 输入 | 输出 | 任务中心状态 |
| --- | --- | --- | --- | --- |
| 1. 学习对标 | `transcribe` | 对标视频链接或本地素材 | 提取文案、素材引用、解析错误 | `pending` → `processing` → `completed/failed` |
| 2. 改写文章 | `rewrite` | 提取文案、提示词、产品卖点、字数 | 改写文案 | `processing` → `completed/failed` |
| 3. 声音生成 | `voice-clone` + `speech` | 声音样本/声音模型、改写文案、语速、情绪 | 声音模型状态、合成音频路径 | `processing` → `completed/failed` |
| 4. 视频生成 | `avatar` | 数字人形象、合成音频、模型版本 V1/V2 | 数字人口播视频路径 | `processing` → `completed/failed` |
| 5. 一键成片 | `compose` | 数字人视频、字幕、BGM、音量、封面/素材 | 竖屏成片文件、封面候选 | `processing` → `completed/failed` |
| 6. 标题封面 | `review` | 成片、标题/描述/话题/封面生成配置 | 发布元数据、人工确认结果 | `completed` 或保持可编辑 |
| 7. 视频发布 | `publish` | 视频文件、发布元数据、发布账号、发布方式 | 发布任务、平台草稿或发布结果 | `pending` → `processing` → `completed/failed/cancelled` |
```

- [x] **Step 2：补充发布链路**

追加：

```md
## 发布链路

| 链路节点 | 新版承载模块 | 本地数据 | Provider / Sidecar | 阶段 3 决策 |
| --- | --- | --- | --- | --- |
| 发布元数据编辑 | 工作台第 6 步 | `ProjectDraft.publishMetadata` 或后续等价字段 | `@mirax/provider-ai` 可选标题生成 | 重做，保留标题、描述、话题、封面。 |
| 账号选择 | 工作台第 7 步 + 账号管理 | `publish_accounts` | `@mirax/provider-publish` 读取账号能力 | 第一版 mock 账号，真实授权后续。 |
| 发布方式 | 工作台第 7 步 | publish task input | `PublishOptions.publishMode = direct | draft` | 保留直接发布 / 草稿语义。 |
| 创建发布任务 | 任务中心 | `workflow_tasks` | `@mirax/provider-publish` mock publisher | 发布结果统一进入任务中心。 |
| 平台授权 | 账号管理 | `publish_accounts.status/active/last_login_at` | Playwright sidecar | 替代实现，不绕过平台登录。 |
| 上传与发布 | 后续真实发布模块 | publish task output/error | Playwright sidecar + platform adapter | 阶段 4 后拆独立实现计划。 |
```

- [x] **Step 3：补充任务状态统一规则**

追加：

```md
## 任务状态统一规则

| 状态 | 旧版证据 | 新版含义 | UI 展示要求 |
| --- | --- | --- | --- |
| `pending` | `EV-STATIC-002`、`EV-STATIC-101` | 已创建，等待执行。 | 可取消；展示等待中。 |
| `processing` / `running` | `EV-STATIC-002`、`EV-STATIC-101` | 正在执行。 | 展示进度、当前步骤，不允许重复启动。 |
| `completed` / `success` | `EV-STATIC-002`、`EV-STATIC-101` | 成功完成。 | 展示产物入口、可复用到下一步。 |
| `failed` | `EV-STATIC-002`、`EV-STATIC-101` | 执行失败。 | 展示错误信息和重试入口。 |
| `cancelled` | `EV-STATIC-002`、`EV-STATIC-101` | 用户或系统取消。 | 展示取消原因，可重新创建。 |
| `retry` | `EV-STATIC-101` | 动作或派生状态。 | 作为操作按钮，不作为最终状态。 |
```

- [x] **Step 4：运行验证**

```bash
test -f docs/product-architecture/workflow-and-release-chain.md
rg -n "transcribe|rewrite|voice-clone|speech|avatar|compose|review|publish" docs/product-architecture/workflow-and-release-chain.md
rg -n "pending|processing|completed|failed|cancelled|retry" docs/product-architecture/workflow-and-release-chain.md
rg -n "direct|draft|publish_accounts|workflow_tasks" docs/product-architecture/workflow-and-release-chain.md
```

预期：8 个 workflow 阶段、任务状态、发布模式和数据表名均可查到。

**验收标准：**

- 旧版 7 步和 Mirax AI 8 阶段一一对应或明确拆分。
- 发布链路覆盖标题封面、账号、发布方式、任务中心和 sidecar。
- 任务状态与阶段 2 静态分析字段一致。

---

### Task 5：映射本地数据、Provider 和 sidecar 契约

**目标：** 把阶段 2 确认的字段、IPC、状态和本地依赖映射为 Mirax AI 后续实现可参考的数据实体、Provider 能力和 sidecar 能力边界。

**允许修改文件：**

- 创建：`docs/product-architecture/data-provider-sidecar-contracts.md`
- 修改：`docs/product-architecture/README.md`

**禁止修改文件：**

- `apps/`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：创建本地数据契约表**

创建 `docs/product-architecture/data-provider-sidecar-contracts.md`，必须包含：

```md
# 本地数据、Provider 与 Sidecar 契约映射

## 本地数据实体

| 实体 | 来源证据 | 建议字段 | 服务模块 | 说明 |
| --- | --- | --- | --- | --- |
| `app_settings` | `EV-STATIC-003`、`EV-STATIC-200` | `general.runMode`、`general.themeName`、`paths.baseOutput`、`paths.audioOutput`、`paths.videoOutput`、`paths.draftOutput`、`paths.exportOutput`、`paths.thumbs`、`data.databaseUrl`、`voiceClone.highPerformance`、`digitalHuman.modelVersion`、`prompts.titlePrompt` | `@mirax/local-store` | 新增或扩展设置持久化实体，供设置页和 workflow 读取。 |
| `provider_configs` | `FC-PROVIDER-SETTINGS`、`EV-STATIC-003` | `id`、`label`、`provider`、`source`、`baseUrl`、`apiKey`、`model`、`enabled` | `@mirax/core` + `@mirax/local-store` | API Key 先按现有类型存储，后续可迁移 keychain。 |
| `content_drafts` | `CLAUDE.md`、`FC-HOME-PIPELINE` | draft 输入、workflow stage、publish metadata | `@mirax/local-store` | 与 `apps/desktop/src/runtime/desktopDraft.ts` 的 localStorage 草稿职责区分。 |
| `video_projects` | `CLAUDE.md`、`FC-HOME-PIPELINE` | 项目标题、素材引用、音频路径、视频路径、封面路径、状态 | `@mirax/local-store` | 管理成片产物和项目级元数据。 |
| `workflow_tasks` | `EV-STATIC-002`、`EV-STATIC-101` | `status`、`progress`、`current_step`、`input`、`output`、`error`、`created_at`、`updated_at` | `@mirax/local-store` + `@mirax/core` | 统一 workflow、素材处理和发布任务。 |
| `materials` | `EV-STATIC-101` | `file_path`、`file_name`、`category`、`description`、`status`、`error`、`result`、`created_at` | `@mirax/local-store` | 第一版搜索文件名/描述；向量化字段预留。 |
| `categories` | `EV-STATIC-101` | `id`、`name`、`sort_order`、`created_at` | `@mirax/local-store` | 素材分类。 |
| `voices` | `EV-STATIC-100` | `id`、`name`、`prompt_text`、`prompt_audio_path`、`status`、`created_at` | `@mirax/local-store` | 训练/合成状态和声音样本引用。 |
| `digital_humans` | `EV-STATIC-100` | `id`、`name`、`description`、`video_file`、`model_version`、`status`、`created_at` | `@mirax/local-store` | 数字人形象与参考视频。 |
| `publish_accounts` | `EV-STATIC-102` | `account_name`、`display_name`、`platform`、`last_login_at`、`status`、`active` | `@mirax/local-store` + `@mirax/provider-publish` | 敏感 Cookie/Token 不在阶段 3 定义明文存储。 |
```

- [x] **Step 2：补充 Provider 能力矩阵**

追加：

```md
## Provider 能力矩阵

| 能力 | 输入 | 输出 | 归属包 | 阶段 3 决策 |
| --- | --- | --- | --- | --- |
| 文案提取 / 对标学习 | 视频链接或本地素材引用 | 原始文案、解析结果、错误 | `@mirax/provider-ai` | mock 优先，真实解析后续。 |
| 文案改写 | 原始文案、提示词、产品信息、字数 | 改写文案 | `@mirax/provider-ai` | 通过用户配置 Provider 替代旧云端模型。 |
| 标题 / 描述生成 | 文案、平台、标题提示词 | 标题、描述、话题建议 | `@mirax/provider-ai` | 可作为 `review` 阶段辅助能力。 |
| 声音克隆 | 参考音频/视频、声音名称、prompt_text | 声音模型记录或 mock 状态 | `@mirax/provider-ai` | 参数对齐 `voiceClone`，真实能力走 sidecar。 |
| 语音合成 | 文案、声音模型、speed、seed、emotions、highPerformance | 音频文件路径 | `@mirax/provider-ai` | 保留 V2 情感字段和高性能开关。 |
| 数字人视频生成 | audio_file、video_file、watermark、digital_auth、output_dir、model_version | 数字人视频路径 | `@mirax/provider-ai` | 支持 V1/V2 概念，真实 HeyGem 后续。 |
| 平台发布 | 视频路径、标题、描述、话题、封面、账号、publishMode | 发布任务结果、平台链接或草稿状态 | `@mirax/provider-publish` | 第一版 mock，真实发布走 sidecar。 |
```

- [x] **Step 3：补充 sidecar 依赖矩阵**

追加：

```md
## Sidecar 依赖矩阵

| 依赖 | 旧版线索 | 新版用途 | 阶段 3 决策 |
| --- | --- | --- | --- |
| FFmpeg | `video:extract-audio`、`cover:extract-frame`、`video:transcode-to-2k` | 音频提取、抽帧、转码、成片合成。 | 由 `@mirax/media-pipeline` 构建命令，`@mirax/sidecar-manager` 检查可用性。 |
| Python 服务 | `python:get-status`、`python:check-module-exists` | 承载本地模型和长任务。 | 设置页和 workflow 执行前检查。 |
| CosyVoice / `voiceCloneModule` | `python.voiceClone.*` | 声音克隆和语音合成。 | 第一版 mock，真实接入后保持 Provider 接口不变。 |
| HeyGem / `humanModule` / `hdModule` | `python.digitalHuman.*` | 数字人视频生成 V1/V2。 | 第一版 mock，真实接入后走 sidecar。 |
| Playwright 浏览器 | `account:setup-login`、`account:test-login` | 平台授权、登录态测试、上传与发布。 | 第一版 mock 账号，真实授权不得绕过平台验证。 |
| Tauri Updater | 旧版 `cloud.checkVersion/downloadUpdate/applyUpdate` | 应用更新。 | 替代旧云端更新通道。 |
```

- [x] **Step 4：运行验证**

```bash
test -f docs/product-architecture/data-provider-sidecar-contracts.md
rg -n "app_settings|provider_configs|workflow_tasks|materials|categories|voices|digital_humans|publish_accounts" docs/product-architecture/data-provider-sidecar-contracts.md
rg -n "文案提取|文案改写|声音克隆|语音合成|数字人视频生成|平台发布" docs/product-architecture/data-provider-sidecar-contracts.md
rg -n "FFmpeg|Python|CosyVoice|HeyGem|Playwright|Tauri Updater" docs/product-architecture/data-provider-sidecar-contracts.md
```

预期：本地实体、Provider 能力和 sidecar 依赖全部可查到。

**验收标准：**

- 旧版静态字段被映射到新版实体或明确延期。
- Provider 和 sidecar 边界清楚，UI 不直接耦合本地服务。
- 发布账号敏感凭据不被定义为明文复制旧版行为。

---

### Task 6：形成 UI/UX 设计需求与阶段 4 handoff

**目标：** 标出哪些复杂页面和跨模块流程需要后续 UI/UX skill，哪些简单表单可直接进入实现计划，并输出阶段 4 的源码计划拆分顺序。

**允许修改文件：**

- 创建：`docs/product-architecture/ui-ux-and-phase-4-handoff.md`
- 修改：`docs/product-architecture/README.md`

**禁止修改文件：**

- `apps/`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：创建 UI/UX 需求矩阵**

创建 `docs/product-architecture/ui-ux-and-phase-4-handoff.md`，必须包含：

```md
# UI/UX 与阶段 4 Handoff

## UI/UX skill 需求矩阵

| 模块或流程 | 是否需要 UI/UX skill | 原因 | 设计产物建议路径 |
| --- | --- | --- | --- |
| 桌面工作台主 workflow | yes | 7 步旧流程映射到 8 阶段，涉及预览、任务状态、草稿、发布准备和高频操作效率。 | `docs/product-architecture/design-decisions/workbench-workflow.md` |
| 设置 / Provider / sidecar | yes | 配置项多，涉及密钥、本地依赖、输出目录、提示词、数据、更新，需要清晰分组和错误状态。 | `docs/product-architecture/design-decisions/settings-provider-sidecar.md` |
| 声音管理 | yes | 上传/录音、训练、合成、试听、库管理在同页，状态较多。 | `docs/product-architecture/design-decisions/voice-management.md` |
| 形象管理 | yes | 上传规范、训练状态、预览和库管理需要明确交互。 | `docs/product-architecture/design-decisions/avatar-management.md` |
| 素材管理 | yes | 分类、上传、搜索、批量操作、向量化延期能力需要可扩展布局。 | `docs/product-architecture/design-decisions/materials-management.md` |
| 任务中心 | yes | 状态、进度、失败原因、重试、打开产物和发布结果需要高信息密度设计。 | `docs/product-architecture/design-decisions/task-center.md` |
| 账号管理 + 发布链路 | yes | 平台账号、授权状态、发布模式和任务结果跨模块。 | `docs/product-architecture/design-decisions/account-publish-flow.md` |
| 帮助 / 日志 / 软件更新 | no | 低频入口，可直接按设置子页和支持入口实现。 | N/A |
```

- [x] **Step 2：补充阶段 4 implementation plan 队列**

追加：

```md
## 阶段 4 计划拆分建议

| 阶段 4 计划 | 优先级 | 依赖阶段 3 文档 | 预计源码范围 | 验证方向 |
| --- | --- | --- | --- | --- |
| 工作台 workflow 信息架构和状态拆分 | P0 | `workflow-and-release-chain.md`、`engineering-module-map.md` | `apps/desktop`、`@mirax/core` | `pnpm test packages/core`、`pnpm typecheck` |
| 设置 / Provider / sidecar 配置 | P0 | `data-provider-sidecar-contracts.md`、`engineering-module-map.md` | `apps/desktop`、`@mirax/core`、`@mirax/local-store`、`@mirax/sidecar-manager` | `pnpm test`、`pnpm typecheck` |
| 发布准备与 mock 发布任务 | P0 | `workflow-and-release-chain.md`、`data-provider-sidecar-contracts.md` | `apps/desktop`、`@mirax/provider-publish`、`@mirax/local-store` | provider-publish tests、desktop typecheck |
| 声音管理 mock 资产流 | P1 | `legacy-function-to-information-architecture.md`、`data-provider-sidecar-contracts.md` | `apps/desktop`、`@mirax/provider-ai`、`@mirax/local-store` | local-store/provider tests、typecheck |
| 形象管理 mock 资产流 | P1 | `legacy-function-to-information-architecture.md`、`data-provider-sidecar-contracts.md` | `apps/desktop`、`@mirax/provider-ai`、`@mirax/local-store` | local-store/provider tests、typecheck |
| 素材管理本地上传/分类/搜索 | P1 | `data-provider-sidecar-contracts.md`、`engineering-module-map.md` | `apps/desktop`、`@mirax/media-pipeline`、`@mirax/local-store` | media/local-store tests、typecheck |
| 任务中心统一状态和结果入口 | P1 | `workflow-and-release-chain.md` | `apps/desktop`、`@mirax/core`、`@mirax/local-store` | core/local-store tests、typecheck |
| 账号管理 mock 与真实授权预留 | P1 | `data-provider-sidecar-contracts.md` | `apps/desktop`、`@mirax/provider-publish`、`@mirax/sidecar-manager` | provider-publish tests、typecheck |
| 帮助、日志、更新、数据管理低频入口 | P2 | `legacy-function-to-information-architecture.md`、`data-provider-sidecar-contracts.md` | `apps/desktop`、`@mirax/local-store`、Tauri updater 后续 | typecheck、manual smoke |
```

- [x] **Step 3：补充阶段 4 禁止事项**

追加：

```md
## 阶段 4 禁止事项

- 不把阶段 3 的映射文档当作旧版行为已完全验证的证明；遇到低可信度证据必须保留待确认问题。
- 不实现真实平台自动发布，除非已有单独计划处理 Playwright sidecar、平台规则和账号授权。
- 不把视频号列为已支持平台；静态分析未找到 `shipinhao` / `视频号` 明确证据。
- 不在 UI 层直接写死旧版 IPC 名称；旧版 IPC 只作为语义参考。
- 不因源码实现通过就更新 `legacy-ui-gap-list.md` 状态列；只有计划明确要求且验收通过时才能更新。
```

- [x] **Step 4：运行验证**

```bash
test -f docs/product-architecture/ui-ux-and-phase-4-handoff.md
rg -n "UI/UX skill|阶段 4|P0|P1|P2" docs/product-architecture/ui-ux-and-phase-4-handoff.md
rg -n "工作台|设置|发布|声音|形象|素材|任务中心|账号管理" docs/product-architecture/ui-ux-and-phase-4-handoff.md
```

预期：UI/UX 需求、阶段 4 队列和禁止事项可查到。

**验收标准：**

- 复杂页面和跨模块流程均标记是否需要 UI/UX skill。
- 阶段 4 队列覆盖用户要求的所有模块。
- 后续源码实现范围和验证方向足够具体。

---

### Task 7：阶段 3 汇总、自检与项目状态更新

**目标：** 校验阶段 3 所有映射产物完整性，更新 `PROJECT-STATE.md` 让新会话能从阶段 3 恢复，并把下一步明确为阶段 4 implementation plans。

**允许修改文件：**

- 修改：`docs/superpowers/PROJECT-STATE.md`
- 修改：`docs/product-architecture/README.md`

**禁止修改文件：**

- `apps/`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：运行阶段 3 全局验证**

```bash
test -f docs/product-architecture/README.md
test -f docs/product-architecture/stage-3-source-inventory.md
test -f docs/product-architecture/legacy-function-to-information-architecture.md
test -f docs/product-architecture/engineering-module-map.md
test -f docs/product-architecture/workflow-and-release-chain.md
test -f docs/product-architecture/data-provider-sidecar-contracts.md
test -f docs/product-architecture/ui-ux-and-phase-4-handoff.md
rg -n "FC-HOME-PIPELINE|FC-ASSET-MANAGEMENT|FC-PROVIDER-SETTINGS|FC-PUBLISH-PREP" docs/product-architecture
rg -n "PAGE-HOME-WORKBENCH|PAGE-VOICE-MANAGEMENT|PAGE-AVATAR-MANAGEMENT|PAGE-MATERIALS|PAGE-TASK-CENTER|PAGE-ACCOUNT-MANAGEMENT|PAGE-SETTINGS|PAGE-PUBLISH-FLOW|PAGE-SECONDARY-ENTRYPOINTS" docs/product-architecture
rg -n "桌面工作台|素材管理|声音管理|形象管理|任务中心|账号管理|设置|Provider|sidecar|本地数据|发布链路" docs/product-architecture
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
```

预期：所有文件存在；所有旧版功能卡、页面卡和目标模块都能查到；`legacy-ui-gap-list.md` 无 diff。

- [x] **Step 2：更新 README 完成状态**

在 `docs/product-architecture/README.md` 追加：

```md
## 阶段 3 完成状态

阶段 3 完成后，本目录应能支持两种读取方式：

- 产品视角：从 `legacy-function-to-information-architecture.md` 查看旧版能力在新版导航和用户流程中的归属。
- 工程视角：从 `engineering-module-map.md`、`workflow-and-release-chain.md`、`data-provider-sidecar-contracts.md` 查看后续源码计划的模块边界。

下一步是阶段 4：按 `ui-ux-and-phase-4-handoff.md` 的队列创建面向源码实现的 implementation plans。
```

- [x] **Step 3：更新 PROJECT-STATE**

将 `docs/superpowers/PROJECT-STATE.md` 更新为：

- 当前阶段：阶段 3 已完成，或如果只完成部分任务则写明当前 Task。
- 当前自动调度入口：`docs/superpowers/plans/2026-06-15-stage-3-architecture-mapping.md`。
- 最新可执行任务：阶段 4，按 `docs/product-architecture/ui-ux-and-phase-4-handoff.md` 创建 implementation plans。
- 进度入口中新增 `docs/product-architecture/README.md`。
- 下一步中说明不要重复执行阶段 2 Task 1 → Task 6，不要重复创建阶段 3 已完成文档。

- [x] **Step 4：运行最终验证**

```bash
rg -n "阶段 3|阶段 4|product-architecture|2026-06-15-stage-3-architecture-mapping" docs/superpowers/PROJECT-STATE.md
rg -n "阶段 3 完成状态|下一步是阶段 4" docs/product-architecture/README.md
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
git status --short
```

预期：`PROJECT-STATE.md` 指向阶段 3 和阶段 4；README 有完成状态；`legacy-ui-gap-list.md` 无 diff；git status 只包含阶段 3 文档和项目状态更新。

**验收标准：**

- 新会话能从 `PROJECT-STATE.md` 找到阶段 3 产物和阶段 4 下一步。
- 阶段 3 所有目标模块均已映射。
- 没有源码改动，没有 gap-list 状态列改动，没有 commit/push。

---

## 最终交付格式

执行本计划的工位完成任一 Task 后按以下格式汇报：

```text
STATUS: DONE | BLOCKED | IN_PROGRESS
CURRENT TASK:
- <Task 编号和名称>
CHANGED FILES:
- <文件路径>
VERIFICATION:
- <命令> -> <结果>
NOTES:
- <风险、待确认问题、是否触碰禁止文件>
```

阶段 3 全部完成时，`STATUS` 必须为 `DONE`，并明确说明：

- 是否创建了 `docs/product-architecture/` 下全部 6 份映射文档。
- 是否更新了 `docs/superpowers/PROJECT-STATE.md`。
- 是否确认 `docs/reverse-engineering/legacy-ui-gap-list.md` 无 diff。
- 是否未修改源码、未 commit、未 push。

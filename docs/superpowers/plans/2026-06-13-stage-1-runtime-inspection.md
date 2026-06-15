# 阶段 1：旧版运行态全量巡检实施计划

> **面向智能体工位：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务执行。步骤使用 复选框（`- [ ]`）记录进度。

**目标：** 优先使用用户手动提供的旧版「轻语 IP 智能体」界面截图，按页面和流程完整记录运行态证据、页面结构、受限动作和初版功能卡。只有截图缺失、信息不清或需要确认交互状态时，才补充打开旧版 App。

**架构：** 本阶段只做运行态观察和文档记录，不实现新版功能。证据统一登记到 `evidence-index.md`，页面观察写入 `pages/`，影响新版实现决策的能力写入 `function-cards/`，受限动作写入 `runtime-blockers.md`。

**技术栈：** Markdown、Git、ripgrep、macOS 截图或录屏工具、旧版 App、阶段 0 文档模板。

---

## Resume Here

当前自动调度入口：`docs/superpowers/plans/2026-06-13-stage-1-runtime-inspection.md`。

当前阶段：阶段 1，`旧版运行态全量巡检`。

执行顺序：先使用 `docs/截图/` 的人工截图补齐 P0 和 P1 页面卡；截图无法确认的交互、弹窗、受限动作，再按 P0 → P1 → P2 页面优先级补充运行态观察。

本阶段不分析 DMG、ASAR、preload API 或旧包源码；这些属于阶段 2 静态补证。本阶段也不更新 `legacy-ui-gap-list.md` 的状态列。

## 人工截图输入

用户已在 `docs/截图/` 提供旧版界面截图。它们是阶段 1 的首选运行态证据输入：

| 证据 ID | 截图 | 页面卡 | 功能卡 | 使用方式 |
| --- | --- | --- | --- | --- |
| EV-RUNTIME-001 | `docs/截图/首页.png` | PAGE-HOME-WORKBENCH | FC-HOME-PIPELINE | 作为首页工作台补充证据，校对首页页面卡。 |
| EV-RUNTIME-010 | `docs/截图/设置.png` | PAGE-SETTINGS | FC-PROVIDER-SETTINGS | 先基于截图创建设置页页面卡；保存、连通、校验动作如不可见再补证。 |
| EV-RUNTIME-100 | `docs/截图/声音管理.png` | PAGE-VOICE-MANAGEMENT | FC-ASSET-MANAGEMENT | 基于截图记录声音列表、上传、克隆、试听和状态入口。 |
| EV-RUNTIME-110 | `docs/截图/形象管理.png` | PAGE-AVATAR-MANAGEMENT | FC-ASSET-MANAGEMENT | 基于截图记录形象列表、上传、训练或生成入口和状态。 |
| EV-RUNTIME-120 | `docs/截图/素材管理.png` | PAGE-MATERIALS | FC-ASSET-MANAGEMENT | 基于截图记录素材分类、上传、搜索、标签和预览。 |
| EV-RUNTIME-130 | `docs/截图/任务中心.png` | PAGE-TASK-CENTER | FC-ASSET-MANAGEMENT | 基于截图记录任务列表、状态、进度、失败原因和结果入口。 |
| EV-RUNTIME-140 | `docs/截图/账号管理.png` | PAGE-ACCOUNT-MANAGEMENT | FC-ASSET-MANAGEMENT | 基于截图记录平台账号、登录状态、添加和授权入口。 |

执行规则：

- 先读截图并写页面卡，不要因为没有操作旧版 App 而阻塞。
- 只对截图看不清、截图没有覆盖或会影响新版实现决策的交互补充运行态操作。
- 截图只能证明可见页面结构和控件；真实点击、保存、生成、发布、登录、授权等动作仍按实际观察记录为 E1 或受限 E2。
- `docs/截图/` 作为原始输入目录保留；如后续需要规范化资产，再复制到 `docs/reverse-engineering/assets/screenshots/` 并新增资产记录。

## 范围

本计划覆盖：

- 建立阶段 1 的运行态证据编号范围，并登记 `docs/截图/` 的人工截图输入。
- 巡检 P0 页面：首页工作台、发布流程、设置。
- 巡检 P1 页面：声音管理、形象管理、素材管理、任务中心、账号管理。
- 巡检 P2 页面：帮助、关于、弹窗提示、边缘状态和低频入口。
- 为影响新版实现决策的能力创建初版功能卡。
- 为登录、激活、云服务、模型、平台或本地依赖限制创建运行障碍记录。
- 更新 `PROJECT-STATE.md`，说明阶段 1 当前进度和下一步。

本计划不覆盖：

- 不做权限、登录、激活或付费限制绕过。
- 不复用旧版混淆代码或生产代码。
- 不实现 Mirax AI 新功能。
- 不把大型录屏、DMG、解包目录、批量抽帧或模型文件提交到 Git。
- 不为已有人工截图重复创建截图任务，除非现有截图看不清、覆盖不完整或需要确认交互状态。

## 目标文件结构

```text
docs/
  superpowers/
    PROJECT-STATE.md
    plans/
      2026-06-13-stage-1-runtime-inspection.md
  reverse-engineering/
    evidence-index.md
    assets-index.md
    runtime-blockers.md
    pages/
      PAGE-HOME-WORKBENCH.md
      PAGE-SETTINGS.md
      PAGE-PUBLISH-FLOW.md
      PAGE-VOICE-MANAGEMENT.md
      PAGE-AVATAR-MANAGEMENT.md
      PAGE-MATERIALS.md
      PAGE-TASK-CENTER.md
      PAGE-ACCOUNT-MANAGEMENT.md
      PAGE-SECONDARY-ENTRYPOINTS.md
    function-cards/
      FC-HOME-PIPELINE.md
      FC-PROVIDER-SETTINGS.md
      FC-PUBLISH-PREP.md
      FC-ASSET-MANAGEMENT.md
    assets/
      screenshots/
```

## 证据编号约定

阶段 1 运行态证据使用以下 ID：

| 范围 | 用途 |
| --- | --- |
| EV-RUNTIME-001 到 EV-RUNTIME-099 | P0 页面和核心流程。 |
| EV-RUNTIME-100 到 EV-RUNTIME-199 | P1 管理页面，其中 100/110/120/130/140 分别对应声音、形象、素材、任务中心、账号管理。 |
| EV-RUNTIME-200 到 EV-RUNTIME-299 | P2 辅助入口、弹窗和边缘状态。 |

新增规范截图命名格式：

```text
docs/reverse-engineering/assets/screenshots/YYYY-MM-DD-page-or-feature-brief.png
```

如果使用完整录屏，不提交录屏文件，只在 `assets-index.md` 记录本机路径或外部位置。用户手动截图已保留在 `docs/截图/`，不需要为命名规范重复搬迁。

## 验证命令

每个任务完成后至少运行：

```bash
rg -n "EV-RUNTIME|PAGE-|FC-|RB-" docs/reverse-engineering/evidence-index.md docs/reverse-engineering/pages docs/reverse-engineering/function-cards docs/reverse-engineering/runtime-blockers.md
```

最终提交前运行：

```bash
test -f docs/reverse-engineering/pages/PAGE-HOME-WORKBENCH.md
test -f docs/reverse-engineering/pages/PAGE-SETTINGS.md
test -f docs/reverse-engineering/pages/PAGE-PUBLISH-FLOW.md
test -f docs/reverse-engineering/pages/PAGE-VOICE-MANAGEMENT.md
test -f docs/reverse-engineering/pages/PAGE-AVATAR-MANAGEMENT.md
test -f docs/reverse-engineering/pages/PAGE-MATERIALS.md
test -f docs/reverse-engineering/pages/PAGE-TASK-CENTER.md
test -f docs/reverse-engineering/pages/PAGE-ACCOUNT-MANAGEMENT.md
test -f docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md
test -f docs/reverse-engineering/function-cards/FC-HOME-PIPELINE.md
test -f docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md
test -f docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md
test -f docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md
rg -n "EV-RUNTIME-001|EV-RUNTIME-010|EV-RUNTIME-100|EV-RUNTIME-110|EV-RUNTIME-120|EV-RUNTIME-130|EV-RUNTIME-140|EV-RUNTIME-200" docs/reverse-engineering/evidence-index.md
rg -n "阶段 1|旧版运行态全量巡检|阶段 2" docs/superpowers/PROJECT-STATE.md
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
```

预期：文件存在；证据 ID 能查到；`PROJECT-STATE.md` 指向阶段 1；`legacy-ui-gap-list.md` 没有状态变更。

---

### Task 1：准备运行态巡检记录

**文件：**

- 修改：`docs/superpowers/PROJECT-STATE.md`
- 修改：`docs/reverse-engineering/evidence-index.md`
- 修改：`docs/reverse-engineering/assets-index.md`

- [x] **Step 1：更新项目状态为阶段 1**

把 `docs/superpowers/PROJECT-STATE.md` 中的「当前阶段」更新为：

```md
## 当前阶段

阶段 1：旧版运行态全量巡检。

阶段 1 的目标是在可打开但可能受限的旧版 App 中记录页面、控件、状态、提示、受限动作和初版功能卡。本阶段只做运行态观察，不做静态分析和权限绕过。
```

把「最新可执行任务」更新为：

```md
## 最新可执行任务

执行 `docs/superpowers/plans/2026-06-13-stage-1-runtime-inspection.md`，优先使用 `docs/截图/` 的人工截图创建页面卡和功能卡，再按 P0 → P1 → P2 页面优先级补充截图无法确认的旧版 App 运行态观察。

不要更新 `docs/reverse-engineering/legacy-ui-gap-list.md` 的状态列。发现差距只记录到页面卡、功能卡或运行障碍记录。
```

- [x] **Step 2：登记阶段 1 证据范围**

在 `docs/reverse-engineering/evidence-index.md` 的 `## Records` 表格末尾追加：

```md
| EV-RUNTIME-001 | E1 | high | 运行态观察 / 人工截图 | P0 首页工作台截图和运行态观察，覆盖首页 7 步生产流程。 | `docs/reverse-engineering/assets/screenshots/2026-06-13-home-workbench-overview.png`; `docs/截图/首页.png` | PAGE-HOME-WORKBENCH | FC-HOME-PIPELINE | Codex | 2026-06-13 |
| EV-RUNTIME-010 | E1 | high | 人工截图 | P0 设置页人工截图，执行 Task 3 时基于截图补页面卡；受限动作另记运行障碍。 | `docs/截图/设置.png` | PAGE-SETTINGS | FC-PROVIDER-SETTINGS | Codex | 2026-06-13 |
| EV-RUNTIME-020 | E2 | medium | 运行态观察 | P0 发布流程巡检证据占位，执行 Task 4 时补充平台账号和发布受限情况。 | `docs/reverse-engineering/pages/PAGE-PUBLISH-FLOW.md` | PAGE-PUBLISH-FLOW | FC-PUBLISH-PREP | Codex | 2026-06-13 |
| EV-RUNTIME-100 | E1 | high | 人工截图 | P1 声音管理页人工截图。 | `docs/截图/声音管理.png` | PAGE-VOICE-MANAGEMENT | FC-ASSET-MANAGEMENT | Codex | 2026-06-13 |
| EV-RUNTIME-110 | E1 | high | 人工截图 | P1 形象管理页人工截图。 | `docs/截图/形象管理.png` | PAGE-AVATAR-MANAGEMENT | FC-ASSET-MANAGEMENT | Codex | 2026-06-13 |
| EV-RUNTIME-120 | E1 | high | 人工截图 | P1 素材管理页人工截图。 | `docs/截图/素材管理.png` | PAGE-MATERIALS | FC-ASSET-MANAGEMENT | Codex | 2026-06-13 |
| EV-RUNTIME-130 | E1 | high | 人工截图 | P1 任务中心页人工截图。 | `docs/截图/任务中心.png` | PAGE-TASK-CENTER | FC-ASSET-MANAGEMENT | Codex | 2026-06-13 |
| EV-RUNTIME-140 | E1 | high | 人工截图 | P1 账号管理页人工截图。 | `docs/截图/账号管理.png` | PAGE-ACCOUNT-MANAGEMENT | FC-ASSET-MANAGEMENT | Codex | 2026-06-13 |
| EV-RUNTIME-200 | E2 | low | 运行态观察 | P2 辅助入口和弹窗巡检证据占位，执行 Task 6 时补充帮助、关于、低频入口和边缘状态。 | `docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md` | PAGE-SECONDARY-ENTRYPOINTS | N/A | Codex | 2026-06-13 |
```

- [x] **Step 3：提交巡检准备**

```bash
git add docs/superpowers/PROJECT-STATE.md docs/reverse-engineering/evidence-index.md docs/reverse-engineering/assets-index.md
git commit -m "docs: prepare stage 1 runtime inspection"
```

### Task 2：巡检 P0 首页工作台

**文件：**

- 创建：`docs/reverse-engineering/pages/PAGE-HOME-WORKBENCH.md`
- 创建：`docs/reverse-engineering/function-cards/FC-HOME-PIPELINE.md`
- 修改：`docs/reverse-engineering/assets-index.md`
- 修改：`docs/reverse-engineering/runtime-blockers.md`

- [x] **Step 1：打开旧版 App 并记录首页入口**

打开旧版 App 后，优先进入首页或默认工作台。记录左侧导航、顶部模式、主工作区模块、输入框、按钮、状态提示和可见产物区域。

如需要截图，截图放在：

```text
docs/reverse-engineering/assets/screenshots/2026-06-13-home-workbench-overview.png
```

如果截图未提交到 Git，只在 `assets-index.md` 记录本机路径。

- [x] **Step 2：创建首页页面卡**

创建 `docs/reverse-engineering/pages/PAGE-HOME-WORKBENCH.md`，使用 `page-inspection-template.md` 字段，至少记录：

```md
# PAGE-HOME-WORKBENCH：首页工作台

## 身份信息

| 字段 | 值 |
| --- | --- |
| 页面 ID | PAGE-HOME-WORKBENCH |
| 页面名称 | 首页工作台 |
| 旧版入口路径 | 启动旧版 App 后默认首页，或左侧导航「首页」 |
| 巡检优先级 | P0 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-RUNTIME-001 |
| 最高证据等级 | E1 |
| 可信度 | medium |
| 关联资产 | 记录到 `assets-index.md` |

## 页面区域

| 区域 | 可见内容 | 备注 |
| --- | --- | --- |
| 左侧导航 | 记录所有可见导航项 | 不评价旧版视觉风格 |
| 顶部区域 | 记录模式、状态、账号或设置入口 | 只记录信息结构 |
| 主工作区 | 记录可见模块、编号、卡片、输入输出区域 | 对应核心生产流程 |

## 可见控件

| 控件 | 类型 | 启用状态 | 观察到的行为 |
| --- | --- | --- | --- |
| 首页核心流程按钮 | button | 记录观察结果 | 记录点击后是否进入下一步、弹窗或受限状态 |

## 受限动作

| 动作 | 障碍 | 运行障碍 ID |
| --- | --- | --- |
| 触发真实生成能力 | 如受限则记录登录、激活、模型或云服务限制 | 需要时新增 RB-HOME-001 |
```

- [x] **Step 3：创建首页流程功能卡**

创建 `docs/reverse-engineering/function-cards/FC-HOME-PIPELINE.md`，至少记录首页工作台代表的核心链路：

```md
# FC-HOME-PIPELINE：首页生产流程

## 身份信息

| 字段 | 值 |
| --- | --- |
| 功能 ID | FC-HOME-PIPELINE |
| 功能名称 | 首页短视频生产流程 |
| 旧版入口 | PAGE-HOME-WORKBENCH |
| Mirax AI 归属模块 | 桌面工作台 |
| 优先级 | P0 |
| 关联 gap-list 行 | 学习对标、改写文案、声音生成、视频生成、一键成片、标题封面、视频发布 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-RUNTIME-001 |
| 最高证据等级 | E1 |
| 可信度 | medium |
| 冲突说明 | N/A |

## 用户目标

用户希望从对标素材或输入内容出发，完成文案、声音、数字人、成片和发布准备的完整链路。

## Mirax AI 实现建议

决策：重做。

理由：复刻旧版能力和流程，但使用 Mirax AI 的新版信息架构与视觉设计。
```

- [x] **Step 4：提交首页巡检**

```bash
git add docs/reverse-engineering/pages/PAGE-HOME-WORKBENCH.md docs/reverse-engineering/function-cards/FC-HOME-PIPELINE.md docs/reverse-engineering/assets-index.md docs/reverse-engineering/runtime-blockers.md
git commit -m "docs: inspect legacy home workbench"
```

### Task 3：巡检 P0 设置页

**文件：**

- 创建：`docs/reverse-engineering/pages/PAGE-SETTINGS.md`
- 创建：`docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md`
- 修改：`docs/reverse-engineering/runtime-blockers.md`

- [x] **Step 1：基于截图记录设置配置项**

先读取 `docs/截图/设置.png`，记录模型配置、密钥、Base URL、服务状态、本地依赖、账号或授权相关入口。只有截图无法确认保存、连通、校验或授权状态时，才补充打开旧版 App。

- [x] **Step 2：创建设置页页面卡**

创建 `docs/reverse-engineering/pages/PAGE-SETTINGS.md`，记录：

```md
# PAGE-SETTINGS：设置页

## 身份信息

| 字段 | 值 |
| --- | --- |
| 页面 ID | PAGE-SETTINGS |
| 页面名称 | 设置 |
| 旧版入口路径 | 左侧导航「设置」或顶部设置入口 |
| 巡检优先级 | P0 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-RUNTIME-010 |
| 最高证据等级 | E1 |
| 可信度 | high |
| 关联资产 | 记录到 `assets-index.md` |

## 表单字段

| 字段 | 输入类型 | 默认值或示例值 | 校验或帮助文案 |
| --- | --- | --- | --- |
| 模型配置 | 巡检时记录实际值 | 巡检时记录实际值 | 巡检时记录实际值 |
| 本地依赖配置 | 巡检时记录实际值 | 巡检时记录实际值 | 巡检时记录实际值 |
| 授权或账号配置 | 巡检时记录实际值 | 巡检时记录实际值 | 巡检时记录实际值 |
```

- [x] **Step 3：创建 Provider 设置功能卡**

创建 `docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md`，说明旧版设置如何映射到 Mirax AI 的 Provider、sidecar 和本地配置。

- [x] **Step 4：提交设置页巡检**

```bash
git add docs/reverse-engineering/pages/PAGE-SETTINGS.md docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md docs/reverse-engineering/runtime-blockers.md
git commit -m "docs: inspect legacy settings page"
```

### Task 4：巡检 P0 发布流程

**文件：**

- 创建：`docs/reverse-engineering/pages/PAGE-PUBLISH-FLOW.md`
- 创建：`docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md`
- 修改：`docs/reverse-engineering/runtime-blockers.md`

- [x] **Step 1：记录发布入口和账号状态**

先从 `docs/截图/首页.png`、`docs/截图/任务中心.png`、`docs/截图/账号管理.png` 里查找发布入口、任务结果和账号状态线索。截图不足以确认发布前确认页时，再从首页、任务中心或账号管理页进入发布相关流程，记录平台、账号、标题、描述、封面、话题、发布时间、草稿或直接发布等控件。

- [x] **Step 2：创建发布流程页面卡**

创建 `docs/reverse-engineering/pages/PAGE-PUBLISH-FLOW.md`，记录发布前确认、平台选择、账号状态和受限动作。

- [x] **Step 3：创建发布准备功能卡**

创建 `docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md`，说明旧版发布准备能力如何映射到 Mirax AI 的发布 Provider 和任务中心。

- [x] **Step 4：提交发布流程巡检**

```bash
git add docs/reverse-engineering/pages/PAGE-PUBLISH-FLOW.md docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md docs/reverse-engineering/runtime-blockers.md
git commit -m "docs: inspect legacy publish flow"
```

### Task 5：巡检 P1 管理页面

**文件：**

- 创建：`docs/reverse-engineering/pages/PAGE-VOICE-MANAGEMENT.md`
- 创建：`docs/reverse-engineering/pages/PAGE-AVATAR-MANAGEMENT.md`
- 创建：`docs/reverse-engineering/pages/PAGE-MATERIALS.md`
- 创建：`docs/reverse-engineering/pages/PAGE-TASK-CENTER.md`
- 创建：`docs/reverse-engineering/pages/PAGE-ACCOUNT-MANAGEMENT.md`
- 创建：`docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md`
- 修改：`docs/reverse-engineering/runtime-blockers.md`

- [x] **Step 1：巡检声音管理**

读取 `docs/截图/声音管理.png`，记录声音列表、上传入口、克隆入口、试听、状态、删除或编辑动作，写入 `PAGE-VOICE-MANAGEMENT.md`。截图无法确认的点击行为再补充运行态观察。

- [x] **Step 2：巡检形象管理**

读取 `docs/截图/形象管理.png`，记录数字人形象列表、上传入口、训练或生成入口、封面、状态、删除或编辑动作，写入 `PAGE-AVATAR-MANAGEMENT.md`。截图无法确认的点击行为再补充运行态观察。

- [x] **Step 3：巡检素材管理**

读取 `docs/截图/素材管理.png`，记录素材分类、上传入口、搜索、标签、预览、删除或编辑动作，写入 `PAGE-MATERIALS.md`。截图无法确认的点击行为再补充运行态观察。

- [x] **Step 4：巡检任务中心**

读取 `docs/截图/任务中心.png`，记录任务列表、状态、进度、失败原因、重试、查看结果等动作，写入 `PAGE-TASK-CENTER.md`。截图无法确认的点击行为再补充运行态观察。

- [x] **Step 5：巡检账号管理**

读取 `docs/截图/账号管理.png`，记录平台账号列表、登录状态、添加账号、删除账号、浏览器 profile 或授权提示，写入 `PAGE-ACCOUNT-MANAGEMENT.md`。截图无法确认的授权弹窗或登录状态再补充运行态观察。

- [x] **Step 6：创建资产管理功能卡**

创建 `docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md`，把声音、形象、素材、账号等管理能力映射到 Mirax AI 的资源管理模块。

- [x] **Step 7：提交 P1 管理页面巡检**

```bash
git add docs/reverse-engineering/pages/PAGE-VOICE-MANAGEMENT.md docs/reverse-engineering/pages/PAGE-AVATAR-MANAGEMENT.md docs/reverse-engineering/pages/PAGE-MATERIALS.md docs/reverse-engineering/pages/PAGE-TASK-CENTER.md docs/reverse-engineering/pages/PAGE-ACCOUNT-MANAGEMENT.md docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md docs/reverse-engineering/runtime-blockers.md
git commit -m "docs: inspect legacy management pages"
```

### Task 6：巡检 P2 辅助入口和边缘状态

**文件：**

- 创建：`docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md`
- 修改：`docs/reverse-engineering/runtime-blockers.md`

- [x] **Step 1：巡检帮助、关于和低频入口**

记录帮助、关于、版本信息、更新提示、退出、导入导出、清理缓存等低频入口，写入 `PAGE-SECONDARY-ENTRYPOINTS.md`。

- [x] **Step 2：记录通用弹窗和边缘状态**

记录确认弹窗、错误提示、空状态、加载状态、离线状态、依赖缺失提示和受限提示。

- [x] **Step 3：提交 P2 巡检**

```bash
git add docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md docs/reverse-engineering/runtime-blockers.md
git commit -m "docs: inspect legacy secondary entrypoints"
```

### Task 7：阶段 1 汇总与下一步

**文件：**

- 修改：`docs/superpowers/PROJECT-STATE.md`
- 修改：`docs/reverse-engineering/evidence-index.md`
- 修改：`docs/reverse-engineering/assets-index.md`

- [x] **Step 1：补齐索引链接**

确认 `evidence-index.md` 和 `assets-index.md` 中的运行态证据都能跳转到页面卡、功能卡或资产记录。

- [x] **Step 2：更新项目状态**

把 `PROJECT-STATE.md` 的「下一步」更新为：

```md
## 下一步

阶段 1 完成后，使用 `superpowers:writing-plans` 创建阶段 2：旧包静态分析补盲区实施计划。

阶段 2 只处理阶段 1 中的 E2、E4、E5 以及信息不足的 E3 证据，不复用旧版混淆代码或生产代码。
```

- [x] **Step 3：运行最终验证**

```bash
test -f docs/reverse-engineering/pages/PAGE-HOME-WORKBENCH.md
test -f docs/reverse-engineering/pages/PAGE-SETTINGS.md
test -f docs/reverse-engineering/pages/PAGE-PUBLISH-FLOW.md
test -f docs/reverse-engineering/pages/PAGE-VOICE-MANAGEMENT.md
test -f docs/reverse-engineering/pages/PAGE-AVATAR-MANAGEMENT.md
test -f docs/reverse-engineering/pages/PAGE-MATERIALS.md
test -f docs/reverse-engineering/pages/PAGE-TASK-CENTER.md
test -f docs/reverse-engineering/pages/PAGE-ACCOUNT-MANAGEMENT.md
test -f docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md
test -f docs/reverse-engineering/function-cards/FC-HOME-PIPELINE.md
test -f docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md
test -f docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md
test -f docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md
rg -n "EV-RUNTIME-001|EV-RUNTIME-010|EV-RUNTIME-100|EV-RUNTIME-110|EV-RUNTIME-120|EV-RUNTIME-130|EV-RUNTIME-140|EV-RUNTIME-200" docs/reverse-engineering/evidence-index.md
rg -n "阶段 1|旧版运行态全量巡检|阶段 2" docs/superpowers/PROJECT-STATE.md
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
```

预期：所有文件存在；证据索引和状态入口可查；`legacy-ui-gap-list.md` 无状态变更。

- [x] **Step 4：提交阶段 1 汇总**

```bash
git add docs/superpowers/PROJECT-STATE.md docs/reverse-engineering/evidence-index.md docs/reverse-engineering/assets-index.md
git commit -m "docs: complete legacy runtime inspection"
```

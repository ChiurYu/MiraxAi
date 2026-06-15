# 阶段 2：旧包静态分析补盲区实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对阶段 1 遗留的 E2/E4/E5 证据和来源不足的 E3 证据，通过旧版 DMG、解包 ASAR、preload API、本地配置和旧仓库线索进行静态补证，确认模块名、接口名、字段、服务依赖和数据流，为 Mirax AI 新版 Provider、sidecar 和数据模型设计提供依据。

**Architecture:** 按 P0 → P1 → P2 优先级推进；优先补齐影响核心工作流的发布流程和本地依赖配置，再补资产管理（声音/形象/素材/任务/账号），最后补辅助入口和边缘状态；所有发现统一登记为 `EV-STATIC-*` 或 `EV-INFER-*` 证据，写入 `docs/reverse-engineering/static-analysis/` 小文件，并反向更新 `evidence-index.md`、功能卡和运行障碍记录。

**Tech Stack:** macOS `hdiutil`（只读挂载 DMG）、`asar` 解包 Electron ASAR、`ripgrep`/`grep` 字符串搜索、`strings`/`plutil`/`sqlite3` 资源解析、Markdown 记录。

---

## Resume Here

**当前自动调度入口：** `docs/superpowers/plans/2026-06-15-stage-2-static-analysis.md`

**当前阶段：** 阶段 2：旧包静态分析补盲区。

**已完成任务：** 阶段 1 运行态全量巡检已完成；阶段 2 Task 1/2/3/4 已完成，已登记旧版 DMG 资产、阶段 2 证据范围，建立解包与搜索工作流笔记，完成 P0 发布流程静态补证和 P1 资产管理静态补证（声音/形象、素材/任务、账号/授权）。

**当前任务：** 从 Task 5 开始：P2 辅助入口与边缘状态静态补证。

**下一步：** 按 Task 5 → Task 6 顺序执行。

**验证命令：**

```bash
test -f "docs/superpowers/plans/2026-06-15-stage-2-static-analysis.md"
test -f "docs/reverse-engineering/static-analysis/.gitkeep"
rg -n "EV-STATIC|EV-INFER" docs/reverse-engineering/evidence-index.md docs/reverse-engineering/static-analysis/ docs/reverse-engineering/function-cards/ docs/reverse-engineering/pages/
```

---

## 范围

本计划覆盖：

- 登记旧版 DMG 资产位置与基本属性。
- 建立阶段 2 静态分析证据编号范围和 `static-analysis/` 文件命名约定。
- 对 P0 发布流程（EV-RUNTIME-020）做静态补证，确认发布调用链、平台接口、账号存储和任务创建逻辑。
- 对 P1 资产管理（EV-RUNTIME-100 至 140 对应的 E2 受限能力）做静态补证，确认声音/形象/素材/任务/账号的表结构、API 调用和状态字段。
- 对 P2 辅助入口（EV-RUNTIME-200）做静态补证，确认帮助、更新、数据设置、日志上传、依赖检查的实现方式。
- 更新 `evidence-index.md`、相关功能卡、页面卡和 `runtime-blockers.md`。
- 更新 `PROJECT-STATE.md`，将入口指向本计划，并说明阶段 2 进度。

本计划不覆盖：

- 不绕过登录、激活、会员或付费限制。
- 不复用旧版混淆代码或生产代码。
- 不修改 `docs/reverse-engineering/legacy-ui-gap-list.md` 状态列。
- 不将 DMG、解包目录或大型二进制资产提交到 Git。

---

## 证据编号约定

阶段 2 新增证据统一使用：

| 范围 | 用途 |
| --- | --- |
| EV-STATIC-001 到 EV-STATIC-099 | P0 核心流程静态分析（发布流程、设置/本地依赖）。 |
| EV-STATIC-100 到 EV-STATIC-199 | P1 资产管理静态分析（声音、形象、素材、任务、账号）。 |
| EV-STATIC-200 到 EV-STATIC-299 | P2 辅助入口与边缘状态静态分析。 |
| EV-INFER-001 起 | 基于静态分析做出的合理推断，必须标注不确定点。 |

静态分析记录文件命名：

```text
docs/reverse-engineering/static-analysis/SA-<area>-<brief>.md
```

例如：

- `SA-PUBLISH-FLOW.md`
- `SA-VOICE-AVATAR.md`
- `SA-MATERIALS-TASKS.md`
- `SA-ACCOUNTS-AUTH.md`
- `SA-SECONDARY-ENTRYPOINTS.md`

---

## 目标文件结构

```text
docs/
  superpowers/
    plans/
      2026-06-15-stage-2-static-analysis.md   # 本计划
  reverse-engineering/
    assets-index.md                            # 追加 DMG 资产记录
    evidence-index.md                          # 追加 EV-STATIC / EV-INFER
    runtime-blockers.md                        # 按静态发现更新补证方向 / 替代方案
    function-cards/
      FC-PUBLISH-PREP.md                       # 如证据升级则更新
      FC-ASSET-MANAGEMENT.md                   # 如证据升级则更新
      FC-PROVIDER-SETTINGS.md                  # 如本地依赖配置有新发现则更新
    static-analysis/
      SA-PUBLISH-FLOW.md
      SA-VOICE-AVATAR.md
      SA-MATERIALS-TASKS.md
      SA-ACCOUNTS-AUTH.md
      SA-SECONDARY-ENTRYPOINTS.md
```

---

## 验证命令

每个任务完成后至少运行：

```bash
rg -n "EV-STATIC|EV-INFER" docs/reverse-engineering/evidence-index.md docs/reverse-engineering/static-analysis/ docs/reverse-engineering/function-cards/ docs/reverse-engineering/pages/
test -f docs/reverse-engineering/static-analysis/SA-<task对应文件>.md
```

最终提交前运行：

```bash
test -f docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md
test -f docs/reverse-engineering/static-analysis/SA-VOICE-AVATAR.md
test -f docs/reverse-engineering/static-analysis/SA-MATERIALS-TASKS.md
test -f docs/reverse-engineering/static-analysis/SA-ACCOUNTS-AUTH.md
test -f docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md
rg -n "EV-STATIC-001|EV-STATIC-002|EV-STATIC-003|EV-STATIC-100|EV-STATIC-101|EV-STATIC-102|EV-STATIC-200" docs/reverse-engineering/evidence-index.md
rg -n "阶段 2|旧包静态分析|阶段 3" docs/superpowers/PROJECT-STATE.md
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
```

预期：静态分析文件存在；证据索引包含新增 EV-STATIC；`PROJECT-STATE.md` 指向阶段 2 计划；`legacy-ui-gap-list.md` 无状态变更。

---

### Task 1：准备静态分析环境与资产登记

**文件：**

- 修改：`docs/reverse-engineering/assets-index.md`
- 修改：`docs/reverse-engineering/evidence-index.md`

- [x] **Step 1：确认 DMG 可读并记录资产**

检查旧版 DMG 存在且可读取基本信息：

```bash
ls -lh "/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg"
hdiutil imageinfo "/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg" | head -20
```

预期输出：文件大小约 791MB，格式为 UDIF 只读压缩 DMG。

- [x] **Step 2：在资产索引登记 DMG**

在 `docs/reverse-engineering/assets-index.md` 的 `## 记录` 表格末尾追加：

```md
| ASSET-PKG-001 | EV-STATIC-001 | DMG 安装包 | 不提交 | `/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg` | 旧版「轻语 IP 智能体」5.0.0 苹果芯片版 DMG，用于阶段 2 静态分析。 | `docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md` 等 | 2026-06-15 |
```

- [x] **Step 3：登记阶段 2 证据范围**

在 `docs/reverse-engineering/evidence-index.md` 的 `## Records` 表格末尾追加占位记录：

```md
| EV-STATIC-001 | E3 | medium | 旧包静态分析 | 旧版 DMG 基本属性与挂载路径确认。 | `ASSET-PKG-001` | N/A | N/A | Codex | 2026-06-15 |
| EV-STATIC-002 | E3/E2 | medium | 旧包静态分析 | P0 发布流程静态补证：发布调用链、平台接口、账号存储。 | `docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md` | PAGE-PUBLISH-FLOW | FC-PUBLISH-PREP | Codex | 2026-06-15 |
| EV-STATIC-003 | E3/E2 | medium | 旧包静态分析 | P0 设置与本地依赖静态补证：模型配置、服务配置、依赖检查、输出目录。 | `docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md` | PAGE-SETTINGS、PAGE-SECONDARY-ENTRYPOINTS | FC-PROVIDER-SETTINGS | Codex | 2026-06-15 |
| EV-STATIC-100 | E3/E2 | medium | 旧包静态分析 | P1 声音与形象管理静态补证：CosyVoice / HeyGem 调用、训练/合成 API、表结构。 | `docs/reverse-engineering/static-analysis/SA-VOICE-AVATAR.md` | PAGE-VOICE-MANAGEMENT、PAGE-AVATAR-MANAGEMENT | FC-ASSET-MANAGEMENT | Codex | 2026-06-15 |
| EV-STATIC-101 | E3/E2 | medium | 旧包静态分析 | P1 素材与任务中心静态补证：素材表结构、FFmpeg 抽帧、任务状态机。 | `docs/reverse-engineering/static-analysis/SA-MATERIALS-TASKS.md` | PAGE-MATERIALS、PAGE-TASK-CENTER | FC-ASSET-MANAGEMENT | Codex | 2026-06-15 |
| EV-STATIC-102 | E3/E2 | medium | 旧包静态分析 | P1 账号管理与授权静态补证：平台账号表、浏览器 profile、Token 存储。 | `docs/reverse-engineering/static-analysis/SA-ACCOUNTS-AUTH.md` | PAGE-ACCOUNT-MANAGEMENT | FC-ASSET-MANAGEMENT、FC-PUBLISH-PREP | Codex | 2026-06-15 |
| EV-STATIC-200 | E3/E2 | low | 旧包静态分析 | P2 辅助入口与边缘状态静态补证：帮助、更新、数据设置、日志上传、依赖检查。 | `docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md` | PAGE-SECONDARY-ENTRYPOINTS | FC-PROVIDER-SETTINGS | Codex | 2026-06-15 |
```

- [x] **Step 4：运行验证**

```bash
rg -n "ASSET-PKG-001|EV-STATIC-001" docs/reverse-engineering/assets-index.md docs/reverse-engineering/evidence-index.md
```

预期：两条记录都能查到。

- [x] **Step 5：运行验证并汇报 diff**

运行本任务验证命令，确认新增或修改的文件符合预期。然后汇报当前 diff 摘要，等待总控验收，不要自行 commit：

```bash
rg -n "ASSET-PKG-001|EV-STATIC-001" docs/reverse-engineering/assets-index.md docs/reverse-engineering/evidence-index.md
git diff -- docs/reverse-engineering/assets-index.md docs/reverse-engineering/evidence-index.md
git status --short
```

预期：`ASSET-PKG-001` 和 `EV-STATIC-001` 可查到；本任务相关 diff 仅限指定文件；git status 中如有既有无关改动，只汇报不处理。

---

### Task 2：建立旧包解包与搜索工作流

**文件：**

- 创建：`docs/reverse-engineering/static-analysis/SA-WORKFLOW-NOTES.md`
- 修改：`docs/reverse-engineering/evidence-index.md`

- [x] **Step 1：只读挂载 DMG 并定位 App bundle**

```bash
MOUNT_DIR="$(mktemp -d)"
hdiutil attach "/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg" -readonly -mountpoint "$MOUNT_DIR" -nobrowse
find "$MOUNT_DIR" -maxdepth 3 -name "*.app" -type d
find "$MOUNT_DIR" -maxdepth 5 -name "*.asar" -type f
```

记录挂载路径、App bundle 路径和 ASAR 路径到 `SA-WORKFLOW-NOTES.md`。

- [x] **Step 2：解包 ASAR 到临时目录**

```bash
# 假设 ASAR 路径为 $ASAR_PATH
EXTRACT_DIR="$(mktemp -d)"
npx asar extract "$ASAR_PATH" "$EXTRACT_DIR"
find "$EXTRACT_DIR" -maxdepth 2 -type f | head -20
```

如 `asar` 不可用，先安装：

```bash
npm install -g asar
```

- [x] **Step 3：记录解包目录结构与搜索策略**

在 `docs/reverse-engineering/static-analysis/SA-WORKFLOW-NOTES.md` 中写入：

```md
# SA-WORKFLOW-NOTES：阶段 2 解包与搜索笔记

## DMG 信息

| 字段 | 值 |
| --- | --- |
| 原始路径 | `/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg` |
| 挂载点 | （Task 2 记录） |
| App bundle | （Task 2 记录） |
| ASAR 路径 | （Task 2 记录） |
| 解包目录 | （Task 2 记录，不提交到 Git） |

## 搜索命令备忘

```bash
# 发布相关
rg -i "publish|发布|platform|抖音|小红书|快手|视频号|bilibili|draft" "$EXTRACT_DIR"

# 账号/授权相关
rg -i "account|账号|login|授权|cookie|token|profile" "$EXTRACT_DIR"

# 声音/形象相关
rg -i "voice|声音|clone|克隆|cosy|speech|tts|avatar|形象|heygem|digital" "$EXTRACT_DIR"

# 素材/任务相关
rg -i "material|素材|task|任务|ffmpeg|frame|vector|embedding" "$EXTRACT_DIR"

# 设置/依赖相关
rg -i "setting|设置|update|更新|log|日志|ffmpeg|python|dependency" "$EXTRACT_DIR"
```

## 注意事项

- 解包目录不提交到 Git。
- 只在 Markdown 中记录摘要、路径和发现。
- 遇到疑似个人数据、Token、密钥只记录存在性，不复制原文。
```

- [x] **Step 4：运行验证**

```bash
test -f docs/reverse-engineering/static-analysis/SA-WORKFLOW-NOTES.md
rg -n "ASAR 路径|解包目录" docs/reverse-engineering/static-analysis/SA-WORKFLOW-NOTES.md
```

- [x] **Step 5：运行验证并汇报 diff**

运行本任务验证命令，确认 `SA-WORKFLOW-NOTES.md` 已创建。然后汇报当前 diff 摘要，等待总控验收，不要自行 commit：

```bash
test -f docs/reverse-engineering/static-analysis/SA-WORKFLOW-NOTES.md
rg -n "ASAR 路径|解包目录" docs/reverse-engineering/static-analysis/SA-WORKFLOW-NOTES.md
git diff -- docs/reverse-engineering/static-analysis/SA-WORKFLOW-NOTES.md docs/reverse-engineering/evidence-index.md
git status --short
```

预期：`SA-WORKFLOW-NOTES.md` 存在；ASAR 路径和解包目录已记录；本任务相关 diff 仅限指定文件；git status 中如有既有无关改动，只汇报不处理。

---

### Task 3：P0 发布流程静态补证

**文件：**

- 创建：`docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md`
- 修改：`docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md`
- 修改：`docs/reverse-engineering/runtime-blockers.md`
- 修改：`docs/reverse-engineering/evidence-index.md`

- [x] **Step 1：搜索发布相关字符串和调用链**

在解包目录中运行：

```bash
rg -i "publish|发布|立即发布|publishMode|publishAccount|platform|douyin|xiaohongshu|kuaishou|shipinhao|bilibili" "$EXTRACT_DIR" --type-add 'js:*.{js,ts}' -t js | head -50
```

记录出现的文件路径、函数名、API endpoint、平台标识、发布模式字段。

- [x] **Step 2：检查发布任务与账号存储结构**

搜索数据库/本地存储相关：

```bash
rg -i "publish_task|publish_account|task|账号|account|workflow_task" "$EXTRACT_DIR" --type-add 'js:*.{js,ts}' -t js | head -50
```

如存在 SQLite 数据库文件或 JSON 配置，用 `sqlite3 .schema` 或 `cat`/`plutil` 查看表结构。

- [x] **Step 3：确认发布前是否有独立确认页**

根据 RB-PUBLISH-003 的缺口，重点检查首页到发布任务的调用链：

```bash
rg -i "立即发布|publishNow|confirm|确认发布|publish.*confirm" "$EXTRACT_DIR" --type-add 'js:*.{js,ts}' -t js | head -50
```

- [x] **Step 4：写入静态分析记录**

创建 `docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md`，使用 `static-analysis-template.md` 字段，至少包括：

```md
# SA-PUBLISH-FLOW：发布流程静态分析

## 身份信息

| 字段 | 值 |
| --- | --- |
| 分析 ID | SA-PUBLISH-FLOW |
| 分析对象 | 旧版 App 发布流程、平台账号、发布任务 |
| 来源路径或位置 | `/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg` 解包后的 ASAR |
| 分析方法 | hdiutil 挂载 + asar 解包 + ripgrep 字符串搜索 + SQLite 表结构查看 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-STATIC-002 |
| 最高证据等级 | E3 |
| 可信度 | medium |

## 发现

| 发现类型 | 名称或路径 | 说明 |
| --- | --- | --- |
| 模块 | （按实际搜索填写） | 旧版发布模块路径、入口函数 |
| API | （按实际搜索填写） | 发布 API endpoint、请求方法、参数名 |
| 字段 | （按实际搜索填写） | 发布任务字段、账号字段、发布方式字段 |
| 资源 | （按实际搜索填写） | 平台图标、发布确认弹窗资源 |
| 配置 | （按实际搜索填写） | 平台配置、默认发布设置 |

## 关联记录

| 记录类型 | 路径或 ID |
| --- | --- |
| 页面巡检 | PAGE-PUBLISH-FLOW |
| 功能卡 | FC-PUBLISH-PREP |
| 运行障碍 | RB-PUBLISH-001、RB-PUBLISH-002、RB-PUBLISH-003 |

## 证据影响

| 字段 | 值 |
| --- | --- |
| 可增强的证据等级 | （根据发现判断 EV-RUNTIME-020 是否可从 E2 升级到 E3） |
| 剩余不确定点 | （例如：未看到真实平台响应、未解包完整服务端逻辑） |
| 对 Mirax AI 设计的影响 | （例如：确认 PublishOptions 字段、平台 ID 枚举、任务中心状态字段） |
```

- [x] **Step 5：更新发布准备功能卡和运行障碍**

如静态分析确认了新字段或调用链，更新 `FC-PUBLISH-PREP.md` 的「执行链路」「旧版发布能力到 Mirax AI 的映射」「限制与风险」等表格。

如 RB-PUBLISH-003 的「发布前确认页」问题得到解决，更新其静态补证方向和 Mirax AI 替代方案。

- [x] **Step 6：运行验证**

```bash
test -f docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md
rg -n "EV-STATIC-002" docs/reverse-engineering/evidence-index.md
rg -n "SA-PUBLISH-FLOW" docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md docs/reverse-engineering/runtime-blockers.md
```

- [x] **Step 7：运行验证并汇报 diff**

运行本任务验证命令，确认静态分析文件和功能卡/运行障碍已更新。然后汇报当前 diff 摘要，等待总控验收，不要自行 commit：

```bash
test -f docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md
rg -n "EV-STATIC-002" docs/reverse-engineering/evidence-index.md
rg -n "SA-PUBLISH-FLOW" docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md docs/reverse-engineering/runtime-blockers.md
git diff -- docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md docs/reverse-engineering/runtime-blockers.md docs/reverse-engineering/evidence-index.md
git status --short
```

预期：`SA-PUBLISH-FLOW.md` 存在；`EV-STATIC-002` 可查到；功能卡和运行障碍引用了该静态分析记录；本任务相关 diff 仅限指定文件；git status 中如有既有无关改动，只汇报不处理。

---

### Task 4：P1 资产管理静态补证

**文件：**

- 创建：`docs/reverse-engineering/static-analysis/SA-VOICE-AVATAR.md`
- 创建：`docs/reverse-engineering/static-analysis/SA-MATERIALS-TASKS.md`
- 创建：`docs/reverse-engineering/static-analysis/SA-ACCOUNTS-AUTH.md`
- 修改：`docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md`
- 修改：`docs/reverse-engineering/runtime-blockers.md`

- [x] **Step 1：声音与形象管理静态分析**

```bash
rg -i "voice|声音|clone|克隆|cosy|cosyvoice|speech|tts|avatar|形象|heygem|digital|训练|合成" "$EXTRACT_DIR" --type-add 'js:*.{js,ts}' -t js | head -80
```

关注：

- 声音训练/合成 API endpoint、参数（语速、情绪、文案）
- 形象上传/训练 API endpoint、视频预处理
- 状态字段（训练中、可用、失败）
- 本地文件存储路径

写入 `SA-VOICE-AVATAR.md`。

- [x] **Step 2：素材与任务中心静态分析**

```bash
rg -i "material|素材|category|分类|upload|上传|ffmpeg|frame|抽帧|vector|embedding|task|任务|status|状态|progress|进度|retry|重试" "$EXTRACT_DIR" --type-add 'js:*.{js,ts}' -t js | head -80
```

关注：

- 素材表结构、分类管理、标签字段
- FFmpeg 命令或抽帧参数
- 任务状态机、错误码、产物路径
- 重试逻辑

写入 `SA-MATERIALS-TASKS.md`。

- [x] **Step 3：账号管理与授权静态分析**

```bash
rg -i "account|账号|login|登录|auth|授权|cookie|token|profile|browser|浏览器|platform|平台|douyin|xiaohongshu|kuaishou|shipinhao|bilibili" "$EXTRACT_DIR" --type-add 'js:*.{js,ts}' -t js | head -80
```

关注：

- 平台账号表结构
- 授权窗口/浏览器 profile 调用
- Token/Cookie 存储方式
- 登录状态字段

写入 `SA-ACCOUNTS-AUTH.md`。

- [x] **Step 4：更新资产管理功能卡**

根据三个静态分析文件中的发现，更新 `FC-ASSET-MANAGEMENT.md` 的：

- 页面结构（补充具体字段名或状态值）
- 执行链路（补充 Provider/sidecar/本地存储字段）
- 限制与风险（更新替代方案）
- 派工信息（如字段确认，可细化建议修改文件）

- [x] **Step 5：更新运行障碍记录**

根据静态发现更新 `runtime-blockers.md` 中 RB-ASSET-001 到 RB-ASSET-005 和 RB-PUBLISH-001/002 的「静态补证方向」「Mirax AI 替代方案」。

- [x] **Step 6：运行验证**

```bash
test -f docs/reverse-engineering/static-analysis/SA-VOICE-AVATAR.md
test -f docs/reverse-engineering/static-analysis/SA-MATERIALS-TASKS.md
test -f docs/reverse-engineering/static-analysis/SA-ACCOUNTS-AUTH.md
rg -n "EV-STATIC-100|EV-STATIC-101|EV-STATIC-102" docs/reverse-engineering/evidence-index.md
rg -n "SA-VOICE-AVATAR|SA-MATERIALS-TASKS|SA-ACCOUNTS-AUTH" docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md docs/reverse-engineering/runtime-blockers.md
```

- [x] **Step 7：运行验证并汇报 diff**

运行本任务验证命令，确认三个静态分析文件和功能卡/运行障碍已更新。然后汇报当前 diff 摘要，等待总控验收，不要自行 commit：

```bash
test -f docs/reverse-engineering/static-analysis/SA-VOICE-AVATAR.md
test -f docs/reverse-engineering/static-analysis/SA-MATERIALS-TASKS.md
test -f docs/reverse-engineering/static-analysis/SA-ACCOUNTS-AUTH.md
rg -n "EV-STATIC-100|EV-STATIC-101|EV-STATIC-102" docs/reverse-engineering/evidence-index.md
rg -n "SA-VOICE-AVATAR|SA-MATERIALS-TASKS|SA-ACCOUNTS-AUTH" docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md docs/reverse-engineering/runtime-blockers.md
git diff -- docs/reverse-engineering/static-analysis/SA-VOICE-AVATAR.md docs/reverse-engineering/static-analysis/SA-MATERIALS-TASKS.md docs/reverse-engineering/static-analysis/SA-ACCOUNTS-AUTH.md docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md docs/reverse-engineering/runtime-blockers.md
git status --short
```

预期：三个静态分析文件存在；对应 `EV-STATIC-*` 可查到；功能卡和运行障碍引用了这些记录；本任务相关 diff 仅限指定文件；git status 中如有既有无关改动，只汇报不处理。

---

### Task 5：P2 辅助入口与边缘状态静态补证

**文件：**

- 创建：`docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md`
- 修改：`docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md`
- 修改：`docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md`
- 修改：`docs/reverse-engineering/runtime-blockers.md`

- [ ] **Step 1：搜索辅助入口相关字符串**

```bash
rg -i "help|帮助|about|关于|update|更新|data.*setting|数据设置|log|日志|upload|上传|dependency|依赖|ffmpeg|python|prompt|提示词" "$EXTRACT_DIR" --type-add 'js:*.{js,ts}' -t js | head -80
```

- [ ] **Step 2：检查本地配置与 plist**

```bash
find "$MOUNT_DIR" -name "*.plist" -o -name "*.json" -o -name "*.db" -o -name "*.sqlite" | head -20
```

查看应用配置、本地数据库路径、缓存目录、更新配置等。

- [ ] **Step 3：写入静态分析记录**

创建 `SA-SECONDARY-ENTRYPOINTS.md`，记录帮助、更新、数据设置、日志上传、依赖检查、提示词管理等的模块路径、配置字段和受限原因。

- [ ] **Step 4：更新 P2 页面卡和 Provider 设置功能卡**

如发现了设置页的具体字段（模型配置、Base URL、依赖路径、输出目录等），更新 `PAGE-SECONDARY-ENTRYPOINTS.md` 和 `FC-PROVIDER-SETTINGS.md`。

- [ ] **Step 5：更新运行障碍记录**

更新 RB-SECONDARY-001 至 RB-SECONDARY-005 的静态补证方向和替代方案。

- [ ] **Step 6：运行验证**

```bash
test -f docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md
rg -n "EV-STATIC-200" docs/reverse-engineering/evidence-index.md
rg -n "SA-SECONDARY-ENTRYPOINTS" docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md docs/reverse-engineering/runtime-blockers.md
```

- [ ] **Step 7：运行验证并汇报 diff**

运行本任务验证命令，确认 `SA-SECONDARY-ENTRYPOINTS.md` 和相关页面卡/功能卡/运行障碍已更新。然后汇报当前 diff 摘要，等待总控验收，不要自行 commit：

```bash
test -f docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md
rg -n "EV-STATIC-200" docs/reverse-engineering/evidence-index.md
rg -n "SA-SECONDARY-ENTRYPOINTS" docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md docs/reverse-engineering/runtime-blockers.md
git diff -- docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md docs/reverse-engineering/runtime-blockers.md
git status --short
```

预期：`SA-SECONDARY-ENTRYPOINTS.md` 存在；`EV-STATIC-200` 可查到；页面卡、功能卡和运行障碍引用了该记录；本任务相关 diff 仅限指定文件；git status 中如有既有无关改动，只汇报不处理。

---

### Task 6：阶段 2 汇总与项目状态更新

**文件：**

- 修改：`docs/superpowers/PROJECT-STATE.md`
- 修改：`docs/reverse-engineering/evidence-index.md`
- 修改：`docs/reverse-engineering/assets-index.md`

- [ ] **Step 1：补齐索引链接**

确认 `evidence-index.md` 中所有 EV-STATIC 记录都能跳转到对应的 static-analysis 文件；确认 `assets-index.md` 中 ASSET-PKG-001 记录完整。

- [ ] **Step 2：更新项目状态**

把 `docs/superpowers/PROJECT-STATE.md` 更新为：

```md
## 当前阶段

阶段 2：旧包静态分析补盲区。

阶段 2 的目标是针对阶段 1 中的 E2、E4、E5 以及信息不足的 E3 证据，分析旧版 DMG、解包 ASAR、preload API、本地配置和旧仓库线索，确认模块名、接口名、字段、服务依赖和数据流。本阶段不复用旧版混淆代码或生产代码。

## 当前自动调度入口

`docs/superpowers/plans/2026-06-15-stage-2-static-analysis.md`

## 最新可执行任务

执行 `docs/superpowers/plans/2026-06-15-stage-2-static-analysis.md`，按 Task 1 → Task 6 完成旧包静态分析，产出 `EV-STATIC-*` 证据和 `SA-*.md` 静态分析记录，并反向更新功能卡、页面卡、运行障碍记录和证据索引。

不要更新 `docs/reverse-engineering/legacy-ui-gap-list.md` 的状态列。静态补证只升级证据等级或明确记录缺口。
```

把「下一步」更新为：

```md
## 下一步

阶段 2 完成后，使用 `superpowers:writing-plans` 创建阶段 3：Mirax AI 新版产品架构映射实施计划。

阶段 3 把旧版功能卡映射到新版信息架构和工程模块，包括桌面工作台、素材管理、声音管理、形象管理、任务中心、账号管理、设置、Provider、sidecar、本地数据和发布链路。
```

- [ ] **Step 3：运行最终验证**

```bash
test -f docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md
test -f docs/reverse-engineering/static-analysis/SA-VOICE-AVATAR.md
test -f docs/reverse-engineering/static-analysis/SA-MATERIALS-TASKS.md
test -f docs/reverse-engineering/static-analysis/SA-ACCOUNTS-AUTH.md
test -f docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md
rg -n "EV-STATIC-001|EV-STATIC-002|EV-STATIC-003|EV-STATIC-100|EV-STATIC-101|EV-STATIC-102|EV-STATIC-200" docs/reverse-engineering/evidence-index.md
rg -n "阶段 2|旧包静态分析|阶段 3" docs/superpowers/PROJECT-STATE.md
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
```

预期：所有静态分析文件存在；证据索引可查；`PROJECT-STATE.md` 指向阶段 2 计划；`legacy-ui-gap-list.md` 无状态变更。

- [ ] **Step 4：运行最终验证并汇报 diff**

运行最终验证命令，确认所有静态分析文件、证据索引和项目状态符合阶段 2 完成标准。然后汇报当前 diff 摘要，等待总控验收，不要自行 commit：

```bash
test -f docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md
test -f docs/reverse-engineering/static-analysis/SA-VOICE-AVATAR.md
test -f docs/reverse-engineering/static-analysis/SA-MATERIALS-TASKS.md
test -f docs/reverse-engineering/static-analysis/SA-ACCOUNTS-AUTH.md
test -f docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md
rg -n "EV-STATIC-001|EV-STATIC-002|EV-STATIC-003|EV-STATIC-100|EV-STATIC-101|EV-STATIC-102|EV-STATIC-200" docs/reverse-engineering/evidence-index.md
rg -n "阶段 2|旧包静态分析|阶段 3" docs/superpowers/PROJECT-STATE.md
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
git diff -- docs/superpowers/PROJECT-STATE.md docs/reverse-engineering/evidence-index.md docs/reverse-engineering/assets-index.md
git status --short
```

预期：所有静态分析文件存在；证据索引包含本计划定义的 `EV-STATIC-*`；`PROJECT-STATE.md` 指向阶段 2 计划；`legacy-ui-gap-list.md` 无状态变更；本任务相关 diff 仅限指定文件；git status 中如有既有无关改动，只汇报不处理。

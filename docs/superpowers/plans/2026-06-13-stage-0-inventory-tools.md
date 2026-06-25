# 阶段 0：盘点工具与项目状态入口实施计划

> **面向 agentic workers：** 如果继续执行本计划，必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`。步骤使用 checkbox（`- [x]`）记录进度。

**目标：** 在开始旧版 App 运行态巡检前，建立项目状态入口、证据索引、资产索引、文档模板和恢复上下文规则。

**架构：** 本计划只创建文档和流程脚手架，不实现产品功能。文档按小文件拆分，避免 Codex 和 Claude Code 工位同时修改同一份大文档。

**技术栈：** Markdown、Git、ripgrep、现有 `docs/superpowers/` 与 `docs/reverse-engineering/` 文档。

---

## Resume Here

当前自动调度入口：`docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`。

当前阶段：阶段 0，`整理现状与盘点工具`。

本计划已完成。下一步不是继续执行阶段 0，而是创建阶段 1：旧版运行态全量巡检实施计划。

阶段 0 未开始旧版 App 巡检，也未更新 `docs/reverse-engineering/legacy-ui-gap-list.md` 的状态列。

## 范围

本计划只实现路线图中的阶段 0。

已创建：

- 新会话恢复入口：`docs/superpowers/PROJECT-STATE.md`
- 证据索引：`docs/reverse-engineering/evidence-index.md`
- 资产索引：`docs/reverse-engineering/assets-index.md`
- 运行障碍记录：`docs/reverse-engineering/runtime-blockers.md`
- 功能卡、页面巡检、运行障碍、静态分析 4 个模板
- 功能卡、页面巡检、静态分析、截图资产目录
- 现有逆向文档的初始证据记录
- 指向阶段 1 巡检计划的 handoff

未做：

- 未打开或巡检旧版 App。
- 未分析 DMG、ASAR、preload API 或本地数据库。
- 未为未知功能创建真实功能卡。
- 未更新 gap-list 实现状态。
- 未修改桌面端应用代码。

## 目标文件结构

```text
docs/
  superpowers/
    PROJECT-STATE.md
    plans/
      2026-06-13-stage-0-inventory-tools.md
  reverse-engineering/
    evidence-index.md
    assets-index.md
    runtime-blockers.md
    templates/
      function-card-template.md
      page-inspection-template.md
      runtime-blocker-template.md
      static-analysis-template.md
    function-cards/
      .gitkeep
    pages/
      .gitkeep
    static-analysis/
      .gitkeep
    assets/
      screenshots/
        .gitkeep
```

## 已完成任务

### Task 1：创建项目状态入口

**文件：**

- 创建：`docs/superpowers/PROJECT-STATE.md`

- [x] 验证项目状态入口不存在。
- [x] 创建 `PROJECT-STATE.md`。
- [x] 验证包含以下章节：当前总目标、当前阶段、当前自动调度入口、新会话恢复步骤、阶段 0 完成标准。
- [x] 提交：`de9d795 docs: add project state entry`

### Task 2：创建证据索引和资产索引

**文件：**

- 创建：`docs/reverse-engineering/evidence-index.md`
- 创建：`docs/reverse-engineering/assets-index.md`

- [x] 验证索引文件不存在。
- [x] 创建证据索引，包含证据等级、可信度、冲突规则和 ID 范围。
- [x] 创建资产索引，包含大型资产不入 Git、小截图可入 Git 的规则。
- [x] 登记初始证据：`EV-DOC-001` 到 `EV-DOC-004`。
- [x] 登记初始资产：`ASSET-DOC-001` 到 `ASSET-DOC-004`。
- [x] 提交：`60cc575 docs: add evidence and asset indexes`

### Task 3：创建逆向盘点目录

**文件：**

- 创建：`docs/reverse-engineering/function-cards/.gitkeep`
- 创建：`docs/reverse-engineering/pages/.gitkeep`
- 创建：`docs/reverse-engineering/static-analysis/.gitkeep`
- 创建：`docs/reverse-engineering/assets/screenshots/.gitkeep`

- [x] 创建目录和 `.gitkeep` 文件。
- [x] 验证目录占位文件存在。
- [x] 提交：`ecd81c1 docs: add reverse engineering inventory directories`

### Task 4：创建功能卡和页面巡检模板

**文件：**

- 创建：`docs/reverse-engineering/templates/function-card-template.md`
- 创建：`docs/reverse-engineering/templates/page-inspection-template.md`

- [x] 创建功能卡模板。
- [x] 创建页面巡检模板。
- [x] 验证模板包含必要字段。
- [x] 提交：`f61aaeb docs: add function and page inventory templates`

### Task 5：创建运行障碍和静态分析模板

**文件：**

- 创建：`docs/reverse-engineering/runtime-blockers.md`
- 创建：`docs/reverse-engineering/templates/runtime-blocker-template.md`
- 创建：`docs/reverse-engineering/templates/static-analysis-template.md`

- [x] 创建运行障碍索引。
- [x] 创建运行障碍模板。
- [x] 创建静态分析模板。
- [x] 验证模板包含必要字段。
- [x] 提交：`7a27815 docs: add blocker and static analysis templates`

### Task 6：更新项目状态，指向阶段 1

**文件：**

- 修改：`docs/superpowers/PROJECT-STATE.md`

- [x] 把最新可执行任务更新为阶段 0 验证和阶段 1 计划创建。
- [x] 明确阶段 1 计划创建前不要巡检旧版 App。
- [x] 验证 handoff 文案。
- [x] 提交：`f436bb5 docs: point project state to stage 1 planning`

### Task 7：最终验证与阶段 0 完成

**文件：**

- 验证：阶段 0 文档和目录。

- [x] 文件存在性检查通过。
- [x] 证据 ID 和资产 ID 检查通过。
- [x] 阶段 handoff 文案检查通过。
- [x] 未完成标记扫描通过。
- [x] 确认 `legacy-ui-gap-list.md` 没有被更新。
- [x] 提交：`0091d6c docs: mark stage 0 inventory plan complete`

## 阶段 0 验证命令

```bash
test -f docs/superpowers/PROJECT-STATE.md
test -f docs/reverse-engineering/evidence-index.md
test -f docs/reverse-engineering/assets-index.md
test -f docs/reverse-engineering/runtime-blockers.md
test -f docs/reverse-engineering/templates/function-card-template.md
test -f docs/reverse-engineering/templates/page-inspection-template.md
test -f docs/reverse-engineering/templates/runtime-blocker-template.md
test -f docs/reverse-engineering/templates/static-analysis-template.md
test -f docs/reverse-engineering/function-cards/.gitkeep
test -f docs/reverse-engineering/pages/.gitkeep
test -f docs/reverse-engineering/static-analysis/.gitkeep
test -f docs/reverse-engineering/assets/screenshots/.gitkeep
```

```bash
rg -n "EV-DOC-001|EV-DOC-002|EV-DOC-003|EV-DOC-004" docs/reverse-engineering/evidence-index.md
rg -n "ASSET-DOC-001|ASSET-DOC-002|ASSET-DOC-003|ASSET-DOC-004" docs/reverse-engineering/assets-index.md
rg -n "当前自动调度入口|阶段 0|阶段 1" docs/superpowers/PROJECT-STATE.md docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
```

## 下一步

阶段 0 已完成。下一步使用 `superpowers:writing-plans` 创建：

`docs/superpowers/plans/2026-06-13-stage-1-runtime-inspection.md`

阶段 1 计划应聚焦旧版运行态全量巡检，按 P0 → P1 → P2 页面优先级推进，并明确截图、页面卡、功能卡和运行障碍记录的写入规则。

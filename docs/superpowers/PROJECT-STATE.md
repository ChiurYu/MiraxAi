# Mirax AI 项目状态

## 当前总目标

通过证据驱动的方式，完整复刻旧版「轻语 IP 智能体」的产品功能。旧版 UI 只作为产品行为参考，不作为视觉目标。Mirax AI 会重新设计一套更专业的界面，但要保留旧产品的能力、流程、状态和产物链路。

## 当前阶段

阶段 0：整理现状与盘点工具。

阶段 0 已完成基础脚手架：恢复入口、证据索引、资产索引、运行障碍记录、模板和后续巡检目录已经建立。下一步应创建阶段 1：旧版运行态全量巡检计划。

## 当前自动调度入口

`docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`

该计划已经完成。创建阶段 1 计划后，新的 `docs/superpowers/plans/YYYY-MM-DD-stage-1-*.md` 会成为自动调度入口。

## 最新可执行任务

使用 `superpowers:writing-plans` 创建阶段 1：旧版运行态全量巡检 implementation plan。

在阶段 1 计划创建前，不要开始旧版 App 巡检。阶段 0 不更新 `docs/reverse-engineering/legacy-ui-gap-list.md` 的状态列。

## 进度入口

- 路线图设计：`docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md`
- 当前已完成计划：`docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`
- 桌面重建设计：`docs/superpowers/specs/2026-06-11-mirax-desktop-rebuild-design.md`
- 第一版可用计划：`docs/superpowers/plans/2026-06-12-mirax-first-usable-release.md`
- 演示视频时间轴：`docs/reverse-engineering/demo-video-timeline.md`
- 演示覆盖矩阵：`docs/reverse-engineering/demo-video-coverage.md`
- 旧版 UI 差距清单：`docs/reverse-engineering/legacy-ui-gap-list.md`
- 证据索引：`docs/reverse-engineering/evidence-index.md`
- 资产索引：`docs/reverse-engineering/assets-index.md`
- 运行障碍记录：`docs/reverse-engineering/runtime-blockers.md`
- 功能卡目录：`docs/reverse-engineering/function-cards/`
- 页面巡检目录：`docs/reverse-engineering/pages/`
- 静态分析目录：`docs/reverse-engineering/static-analysis/`

## 关键决策

1. 使用证据驱动方式重建旧产品功能。
2. 先完整发现旧产品功能，再大规模实现新版能力。
3. 运行态观察是最高优先级证据。
4. 静态分析用于补齐运行态受限或不完整的信息。
5. 登录、激活、云服务、模型、平台和本地依赖限制只记录为运行障碍，不作为绕过任务。
6. Mirax AI 重新设计 UI，不照搬旧版视觉风格。
7. `PROJECT-STATE.md` 是 Codex 和 Claude Code 新会话的恢复入口。

## 工作区注意事项

- 大型逆向输入不要进入 Git：DMG、完整录屏、解包 ASAR、模型文件、大型资源目录和批量抽帧图片。
- 小体积截图只有在文档确实需要时才进入 Git，放在 `docs/reverse-engineering/assets/screenshots/`，并同时登记到 `assets-index.md` 和 `evidence-index.md`。
- CodeGraph MCP 工具不一定每次会话都可用；不可用时使用本地文件和 `rg`。
- cmux 调度必须遵守 `AGENTS.md`：计划从 `docs/superpowers/plans/` 取最新文件，运行状态放在 `.codex/dispatch-state.json`，heartbeat id 为 `mirax-dispatch`。
- 不要回滚或夹带和当前任务无关的未提交改动。

## 新会话恢复步骤

1. 读取 `AGENTS.md`。
2. 读取 `CLAUDE.md`。
3. 读取本文件：`docs/superpowers/PROJECT-STATE.md`。
4. 读取「当前自动调度入口」指向的计划。
5. 如果任务涉及证据规则、模板或阶段边界，再读取路线图设计。
6. 运行 `git status --short`，不要碰无关改动。
7. 从当前计划中第一个未完成步骤继续。

## 阶段 0 完成标准

阶段 0 已完成，完成条件如下：

- `PROJECT-STATE.md` 已存在并指向当前计划。
- `evidence-index.md`、`assets-index.md`、`runtime-blockers.md` 已存在。
- 功能卡、页面巡检、运行障碍、静态分析模板已存在。
- 功能卡、页面巡检、静态分析和截图目录已存在。
- 现有逆向文档已登记为初始证据。
- 下一步已明确为创建阶段 1 运行态巡检计划。

## 下一步

使用 `superpowers:writing-plans` 创建阶段 1：旧版运行态全量巡检 implementation plan。

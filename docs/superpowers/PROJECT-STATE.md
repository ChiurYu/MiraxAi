# Mirax AI 项目状态

## 当前总目标

通过证据驱动的方式，完整复刻旧版「轻语 IP 智能体」的产品功能。旧版 UI 只作为产品行为参考，不作为视觉目标。Mirax AI 会重新设计一套更专业的界面，但要保留旧产品的能力、流程、状态和产物链路。

## 当前阶段

阶段 4 P1 规划：已完成 Stitch UI 导出拆解，并创建 Vue 迁移计划。25 份 Stitch 导出收敛为 21 个 canonical 界面；Task 1（来源与基线确认）、Task 2（导航状态与共享应用外壳，含 review fix）、Task 3（收敛 semantic tokens 与 UI primitives）、Task 4（重建 Workbench 单阶段骨架）、Task 4 Review Fix 2、3、3A、3B、3C、Task 4 Playwright canonical 视觉验收与 Task 5（WB-01 默认态与 WB-02 processing 状态）已完成，Task 5 Review Fix 已实现并通过自动检查，视觉并排截图待人工验收（review pending）。Task 6（WB-03/04/05 文案改写、声音克隆、语音合成）已实现并通过全仓 typecheck、目标测试、Playwright canonical 视觉验收及 Codex 视觉 review。Task 7（WB-06/07 形象生成与视频合成）已实现并通过全仓 typecheck、目标测试、Playwright canonical 视觉验收；Task 7 Review Fix 已完成并通过 Codex 视觉验收（`visual-review-passed`）。Task 8（WB-08/WB-09 内容复核与发布）已实现并通过全仓 typecheck、目标测试、Playwright canonical 视觉验收；Task 8 Review Fix 已修复 WB-09 发布确认弹窗（改用 `AppDialog`）并通过自动验证；Task 8 Review Fix 2 已修复 AppDialog 层级问题，`wb09-confirm.png` 中确认弹窗、摘要内容与操作按钮均清晰可见；已通过 Codex 视觉验收（`visual-review-passed`）。Task 9（本地化 Stitch 示例媒体）已完成资源下载与来源映射；Task 9 Review Fix 已将本地媒体接入 `AvatarGenerationStage.vue`、`ContentReviewStage.vue` 与 `App.vue`；Task 9 Review Fix 2 已修复 `ContentReviewStage.vue` 中 `emit` 在 immediate watcher 之后声明导致的 WB-08 运行时回归，全仓 typecheck、测试、热链扫描、Task 8 Playwright canonical 视觉回归均通过；已通过 Codex 总控视觉与回归验收（`visual-review-passed`）。Task 10（ASSET-01/02/03 声音、形象、素材资产库）已实现并通过桌面端 typecheck、全仓测试、全仓 typecheck、git diff --check 与热链扫描；Playwright canonical 视觉验收已执行（12 张截图 + 3 张 montage + `report.json`），`automationStatus: passed`，已通过 Codex 总控复验（`visual-review-passed`）。Task 11（OPS-01/02 任务中心与账号管理）已实现并通过桌面端 typecheck、全仓测试、全仓 typecheck、git diff --check、热链扫描与禁止文件 diff 检查；Playwright canonical 视觉验收已执行（9 张截图 + 2 张 montage + `report.json`），`automationStatus: passed`，已通过 Codex 总控复验（`visual-review-passed`）。Task 12（SETTINGS-01~07 拆分七类设置页面）已实现并通过桌面端 typecheck、全仓测试、全仓 typecheck、git diff --check、热链扫描与禁止文件 diff 检查；Playwright canonical 视觉验收已执行（9 张截图 + 2 张 montage + `report.json`），`automationStatus: passed`；Task 12 Review Fix 已修复非 owner section 组件覆盖 active section 的问题（`useAppSettings` 增加 `persistSection` 选项，仅 `SettingsView` 作为 section owner 写入 section，复现脚本 `/tmp/mirax-task12-section-persist-check.js` 输出 section 为 `ai-services`，全量测试、typecheck、build:web 与 Playwright 回归均通过；已通过 Codex 总控复验（`visual-review-passed`）。Task 13（全量视觉、交互与回归验收）已完成：21 个 canonical 界面全部按矩阵截图并生成并排 montage，Dark 覆盖 1280×1024/1440×900/1280×800，Light 覆盖资产库/任务/账号/全部设置页面；交互验收（7 个一级导航、8 个 workflow stage、Workbench↔asset 选择返回、dialog/drawer 关闭、发布确认/取消、设置 7 section、主题按钮焦点）全部通过；自动验证 `pnpm test`、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web`、`git diff --check`、热链扫描、禁止文件 diff 检查均通过。修复 `AppDialog.vue` 根元素缺失 `v-bind="$attrs"` 导致 `data-testid` 未透传的问题。视觉 review 状态 `visualReview: pending-codex-review`，`automationStatus: passed`。Stitch UI Vue 迁移计划 13 个 Task 全部实施完成，等待 Codex 总控最终 review。

当前实施分支：`codex/stitch-ui-vue-migration`。

新规划入口：

- 来源映射：`docs/product-architecture/stitch-ui-source-map.md`
- 实施计划：`docs/superpowers/plans/2026-06-23-stitch-ui-vue-migration.md`
- 视觉与功能提示词：`docs/superpowers/specs/2026-06-22-mirax-stitch-ui-redesign-design.md`

用户已确认当前工作区已有的未提交 Workbench 改动作为功能基线，canonical Stitch 导出作为视觉基线。后续实现必须在现有工作区上增量进行：允许重构外壳和样式，但不得回滚或丢失 workflow、阶段状态、草稿、Provider、媒体产物、发布准备和 mock 任务行为。

阶段 4 P0.5：UI/UX polish 已完成。在阶段 4 三个 P0 源码计划完成后，对工作台、设置/Provider/sidecar、发布准备与 mock 任务做了统一的视觉层级、状态表达、响应式和页面验收优化。

阶段 4 P0：发布准备与 mock 发布任务源码实现（已完成，Task 1-12 已完成）。

阶段 3：Mirax AI 新版产品架构映射（已完成）。

阶段 4 P0 已完成工作台 workflow 拆分、设置 / Provider / sidecar 配置，以及发布准备与 mock 发布任务。发布链路已把标题/描述/话题/封面/发布方式抽成 `PublishMetadata`，把 mock 发布结果抽成 `PublishTask`，并用 localStorage 持久化到 `publishTaskStore`。

## 当前自动调度入口

当前用户要求完成 Task 8 后停止，不启用自动调度，不要开始 Task 9。后续明确开始 Task 9 时，执行入口为：

`docs/superpowers/plans/2026-06-23-stitch-ui-vue-migration.md`

该计划是阶段 4 P1 的新源码 implementation plan，共 13 个 Task。Task 1 已完成并通过基线验证；Task 2 已完成，且 2026-06-23 review 未通过的两项（TopBar 上下文切换、AppShell `.workflow-board` 作用域）已修正并通过复验。此前阶段 4 P0 三个源码计划均已完成，不要重复执行。

## 最新可执行任务

阶段 4 P1：Task 1、Task 2、Task 3、Task 4、Task 4 Review Fix 2、3、3A、3B、3C、Task 4 Playwright canonical 视觉验收、Task 5 与 Task 5 Review Fix 已实现并通过自动检查，视觉并排截图待人工验收（review pending）。Task 6（WB-03/04/05 文案改写、声音克隆、语音合成）已实现并通过全仓 typecheck、目标测试、Playwright canonical 视觉验收及 Codex 视觉 review。Task 7（WB-06/07 形象生成与视频合成）已实现并通过全仓 typecheck、目标测试、Playwright canonical 视觉验收；Task 7 Review Fix 已完成并通过 Codex 视觉验收（`visual-review-passed`）。Task 8（WB-08/WB-09 内容复核与发布）已实现并通过全仓 typecheck、目标测试、Playwright canonical 视觉验收；Task 8 Review Fix 已修复 WB-09 发布确认弹窗（改用 `AppDialog`）并通过自动验证；Task 8 Review Fix 2 已修复 AppDialog 层级问题，`wb09-confirm.png` 中确认弹窗、摘要内容与操作按钮均清晰可见；已通过 Codex 视觉验收（`visual-review-passed`）。Task 9（本地化 Stitch 示例媒体）已完成资源下载与来源映射；Task 9 Review Fix 已将本地媒体接入 `AvatarGenerationStage.vue`、`ContentReviewStage.vue` 与 `App.vue`；Task 9 Review Fix 2 已修复 `ContentReviewStage.vue` 中 `emit` 在 immediate watcher 之后声明导致的 WB-08 运行时回归，全仓 typecheck、测试、热链扫描、Task 8 Playwright canonical 视觉回归均通过；已通过 Codex 总控视觉与回归验收（`visual-review-passed`）。Task 10（ASSET-01/02/03 声音、形象、素材资产库）已实现并通过桌面端 typecheck、全仓测试、全仓 typecheck、git diff --check 与热链扫描；Playwright canonical 视觉验收已执行（12 张截图 + 3 张 montage + `report.json`），`automationStatus: passed`，已通过 Codex 总控复验（`visual-review-passed`）。Task 11（OPS-01/02 任务中心与账号管理）已实现并通过桌面端 typecheck、全仓测试、全仓 typecheck、git diff --check、热链扫描与禁止文件 diff 检查；Playwright canonical 视觉验收已执行（9 张截图 + 2 张 montage + `report.json`），`automationStatus: passed`，已通过 Codex 总控复验（`visual-review-passed`）。Task 12（SETTINGS-01~07 拆分七类设置页面）已实现并通过桌面端 typecheck、全仓测试、全仓 typecheck、git diff --check、热链扫描与禁止文件 diff 检查；Playwright canonical 视觉验收已执行（9 张截图 + 2 张 montage + `report.json`），`automationStatus: passed`；Task 12 Review Fix 已修复非 owner section 组件覆盖 active section 的问题（`useAppSettings` 增加 `persistSection` 选项，仅 `SettingsView` 作为 section owner 写入 section，复现脚本 `/tmp/mirax-task12-section-persist-check.js` 输出 section 为 `ai-services`，全量测试、typecheck、build:web 与 Playwright 回归均通过；已通过 Codex 总控复验（`visual-review-passed`）。Task 13（全量视觉、交互与回归验收）已完成：21 个 canonical 界面全部按矩阵截图并生成并排 montage，Dark 覆盖 1280×1024/1440×900/1280×800，Light 覆盖资产库/任务/账号/全部设置页面；交互验收（7 个一级导航、8 个 workflow stage、Workbench↔asset 选择返回、dialog/drawer 关闭、发布确认/取消、设置 7 section、主题按钮焦点）全部通过；自动验证 `pnpm test`、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web`、`git diff --check`、热链扫描、禁止文件 diff 检查均通过。修复 `AppDialog.vue` 根元素缺失 `v-bind="$attrs"` 导致 `data-testid` 未透传的问题。视觉 review 状态 `visualReview: pending-codex-review`，`automationStatus: passed`。Stitch UI Vue 迁移计划 13 个 Task 全部实施完成，等待 Codex 总控最终 review。每次只执行一个 Task，完成并验证后同步更新本文件。P0.5 已完成，阶段 3 已完成，不要重复执行阶段 3 或阶段 4 P0/P0.5 已完成计划。

继续执行阶段 4 时，仍然不要修改 `docs/reverse-engineering/legacy-ui-gap-list.md` 的状态列；不要修改 `.codex/dispatch-state.json`；每个源码计划只允许修改该计划列明的文件。

## 进度入口

- 阶段 3 架构映射：`docs/product-architecture/README.md`
- 路线图设计：`docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md`
- 当前计划 / Stitch UI Vue 迁移计划：`docs/superpowers/plans/2026-06-23-stitch-ui-vue-migration.md`
- Stitch UI 来源映射：`docs/product-architecture/stitch-ui-source-map.md`
- 已完成阶段 4 P0 发布计划：`docs/superpowers/plans/2026-06-17-mirax-publish-prep-mock-tasks.md`
- 已完成阶段 4 P0.5 UI/UX polish：`docs/superpowers/plans/2026-06-17-mirax-ui-ux-polish.md`
- 已完成阶段 4 P0 设置计划：`docs/superpowers/plans/2026-06-17-mirax-settings-provider-sidecar.md`
- 已完成阶段 4 P0 工作台计划：`docs/superpowers/plans/2026-06-17-mirax-workbench-workflow-architecture.md`
- 已完成阶段 3 计划：`docs/superpowers/plans/2026-06-15-stage-3-architecture-mapping.md`
- 已完成阶段 0 计划：`docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`
- 桌面重建设计：`docs/superpowers/specs/2026-06-11-mirax-desktop-rebuild-design.md`
- 第一版可用计划：`docs/superpowers/plans/2026-06-12-mirax-first-usable-release.md`
- 演示视频时间轴：`docs/reverse-engineering/demo-video-timeline.md`
- 演示覆盖矩阵：`docs/reverse-engineering/demo-video-coverage.md`
- 旧版 UI 差距清单：`docs/reverse-engineering/legacy-ui-gap-list.md`
- 证据索引：`docs/reverse-engineering/evidence-index.md`
- 资产索引：`docs/reverse-engineering/assets-index.md`
- 人工截图输入：`docs/截图/`
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
- 用户手动提供的旧版界面截图可保留在 `docs/截图/` 作为原始输入；已登记到 `assets-index.md` 和 `evidence-index.md` 后即可被 Codex 或 Claude Code 直接引用。
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

阶段 3 已完成，阶段 4 三个 P0 源码计划已完成，阶段 4 P0.5 UI/UX polish 已完成。Stitch UI 已拆解为 21 个 canonical 界面并形成阶段 4 P1 Vue 迁移计划；功能基线与视觉基线均已确认，Task 1、Task 2、Task 3、Task 4、Task 4 Review Fix 2、3、3A、3B、3C、Task 4 Playwright canonical 视觉验收、Task 5 与 Task 5 Review Fix 已实现并通过自动检查，视觉并排截图待人工验收（review pending）。Task 6 已实现并通过全仓 typecheck、目标测试、Playwright canonical 视觉验收及 Codex 视觉 review。Task 7（WB-06/07 形象生成与视频合成）已实现并通过全仓 typecheck、目标测试、Playwright canonical 视觉验收；Task 7 Review Fix 已完成并通过 Codex 视觉验收（`visual-review-passed`）。Task 8（WB-08/WB-09 内容复核与发布）已实现并通过全仓 typecheck、目标测试、Playwright canonical 视觉验收；Task 8 Review Fix 已修复 WB-09 发布确认弹窗（改用 `AppDialog`）并通过自动验证；Task 8 Review Fix 2 已修复 AppDialog 层级问题，`wb09-confirm.png` 中确认弹窗、摘要内容与操作按钮均清晰可见；已通过 Codex 视觉验收（`visual-review-passed`）。Task 9（本地化 Stitch 示例媒体）已完成资源下载与来源映射；Task 9 Review Fix 已将本地媒体接入 `AvatarGenerationStage.vue`、`ContentReviewStage.vue` 与 `App.vue`；Task 9 Review Fix 2 已修复 `ContentReviewStage.vue` 中 `emit` 在 immediate watcher 之后声明导致的 WB-08 运行时回归，全仓 typecheck、测试、热链扫描、Task 8 Playwright canonical 视觉回归均通过；已通过 Codex 总控视觉与回归验收（`visual-review-passed`）。Task 10（ASSET-01/02/03 声音、形象、素材资产库）已实现并通过桌面端 typecheck、全仓测试、全仓 typecheck、git diff --check 与热链扫描；Playwright canonical 视觉验收已执行（12 张截图 + 3 张 montage + `report.json`），`automationStatus: passed`，已通过 Codex 总控复验（`visual-review-passed`）。Task 11（OPS-01/02 任务中心与账号管理）已实现并通过桌面端 typecheck、全仓测试、全仓 typecheck、git diff --check、热链扫描与禁止文件 diff 检查；Playwright canonical 视觉验收已执行（9 张截图 + 2 张 montage + `report.json`），`automationStatus: passed`，已通过 Codex 总控复验（`visual-review-passed`）。Task 12（SETTINGS-01~07 拆分七类设置页面）已实现并通过桌面端 typecheck、全仓测试、全仓 typecheck、git diff --check、热链扫描与禁止文件 diff 检查；Playwright canonical 视觉验收已执行（9 张截图 + 2 张 montage + `report.json`），`automationStatus: passed`；Task 12 Review Fix 已修复非 owner section 组件覆盖 active section 的问题（`useAppSettings` 增加 `persistSection` 选项，仅 `SettingsView` 作为 section owner 写入 section，复现脚本 `/tmp/mirax-task12-section-persist-check.js` 输出 section 为 `ai-services`，全量测试、typecheck、build:web 与 Playwright 回归均通过；已通过 Codex 总控复验（`visual-review-passed`）。Task 13（全量视觉、交互与回归验收）已完成：21 个 canonical 界面全部按矩阵截图并生成并排 montage，Dark 覆盖 1280×1024/1440×900/1280×800，Light 覆盖资产库/任务/账号/全部设置页面；交互验收（7 个一级导航、8 个 workflow stage、Workbench↔asset 选择返回、dialog/drawer 关闭、发布确认/取消、设置 7 section、主题按钮焦点）全部通过；自动验证 `pnpm test`、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web`、`git diff --check`、热链扫描、禁止文件 diff 检查均通过。修复 `AppDialog.vue` 根元素缺失 `v-bind="$attrs"` 导致 `data-testid` 未透传的问题。视觉 review 状态 `visualReview: pending-codex-review`，`automationStatus: passed`。Stitch UI Vue 迁移计划 13 个 Task 全部实施完成，等待 Codex 总控最终 review。不要重复执行阶段 3、阶段 4 P0/P0.5、Task 1、Task 2、Task 3、Task 4、Task 4 Review Fix 2、Task 4 Review Fix 3、Task 4 Review Fix 3A、Task 4 Review Fix 3B、Task 4 Review Fix 3C、Task 5、Task 5 Review Fix、Task 6、Task 6 Review Fix、Task 6 Review Fix 2、Task 7、Task 7 Review Fix、Task 8、Task 8 Review Fix、Task 8 Review Fix 2、Task 9、Task 9 Review Fix、Task 9 Review Fix 2、Task 10、Task 11。Task 13（全量视觉、交互与回归验收）已完成：21 个 canonical 界面全部按矩阵截图并生成并排 montage，Dark 覆盖 1280×1024/1440×900/1280×800，Light 覆盖资产库/任务/账号/全部设置页面；交互验收（7 个一级导航、8 个 workflow stage、Workbench↔asset 选择返回、dialog/drawer 关闭、发布确认/取消、设置 7 section、主题按钮焦点）全部通过；自动验证 `pnpm test`、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web`、`git diff --check`、热链扫描、禁止文件 diff 检查均通过。修复 `AppDialog.vue` 根元素缺失 `v-bind="$attrs"` 导致 `data-testid` 未透传的问题。视觉 review 状态 `visualReview: pending-codex-review`，`automationStatus: passed`。Stitch UI Vue 迁移计划 13 个 Task 全部实施完成，等待 Codex 总控最终 review。每次只执行一个 Task，完成并验证后同步更新本文件。P0.5 已完成，阶段 3 已完成，不要重复执行阶段 3 或阶段 4 P0/P0.5 已完成计划。

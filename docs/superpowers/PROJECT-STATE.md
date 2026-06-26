# Mirax AI 项目状态

## 当前总目标

通过证据驱动的方式，完整复刻旧版「轻语 IP 智能体」的产品功能。旧版 UI 只作为产品行为参考，不作为视觉目标。Mirax AI 会重新设计一套更专业的界面，但要保留旧产品的能力、流程、状态和产物链路。

## 当前阶段

阶段 4 P1 已完成：PR #2 已合并到 `main`，Stitch UI Vue 迁移进入主线。25 份 Stitch 导出收敛为 21 个 canonical 界面，Task 1–13 全部实施完成并通过自动验证与 Codex 总控视觉/回归验收。当前 UI 已覆盖 Workbench 8 个阶段、3 个资产库、任务中心、账号管理、7 类设置页面，但真实能力仍大多为 mock / 诚实空态。

阶段 5 P0 进行中：「真实能力接入前置基础设施与执行顺序」。Task 1（GitHub Actions CI）、Task 2（Provider 配置与真实调用边界）与 Task 3（sidecar / 本地依赖检测）已完成：sidecar 依赖检测新增 `missing / configured / ready / unavailable` 四种状态，检测接口与运行接口分层设计，UI 状态 pill 改为“已就绪 / 需配置 / 未就绪”，不伪造可用。继续按 Task 4–6 梳理媒体产物、工作台真实化与发布自动化的边界与顺序。

当前实施分支：`codex/stitch-ui-vue-migration`。PR #2 已合并到 `main`，Stitch UI Vue 迁移进入主线；本分支继续用于阶段 5 P0 真实能力接入前置基础设施的规划与落地。

Task 13 Review Fix（Codex 收尾修复）已实现：设置页主题模式与 App 顶层主题状态已同源；本地依赖页改为单卡单状态；checkbox 与资产库 icon-only 小方形控件点击跳动已收敛；声音/形象/素材库的导入/新建按钮已改为可点击并打开诚实的「暂未接入」弹窗，不创建资源、不写入 store、不伪造成功。自动验证 `pnpm test`、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web` 均通过；浏览器交互脚本 `/tmp/mirax-task13-review-fix-check.js` 已通过；等待人工视觉复验。

Task 13 Review Fix 2 已修复浅色主题未覆盖 Teleport 抽屉/弹窗的问题：`AppDrawer.vue` 与 `AppDialog.vue` 的 overlay 和根节点已补 `data-theme`，避免脱离 `.app-shell[data-theme]` 后回退到暗色 token。验证 `pnpm --filter @mirax/desktop typecheck`、目标测试与 `/tmp/mirax-task13-review-fix-check.js` 均通过。

Task 13 Review Fix 3 已收敛 TopBar 公共壳：Workbench 顶部删除无功能左箭头、通知、帮助、账户图标，保留项目名、Autosaved 与真实可用的主题按钮；`AppShell`/`TopBar` 增加 `topbar-actions` 插槽，声音库/形象库/素材库的导入/新建操作已移入公共 TopBar，页面 header 不再重复放这些主操作。验证 `pnpm test`、`pnpm typecheck` 与 `/tmp/mirax-task13-review-fix-check.js` 均通过。

新规划入口：

- 真实能力接入前置基础设施计划：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`
- 来源映射：`docs/product-architecture/stitch-ui-source-map.md`
- 实施计划：`docs/superpowers/plans/2026-06-23-stitch-ui-vue-migration.md`
- 视觉与功能提示词：`docs/superpowers/specs/2026-06-22-mirax-stitch-ui-redesign-design.md`

用户已确认当前工作区已有的未提交 Workbench 改动作为功能基线，canonical Stitch 导出作为视觉基线。后续实现必须在现有工作区上增量进行：允许重构外壳和样式，但不得回滚或丢失 workflow、阶段状态、草稿、Provider、媒体产物、发布准备和 mock 任务行为。

阶段 4 P0.5：UI/UX polish 已完成。在阶段 4 三个 P0 源码计划完成后，对工作台、设置/Provider/sidecar、发布准备与 mock 任务做了统一的视觉层级、状态表达、响应式和页面验收优化。

阶段 4 P0：发布准备与 mock 发布任务源码实现（已完成，Task 1-12 已完成）。

阶段 3：Mirax AI 新版产品架构映射（已完成）。

阶段 4 P0 已完成工作台 workflow 拆分、设置 / Provider / sidecar 配置，以及发布准备与 mock 发布任务。发布链路已把标题/描述/话题/封面/发布方式抽成 `PublishMetadata`，把 mock 发布结果抽成 `PublishTask`，并用 localStorage 持久化到 `publishTaskStore`。

## 当前自动调度入口

阶段 4 P1 Stitch UI Vue 迁移已完成并合并。下一阶段为阶段 5 P0「真实能力接入前置基础设施与执行顺序」。当前最新计划为：

`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`

该计划先补齐 CI 与基础设施边界，再规划真实 AI / 语音 / 数字人 / 视频 / 发布能力接入。不要提前执行真实能力源码实现。

## 最新可执行任务

阶段 4 P1 Stitch UI Vue 迁移全部 13 个 Task 已完成并合并，不再重复执行。阶段 5 P0 最新可执行任务见 `docs/superpowers/plans/2026-06-25-real-capability-foundation.md`：

- Task 1：补 GitHub Actions CI（`pnpm test` / `pnpm typecheck` / `desktop build:web`）——已完成，`.github/workflows/ci.yml` 已落地。
- Task 2：梳理 Provider 配置与真实调用边界（API Key 不进日志 / snapshot / 任务 payload）——已完成。
- Task 3：梳理 sidecar / 本地依赖检测（FFmpeg、CosyVoice、HeyGem、Playwright）——已完成。
- Task 4：设计真实媒体产物路径与错误状态（不伪造文件、时长、分辨率）。
- Task 5：设计工作台各阶段从 mock 到真实能力的接入顺序。
- Task 6：设计发布自动化的账号、凭证、安全边界与失败恢复。

每次只执行一个 Task，完成并验证后同步更新本文件与当前计划。不要修改 `docs/reverse-engineering/legacy-ui-gap-list.md` 的状态列；不要修改 `.codex/dispatch-state.json`；每个源码计划只允许修改该计划列明的文件。

## 进度入口

- 阶段 3 架构映射：`docs/product-architecture/README.md`
- 路线图设计：`docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md`
- 当前计划 / 真实能力接入前置基础设施计划：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`
- 已完成 Stitch UI Vue 迁移计划：`docs/superpowers/plans/2026-06-23-stitch-ui-vue-migration.md`
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

阶段 5 P0：执行 `docs/superpowers/plans/2026-06-25-real-capability-foundation.md`。Task 1（GitHub Actions CI）、Task 2（Provider 配置与真实调用边界）与 Task 3（sidecar / 本地依赖检测）已完成，接下来执行 Task 4（设计真实媒体产物路径与错误状态）。按 Task 4–6 顺序梳理媒体产物、工作台真实化与发布自动化的边界与顺序。不要提前实现真实 AI / 语音 / 数字人 / 视频 / 发布源码，除非对应 Task 已规划并验收。

历史计划入口（已完成，勿重复执行）：

- 阶段 3 架构映射：`docs/product-architecture/README.md`
- 路线图设计：`docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md`
- 已完成 Stitch UI Vue 迁移计划：`docs/superpowers/plans/2026-06-23-stitch-ui-vue-migration.md`
- 已完成阶段 4 P0 发布计划：`docs/superpowers/plans/2026-06-17-mirax-publish-prep-mock-tasks.md`
- 已完成阶段 4 P0.5 UI/UX polish：`docs/superpowers/plans/2026-06-17-mirax-ui-ux-polish.md`
- 已完成阶段 4 P0 设置计划：`docs/superpowers/plans/2026-06-17-mirax-settings-provider-sidecar.md`
- 已完成阶段 4 P0 工作台计划：`docs/superpowers/plans/2026-06-17-mirax-workbench-workflow-architecture.md`
- 第一版可用计划：`docs/superpowers/plans/2026-06-12-mirax-first-usable-release.md`

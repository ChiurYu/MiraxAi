# Mirax AI 项目状态

## 当前总目标

通过证据驱动的方式，完整复刻旧版「轻语 IP 智能体」的产品功能。旧版 UI 只作为产品行为参考，不作为视觉目标。Mirax AI 会重新设计一套更专业的界面，但要保留旧产品的能力、流程、状态和产物链路。

## 当前阶段

阶段 4 P1 已完成：PR #2 已合并到 `main`，Stitch UI Vue 迁移进入主线。25 份 Stitch 导出收敛为 21 个 canonical 界面，Task 1–13 全部实施完成并通过自动验证与 Codex 总控视觉/回归验收。当前 UI 已覆盖 Workbench 8 个阶段、3 个资产库、任务中心、账号管理、7 类设置页面，但真实能力仍大多为 mock / 诚实空态。

阶段 5 P0 已完成：「真实能力接入前置基础设施与执行顺序」。PR #3 已合并到 `main`（merge commit `60b6cd3`，CI passed）。Task 1（GitHub Actions CI）、Task 2（Provider 配置与真实调用边界）、Task 3（sidecar / 本地依赖检测）、Task 4（真实媒体产物路径与错误状态）、Task 5（工作台各阶段从 mock 到真实能力的接入顺序）与 Task 6（发布自动化的账号、凭证、安全边界与失败恢复）已全部完成：`@mirax/provider-publish` 扩展 `PublishTaskStatus`、`PublishTask` 失败恢复字段与 `PublishHandoffResult` per-platform 子结果；`mockPublisher` 返回更真实失败场景；`local-store` schema 增加 `credential_ref` 与任务错误/重试字段；`AccountManagementView` 调整为诚实授权 handoff UI；`publishTaskStore` 防御性过滤凭证并归一化旧数据；`usePublishPreparation` 根据 `platformResults` 创建 `submitted` / `failed` / `retryable` 任务；`docs/product-architecture/publish-automation-security-design.md` 已创建。

阶段 5 P1 rewrite 已完成：PR #4 已合并到 `main`，CI passed。当前 `main` 已包含 provider-ai rewrite 真实调用边界、desktop rewrite provider 路由、rewrite 凭证读取边界、`ScriptRewritingStage` 四态 UI 与 Task 5 整体验收。rewrite 相关 Task 不再重复执行。

阶段 5 P2 speech 已完成本地实现并通过验收：`CosyVoiceProvider.synthesizeSpeech`、desktop speech provider 路由、真实 `audioPath` 边界、`SpeechSynthesisStage` 五态 UI 与整体验收均已完成。默认仍 mock；real 仅在用户配置并启用 TTS / CosyVoice provider 后生效；真实失败不 fallback 到 mock。

阶段 5 P3 voice-clone 已完成本地实现并通过验收：`CosyVoiceProvider.cloneVoice`、desktop voice-clone provider 路由、`VoiceCloningStage` 五态 UI 与整体验收均已完成。默认仍 mock；real 仅在用户配置并启用 CosyVoice provider 后生效；真实失败不伪造 `voiceId`，不 fallback 到 mock。

阶段 5 P4 transcribe 已完成本地实现并通过验收：`WhisperProvider.transcribe`、desktop transcribe provider 路由、`MaterialParsingStage` 五态 UI 与整体验收均已完成。默认仍 mock；real 仅在用户配置并启用 Whisper provider 后生效；真实失败不伪造 transcript，不 fallback 到 mock。

阶段 5 P5 avatar 已完成本地实现并通过验收：`HeyGemProvider.generateAvatarVideo`、desktop avatar provider 路由、`AvatarGenerationStage` 五态 UI 与整体验收均已完成。默认仍 mock；real 仅在用户配置并启用 HeyGem provider 后生效；真实失败不伪造视频路径或时长，不 fallback 到 mock。

当前阶段：**compose 阶段真实 FFmpeg renderer 接入已完成本地实现，等待总控 review**。本阶段只处理 `compose`：真实 `avatarVideoPath + audioPath + subtitleText` → 真实 `finalVideoPath`、`coverPath`、`subtitlePath`；不接入或改造 `review / publish`。默认仍 mock；仅配置 FFmpeg 路径但未完成真实可执行检测时，正常 UI 只能进入 not-connected，不宣称 real compose；真实失败不伪造成片、封面或字幕产物，不 fallback 到 mock。

Review Fix（真实能力 UI 入口收敛）已完成：App 已把启用的 provider 配置同步为 Workbench stage modes，正常 UI 入口可进入 Whisper / CosyVoice / HeyGem 真实路由；设置页“测试连接”已按 provider 类型调用真实连接测试，不再对 Whisper / CosyVoice / HeyGem 走 mock；Whisper / CosyVoice / HeyGem 本地服务 apiKey 统一为可选；真实 avatar 模式不会把内置 demo `presenter-a` 发送给 HeyGem。验证 `vitest run` 38 files / 305 tests、provider-ai `tsc`、core `tsc`、desktop `vue-tsc`、desktop Vite build 均通过。

Review Fix 2（stage mode 可执行配置收敛）已完成：App 不再只凭 provider `enabled` 自动切 real，而是要求当前 session 具备真实可执行配置。rewrite 需要非空 apiKey、model，custom 还需要合法 baseUrl；Whisper 需要合法 baseUrl 与 model；CosyVoice / HeyGem 需要合法 baseUrl。设置页 custom provider 缺 baseUrl 时直接报 not-configured，不再默认打 OpenAI URL。compose 不再只凭非空 `ffmpegPath` 切 real，未验证路径显示 not-connected，后续需要接入已验证 FFmpeg 状态后再自动 real。验证 `vitest run` 40 files / 317 tests、provider-ai/core/media-pipeline `tsc`、desktop `vue-tsc`、desktop Vite build、`cargo fmt --check`、`cargo check` 均通过。

阶段 5 P6 compose 已完成本地实现并通过验收：FFmpeg compose 命令已改为 avatar 视频 + speech 音频双输入，新增封面抽帧命令；desktop compose renderer 支持 real 路由，通过 Tauri `render_compose` command 调 Rust 层 FFmpeg；`VideoCompositionStage` 已接入 mock / real / not-connected / failed / success 状态。默认仍 mock；正常 UI 不再把未验证的 `sidecarConfig.ffmpegPath` 视为 real，真实失败不 fallback 到 mock，不伪造 `finalVideoPath` / `coverPath` / `subtitlePath`。

Task 13 Review Fix（Codex 收尾修复）已实现：设置页主题模式与 App 顶层主题状态已同源；本地依赖页改为单卡单状态；checkbox 与资产库 icon-only 小方形控件点击跳动已收敛；声音/形象/素材库的导入/新建按钮已改为可点击并打开诚实的「暂未接入」弹窗，不创建资源、不写入 store、不伪造成功。自动验证 `pnpm test`、`pnpm typecheck`、`pnpm --filter @mirax/desktop build:web` 均通过；浏览器交互脚本 `/tmp/mirax-task13-review-fix-check.js` 已通过；等待人工视觉复验。

Task 13 Review Fix 2 已修复浅色主题未覆盖 Teleport 抽屉/弹窗的问题：`AppDrawer.vue` 与 `AppDialog.vue` 的 overlay 和根节点已补 `data-theme`，避免脱离 `.app-shell[data-theme]` 后回退到暗色 token。验证 `pnpm --filter @mirax/desktop typecheck`、目标测试与 `/tmp/mirax-task13-review-fix-check.js` 均通过。

Task 13 Review Fix 3 已收敛 TopBar 公共壳：Workbench 顶部删除无功能左箭头、通知、帮助、账户图标，保留项目名、Autosaved 与真实可用的主题按钮；`AppShell`/`TopBar` 增加 `topbar-actions` 插槽，声音库/形象库/素材库的导入/新建操作已移入公共 TopBar，页面 header 不再重复放这些主操作。验证 `pnpm test`、`pnpm typecheck` 与 `/tmp/mirax-task13-review-fix-check.js` 均通过。

新规划入口：

- **当前计划 / compose 真实 FFmpeg renderer 规划：`docs/superpowers/plans/2026-06-29-real-compose-renderer.md`**
- 已完成 avatar 真实 HeyGem provider 规划：`docs/superpowers/plans/2026-06-29-real-avatar-provider.md`
- 已完成 transcribe 真实 Whisper provider 规划：`docs/superpowers/plans/2026-06-29-real-transcribe-provider.md`
- 已完成 voice-clone 真实 CosyVoice provider 规划：`docs/superpowers/plans/2026-06-29-real-voice-clone-provider.md`
- 已完成 speech 真实 TTS provider 规划：`docs/superpowers/plans/2026-06-29-real-speech-provider.md`
- 已完成 rewrite 真实 LLM provider 计划：`docs/superpowers/plans/2026-06-26-real-rewrite-provider.md`
- 真实能力接入前置基础设施计划：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`（已完成）
- 来源映射：`docs/product-architecture/stitch-ui-source-map.md`
- 实施计划：`docs/superpowers/plans/2026-06-23-stitch-ui-vue-migration.md`
- 视觉与功能提示词：`docs/superpowers/specs/2026-06-22-mirax-stitch-ui-redesign-design.md`

用户已确认当前工作区已有的未提交 Workbench 改动作为功能基线，canonical Stitch 导出作为视觉基线。后续实现必须在现有工作区上增量进行：允许重构外壳和样式，但不得回滚或丢失 workflow、阶段状态、草稿、Provider、媒体产物、发布准备和 mock 任务行为。

阶段 4 P0.5：UI/UX polish 已完成。在阶段 4 三个 P0 源码计划完成后，对工作台、设置/Provider/sidecar、发布准备与 mock 任务做了统一的视觉层级、状态表达、响应式和页面验收优化。

阶段 4 P0：发布准备与 mock 发布任务源码实现（已完成，Task 1-12 已完成）。

阶段 3：Mirax AI 新版产品架构映射（已完成）。

阶段 4 P0 已完成工作台 workflow 拆分、设置 / Provider / sidecar 配置，以及发布准备与 mock 发布任务。发布链路已把标题/描述/话题/封面/发布方式抽成 `PublishMetadata`，把 mock 发布结果抽成 `PublishTask`，并用 localStorage 持久化到 `publishTaskStore`。

## 当前自动调度入口

阶段 4 P1 Stitch UI Vue 迁移已完成并合并。阶段 5 P0 已完成并合并（PR #3）。阶段 5 P1 rewrite 真实 LLM provider 已完成并合并（PR #4，CI passed）。阶段 5 P2 speech、P3 voice-clone、P4 transcribe、P5 avatar 与 P6 compose 已完成本地实现。当前自动调度入口为 **compose 阶段接入 FFmpeg renderer 规划**。

**`docs/superpowers/plans/2026-06-29-real-compose-renderer.md`**

该计划只覆盖 Workbench `compose` 阶段：确认 FFmpeg compose 调用契约、设计 desktop compose renderer 从 mock 切到 real、设计 `VideoCompositionStage` 五态 UI、最后做整体验收。默认仍 mock；未验证 FFmpeg 路径只能进入 not-connected；real 失败不得 fallback 到 mock；不得伪造 finalVideoPath / coverPath / subtitlePath。

## 最新可执行任务

阶段 4 P1 Stitch UI Vue 迁移全部 13 个 Task 已完成并合并，不再重复执行。阶段 5 P0 全部 6 个 Task 已完成并合并（PR #3），不再重复执行。阶段 5 P1 rewrite 全部 5 个 Task 已完成并合并（PR #4），不再重复执行。

下一阶段最新可执行任务见 `docs/superpowers/plans/2026-06-29-real-compose-renderer.md`：

- Task 1（已完成）：确认 FFmpeg compose 调用契约与结构化错误。`buildVerticalComposeCommand` 已使用 avatar 视频 + speech 音频双输入，新增 `buildCoverFrameCommand`；缺输入与 FFmpeg 失败映射为结构化错误，错误不泄露路径。
- Task 2（已完成）：设计 desktop compose renderer 从 mock 切到 real 的路由。实现 `selectComposeRenderer`、`createTauriComposeRenderer`、Tauri `render_compose` command 与 `App.vue` compose 分支路由；real 调用前清空旧成片结果，成功后才写入新结果。
- Task 3（已完成）：设计 `VideoCompositionStage` 的 mock / real / not-configured / failed / success UI 状态。实现 `mode` / `errorMessage` props、Mock 合成标注、真实 FFmpeg 提示、not-connected 禁用合成、failed 错误横幅与 App props 接线。
- Task 4（已完成）：整体验收与测试计划。复验 compose 目标测试 30 tests、全仓 317 tests、provider-ai/core/media-pipeline `tsc`、desktop `vue-tsc`、desktop Vite build、`cargo fmt --check`、`cargo check`、`git diff --check` 与受保护文件 diff，均通过。Review Fix 2 追加覆盖 stage mode 可执行配置、custom baseUrl 测试一致性、未验证 FFmpeg 路径 not-connected。未依赖真实 FFmpeg 做测试，未实现 BGM/复杂字幕/绿幕/publish，未 commit / push。

每次只执行一个 Task，完成并验证后同步更新本文件与当前计划。不要修改 `docs/reverse-engineering/legacy-ui-gap-list.md` 的状态列；不要修改 `.codex/dispatch-state.json`；每个源码计划只允许修改该计划列明的文件。

## 进度入口

- 阶段 3 架构映射：`docs/product-architecture/README.md`
- 路线图设计：`docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md`
- 当前计划 / compose 真实 FFmpeg renderer 规划：`docs/superpowers/plans/2026-06-29-real-compose-renderer.md`
- 已完成 avatar 真实 HeyGem provider 规划：`docs/superpowers/plans/2026-06-29-real-avatar-provider.md`
- 已完成 transcribe 真实 Whisper provider 规划：`docs/superpowers/plans/2026-06-29-real-transcribe-provider.md`
- 已完成 voice-clone 真实 CosyVoice provider 规划：`docs/superpowers/plans/2026-06-29-real-voice-clone-provider.md`
- 已完成 speech 真实 TTS provider 规划：`docs/superpowers/plans/2026-06-29-real-speech-provider.md`
- 已完成 rewrite 真实 LLM provider 计划：`docs/superpowers/plans/2026-06-26-real-rewrite-provider.md`
- 已完成真实能力接入前置基础设施计划：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`
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

阶段 5 P1 rewrite 已完成，PR #4 已合并到 `main`，CI passed。speech、voice-clone、transcribe、avatar 与 compose 已按推荐顺序完成本地实现和验收。下一步等待总控 review：

1. 当前计划见 `docs/superpowers/plans/2026-06-29-real-compose-renderer.md`。
2. Task 1–4 已完成；下一步等待总控 review。
3. 本阶段只处理 `compose`：真实 `avatarVideoPath + audioPath + subtitleText` → 真实 `finalVideoPath` / `coverPath` / `subtitlePath`。
4. 默认仍 mock；未验证 FFmpeg 路径只能进入 not-connected，后续接入已验证 FFmpeg 状态后才允许正常 UI 自动 real。
5. 不实现 BGM、复杂字幕样式、绿幕抠像、review / publish；不伪造成片、封面、字幕、时长、文件大小或波形。

历史计划入口（已完成，勿重复执行）：

- 阶段 5 P3 / voice-clone 真实 CosyVoice provider：`docs/superpowers/plans/2026-06-29-real-voice-clone-provider.md`
- 阶段 5 P2 / speech 真实 TTS provider：`docs/superpowers/plans/2026-06-29-real-speech-provider.md`
- 阶段 5 P4 / transcribe 真实 Whisper provider：`docs/superpowers/plans/2026-06-29-real-transcribe-provider.md`
- 阶段 5 P0 / 真实能力接入前置基础设施：`docs/superpowers/plans/2026-06-25-real-capability-foundation.md`
- 阶段 5 P1 / rewrite 真实 LLM provider：`docs/superpowers/plans/2026-06-26-real-rewrite-provider.md`
- 阶段 3 架构映射：`docs/product-architecture/README.md`
- 路线图设计：`docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md`
- 已完成 Stitch UI Vue 迁移计划：`docs/superpowers/plans/2026-06-23-stitch-ui-vue-migration.md`
- 已完成阶段 4 P0 发布计划：`docs/superpowers/plans/2026-06-17-mirax-publish-prep-mock-tasks.md`
- 已完成阶段 4 P0.5 UI/UX polish：`docs/superpowers/plans/2026-06-17-mirax-ui-ux-polish.md`
- 已完成阶段 4 P0 设置计划：`docs/superpowers/plans/2026-06-17-mirax-settings-provider-sidecar.md`
- 已完成阶段 4 P0 工作台计划：`docs/superpowers/plans/2026-06-17-mirax-workbench-workflow-architecture.md`
- 第一版可用计划：`docs/superpowers/plans/2026-06-12-mirax-first-usable-release.md`
- 阶段 5 P5 / avatar 真实 HeyGem provider：`docs/superpowers/plans/2026-06-29-real-avatar-provider.md`

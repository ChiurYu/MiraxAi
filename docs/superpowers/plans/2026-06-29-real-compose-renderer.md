# Compose 阶段接入真实 FFmpeg Renderer 实施规划

## 范围

本计划只处理 Workbench `compose` 阶段：真实输入 `avatarVideoPath + audioPath + subtitleText`，真实输出 `finalVideoPath`、`coverPath`、`subtitlePath`。不处理 `review / publish`，不接入 BGM、复杂字幕样式、绿幕抠像、片头静音、缩略图批量生成或素材库写入。

默认仍使用 mock；仅配置 FFmpeg 路径但未完成真实可执行检测时，正常 UI 只能进入 not-connected，不宣称 real compose。后续接入已验证依赖状态后，才允许正常 UI 自动进入 real。真实失败必须诚实失败，不 fallback 到 mock；不得伪造成片路径、封面、字幕文件、时长、文件大小或波形。测试使用 fake invoke / fake runner，不依赖真实 FFmpeg。

## Task 1：确认 FFmpeg compose 调用契约与结构化错误

状态：已完成。

- `buildVerticalComposeCommand` 必须使用 avatar 视频与 speech 音频两个输入。
- 增加封面抽帧命令，真实封面只能由 FFmpeg 命令成功后视为产物。
- 缺输入时抛出 `MediaRendererError`，错误信息不泄露本地路径。
- FFmpeg 执行失败映射为 `render-failed`。

完成摘要：`buildVerticalComposeCommand` 已改为 avatar 视频 + speech 音频双输入；新增 `buildCoverFrameCommand`；缺输入仍抛出 `MediaRendererError`，错误信息不带具体路径。

## Task 2：设计 desktop compose renderer 路由

状态：已完成。

- 使用现有 `sidecarConfig.ffmpegPath` 决定 compose 阶段 mock / not-connected；不能仅凭非空路径进入 real。
- 增加 `selectComposeRenderer`：mock 返回 mock renderer；real 要求 FFmpeg 路径；not-connected 诚实失败。
- 真实 renderer 通过 Tauri command 调用 Rust 层，不在前端引入 Node `child_process`。
- real 模式开始前清空旧 `generatedVideoPath` / `generatedCoverPath`，成功后才写入新结果。

完成摘要：已实现 `selectComposeRenderer` / `createTauriComposeRenderer`；App 不再根据非空 `sidecarConfig.ffmpegPath` 自动进入 real，未验证路径只进入 not-connected。真实执行仍通过 Tauri `render_compose` command 调 Rust 层 FFmpeg，不在前端引入 Node 执行能力。

## Task 3：设计 `VideoCompositionStage` 的 mock / real / not-configured / failed / success UI 状态

状态：已完成。

- mock 模式明确显示“Mock 合成”。
- real 模式显示真实 FFmpeg 提示。
- not-connected 模式显示“真实合成未连接”，并禁用合成按钮。
- failed 状态显示安全错误横幅。
- success 状态只展示 renderer 返回的路径。

完成摘要：`VideoCompositionStage` 已接入 `mode` / `errorMessage` props，显示 Mock 合成、真实 FFmpeg 提示、not-connected 提示、failed 错误横幅与成功结果；not-connected 禁用合成按钮。

## Task 4：整体验收与测试计划

状态：已完成。

- `packages/media-pipeline/tests/ffmpeg-commands.test.ts`
- `apps/desktop/src/composables/useComposeRenderer.test.ts`
- `apps/desktop/src/components/workbench/stages/VideoCompositionStage.test.ts`
- `apps/desktop/src/App.provider-runtime.test.ts`
- 全仓 `vitest`、media-pipeline `tsc`、desktop `vue-tsc`、desktop Vite build。
- `git diff --check`。
- 受保护文件 diff 检查：`docs/reverse-engineering/legacy-ui-gap-list.md`、`.codex/dispatch-state.json`、`docs/人工提示词.md` 必须为空。

完成摘要：目标 compose 测试通过；全仓 40 files / 317 tests 通过；provider-ai/core/media-pipeline `tsc`、desktop `vue-tsc`、desktop Vite build、`cargo fmt --check`、`cargo check` 均通过。Review Fix 追加覆盖：正常 UI 不再从未验证 FFmpeg 路径自动进入 real。未依赖真实 FFmpeg 做测试，未实现 BGM/复杂字幕/绿幕/发布，未 commit / push。

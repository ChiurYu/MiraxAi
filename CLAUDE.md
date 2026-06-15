# CLAUDE.md

本文件用于指导 Claude Code 在本仓库中执行任务。Codex 作为总控时，会把具体任务派发给 Claude/Kimi 工位；Claude 工位应遵守本文约定，不自行提交或推送，除非任务指令明确允许。

## 项目概览

Mirax AI 是旧版「轻语 IP 智能体」的桌面端重建项目。当前仓库是 pnpm monorepo，目标产物是 Tauri + Vue 3 桌面应用，用于短视频创作和多平台发布。

第一版可用目标围绕旧版演示视频中确认的短视频工作流：

1. 导入或提取对标视频内容。
2. 使用用户自行配置的 AI 服务生成改写文案。
3. 选择声音样本和数字人形象素材。
4. 生成竖屏数字人口播视频预览。
5. 准备标题、封面、描述、话题和标签。
6. 选择发布账号，并交接给平台发布模块。

## 常用命令

安装依赖：

```bash
pnpm install
```

运行全部测试：

```bash
pnpm test
```

运行单个测试文件：

```bash
pnpm test packages/core/tests/workflow.test.ts
pnpm test desktop/src/runtime/desktopDraft.test.ts
```

全仓类型检查：

```bash
pnpm typecheck
```

全仓 lint。目前 lint 等价于类型检查：

```bash
pnpm lint
```

构建全部包和桌面应用：

```bash
pnpm build
```

用浏览器方式开发桌面前端，速度最快，不启动 Tauri / Rust：

```bash
pnpm --filter @mirax/desktop dev:web
```

用 Tauri 方式开发桌面应用，需要 Rust 工具链：

```bash
pnpm --filter @mirax/desktop dev
```

构建桌面端分发产物，macOS 默认输出 `.app`：

```bash
pnpm --filter @mirax/desktop build
```

预览已构建的 Web 前端：

```bash
pnpm --filter @mirax/desktop preview
```

## 工作区结构

仓库使用 pnpm workspace：

- `desktop/`：桌面应用。
- `packages/*`：桌面端复用的共享包。

## 包说明

### `@mirax/core`

路径：`packages/core/`

领域模型和纯逻辑。导出 workflow 阶段、核心类型、不可变 workflow 状态转换和校验函数。该包不应包含副作用。

关键导出包括：

- `createDefaultWorkflow`
- `updateStageStatus`
- `getNextStage`
- `ProjectDraft`
- `ApiKeyProviderConfig`
- `validateProjectDraft`
- `validateProviderConfig`

### `@mirax/provider-ai`

路径：`packages/provider-ai/`

AI 服务抽象层。定义 `AiProvider` 接口，覆盖文案提取、文案改写、声音克隆、语音合成和数字人视频生成。当前第一版桌面端直接使用 mock provider。

### `@mirax/media-pipeline`

路径：`packages/media-pipeline/`

视频和音频渲染抽象层。包含 `MediaRenderer` 接口、mock renderer，以及 FFmpeg 命令构建辅助函数。当前 mock renderer 还不会真正调用 FFmpeg。

### `@mirax/provider-publish`

路径：`packages/provider-publish/`

平台发布抽象层。定义 `Publisher`、`PublishAccount`、平台资料和 mock publisher。

当前支持的平台 ID：

- `douyin`
- `xiaohongshu`
- `kuaishou`
- `shipinhao`
- `bilibili`

### `@mirax/local-store`

路径：`packages/local-store/`

本地 SQLite schema migration 和仓储接口。覆盖 provider 配置、内容草稿、视频项目、发布账号和 workflow 任务。桌面端尚未接入真实数据库实现。

### `@mirax/sidecar-manager`

路径：`packages/sidecar-manager/`

本地依赖和服务健康检查。覆盖 FFmpeg、Playwright 浏览器、Python 本地服务、HeyGem 和 CosyVoice。

## 桌面端说明

路径：`desktop/`

Tauri 2 桌面壳 + Vue 3 单页应用。

- `src/main.ts`：Vue 应用启动入口。
- `src/App.vue`：当前第一版主界面和 workflow 编排入口。阶段执行、本地状态和 provider 调用大多仍在这里。
- `src/runtime/desktopDraft.ts`：桌面草稿持久化辅助。草稿存储在 `window.localStorage` 的 `mirax-ai.desktop-draft.v1` 键下。API Key 必须通过 `sanitizeDesktopDraftForStorage` 过滤，恢复时保持空字符串。
- `src-tauri/`：Rust Tauri 项目。`tauri.conf.json` 定义单窗口，前端构建目录为 `../dist`。当前 bundle 目标是 macOS `.app`，DMG 打包后续再启用。

## 架构注意事项

- 当前桌面端使用 mock AI、mock media 和 mock publisher。真实能力后续通过 provider / sidecar 抽象替换，不要在 UI 层直接耦合模型服务、FFmpeg、Playwright 或 Python 服务细节。
- workflow 状态转换在 `@mirax/core` 中保持不可变。桌面端用 Vue ref 持有 workflow，并通过 `updateStageStatus` 更新。
- 八个 workflow 阶段顺序是：`transcribe -> rewrite -> voice-clone -> speech -> avatar -> compose -> review -> publish`。其中 `review` 为可选，其余为必需。
- TypeScript path mapping 在 `tsconfig.base.json` 中配置；Vite alias 在 `desktop/vite.config.ts` 中配置。开发时 workspace import 直接指向包源码。
- 各 package 的 build 都是简单 `tsc` 编译，不使用包级 bundler。
- 大型逆向输入文件不要入 Git，包括 DMG、操作视频、解包 ASAR、抽帧图片等，规则见 `.gitignore`。

## 协作约定

- Claude/Kimi 工位接到任务后，只修改任务指定文件。
- 默认不要 `git commit`、不要 `git push`，由总控统一 review、验证、提交。
- 代码改动后至少运行任务要求的局部测试；影响共享包或桌面端主流程时还要运行 `pnpm typecheck`。
- 涉及第一版任务进度时，更新 `docs/superpowers/plans/2026-06-12-mirax-first-usable-release.md`。
- 涉及旧版功能对齐时，参考 `docs/reverse-engineering/legacy-ui-gap-list.md` 和 `docs/reverse-engineering/demo-video-coverage.md`。

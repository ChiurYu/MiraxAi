# P0 Compose Fake Result Fix

## 背景

`first-real-chain-dogfood-acceptance` 已完成浏览器 dogfood 验收并写入：

- `/tmp/mirax-first-real-chain-dogfood/report.json`
- `/tmp/mirax-first-real-chain-dogfood/summary.md`

验收发现 P0：当 Workbench `compose` 阶段走 real renderer，且 `render_compose` 失败时，UI 仍显示“已完成”，并写入 `final.mp4` / `cover.png` 等合成路径。这违反当前阶段硬约束：真实失败不得伪造成片、封面或字幕产物，不得 fallback 到 mock。

已知高概率根因在 desktop compose renderer：`createTauriComposeRenderer.render()` 预先计算输出路径，并且只处理 `invoke("render_compose")` 抛错；如果 fake Tauri invoke 以 `{ ok: false, error }` 形式 resolve，renderer 仍会返回这些路径。

## 目标

- 只修复 P0：`render_compose` 失败或返回结构化失败结果时，不得返回任何 `finalVideoPath` / `coverPath` / `subtitlePath`。
- `createTauriComposeRenderer.render()` 必须把失败映射为 `MediaRendererError`，`code` 为 `render-failed`，错误消息不得泄露本地路径。
- App compose 阶段应保持 failed / honest failed，不显示 completed，不写入生成产物路径，不 fallback 到 mock。

## 非目标

- 不修 P1：AI 服务卡片“已启用” readiness 文案。
- 不修 P1：AI 服务卡片 provider 类型/名称显示。
- 不修 P2：`convertFileSrc` web dev 降级，除非它阻塞本 P0 的最小浏览器验收。
- 不接入真实 provider 网络测试。
- 不依赖真实 FFmpeg。
- 不实现 keychain / OS 安全存储。
- 不 commit / push。

## 允许修改

尽量少改，优先只改：

- `apps/desktop/src/composables/useComposeRenderer.ts`
- `apps/desktop/src/composables/useComposeRenderer.test.ts`

如果证明 P0 验收需要，可最小补充：

- `apps/desktop/src/App.provider-runtime.test.ts`
- `apps/desktop/src/components/workbench/stages/VideoCompositionStage.test.ts`

浏览器验收产物只能写入：

- `/tmp/mirax-compose-p0-fake-result-fix/`

## 禁止修改

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- `docs/superpowers/PROJECT-STATE.md`
- P1/P2 相关源码，除非总控另派任务

## 实现要求

1. 先补失败测试，再实现。
2. 使用 fake invoke / fake probe，不依赖真实 FFmpeg。
3. 覆盖 `invoke("render_compose")` resolve 为 `{ ok: false, error: "..." }` 的场景。
4. 失败时应 reject / throw `MediaRendererError("render-failed")`，不得返回预计算 output paths。
5. 错误消息不得泄露本地路径，例如 `/tmp/...`、用户目录、完整 FFmpeg 输入/输出路径。
6. 保持原生 Tauri 成功契约兼容：`undefined` / `null` 成功仍可返回真实输出路径；如遇 `{ ok: true }` 也可视为成功。
7. 不 fallback 到 mock。

## 验证命令

必须运行：

```bash
./node_modules/.bin/vitest run apps/desktop/src/composables/useComposeRenderer.test.ts apps/desktop/src/App.provider-runtime.test.ts apps/desktop/src/components/workbench/stages/VideoCompositionStage.test.ts
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json
git diff --check
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md docs/人工提示词.md docs/superpowers/PROJECT-STATE.md .codex/dispatch-state.json
```

并做 Playwright/browser 复验：

- 使用 `/tmp/mirax-compose-p0-fake-result-fix/` 保存 report 和截图。
- 复现 `render_compose` 失败。
- 验证 UI 不显示 completed / 已完成，不显示或写入 `final.mp4`、`cover.png` 作为成功产物。
- 验证 `window.__miraxQA` 中生成产物路径为空或未设置。

## 完成报告格式

```text
STATUS: DONE | BLOCKED
CHANGED FILES:
SUMMARY:
BROWSER VERIFICATION:
VERIFICATION:
NOTES:
- 未 commit / push
```

你是 Mirax AI 项目的 Claude 实现工位。遵守仓库 CLAUDE.md。

## 任务

**ID:** legacy-ui-gap-2
**标题:** 改写文案

实现 docs/reverse-engineering/legacy-ui-gap-list.md 第二项「改写文案」差距。

目标：
1. 「2. 改写文案」卡片的状态 badge 必须清晰反映 pending / running / completed / failed（StatusBadge 已有基础，确保失败时视觉明显）。
2. 当 rewrite 阶段为 failed 时，卡片内提供明确的「重试」入口（不要只依赖隐式 resetFailedStage）；按钮文案与 disabled 逻辑要合理（completed 仍可查看，failed 可重试，running 禁用）。
3. 失败时保留错误信息可见性：结合执行记录 logs 或卡片内简短错误提示，让用户知道可否重试。
4. 单卡片「改写文案」按钮与全流程按钮边界保持清晰；不要破坏其他阶段卡片。

## 允许修改

- apps/desktop/src/App.vue
- apps/desktop/src/components/StatusBadge.vue
- apps/desktop/src/styles.css
- apps/desktop/src/runtime/（仅当需要少量抽取逻辑且有必要）

## 禁止

- 不要 git commit，不要 git push
- 不要修改允许范围外的文件
- 当前产品 UI 使用「Mirax AI」

## 验收标准

- 改写文案卡片在 mock 失败场景下显示 failed badge 和重试按钮
- running / completed 状态显示正确
- 重试后能从 failed 回到 pending 并再次执行

## 必须运行的验证命令

pnpm --filter @mirax/desktop typecheck
pnpm test -- apps/desktop/src/runtime/desktopDraft.test.ts packages/core/tests/workflow.test.ts

## 浏览器验证

pnpm --filter @mirax/desktop dev:web 后访问 http://127.0.0.1:1420，验证改写文案卡片状态与重试交互。

## 完成报告（严格格式）

STATUS: DONE | BLOCKED | IN_PROGRESS

CHANGED FILES:
- ...

VERIFICATION:
- ...

BROWSER VERIFICATION:
- performed | skipped — ...

NOTES/RISKS:
- ...

## 完成后

1. 在终端输出上述报告（含 STATUS: DONE）
2. 运行：bash .codex/scripts/signal-worker-done.sh
3. 等待总控验收

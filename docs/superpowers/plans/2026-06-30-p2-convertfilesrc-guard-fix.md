# P2 convertFileSrc Web Dev Guard Fix

## Background

P1 AI service readiness display and regression acceptance are complete. The only known remaining P2 is a browser/dev-mode guard around `VideoCompositionStage` preview URL handling.

Evidence:

- `/tmp/mirax-first-real-chain-dogfood-regression/report.json`
- `/tmp/mirax-p1-ai-service-readiness-regression/report.json`

## Goal

- Ensure `VideoCompositionStage` does not call Tauri-only `convertFileSrc` in web dev / non-Tauri browser mode when `videoPath` is non-empty.
- Preserve desktop/Tauri behavior: in Tauri, convert local video paths through `convertFileSrc(path, "asset")`.
- In web dev, avoid crashing and keep an honest preview state instead of pretending a Tauri asset URL exists.

## Non-Goals

- Do not change compose renderer behavior.
- Do not change FFmpeg readiness or provider routing.
- Do not create fake media artifacts.
- Do not implement real provider/network tests.
- Do not commit or push.

## Allowed Files

Prefer only:

- `apps/desktop/src/components/workbench/stages/VideoCompositionStage.vue`
- `apps/desktop/src/components/workbench/stages/VideoCompositionStage.test.ts`

Browser evidence may only be written under:

- `/tmp/mirax-p2-convertfilesrc-guard-fix/`

## Forbidden Files

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- `docs/superpowers/PROJECT-STATE.md`
- Provider, FFmpeg, compose renderer, or settings files unrelated to this guard.

## Requirements

1. First add the smallest regression test/contract that proves non-Tauri web mode does not call `convertFileSrc` with a non-empty `videoPath`.
2. If current code already satisfies the guard, do not force a source change beyond the regression test.
3. If implementation is needed, keep it to the smallest guard in `VideoCompositionStage.vue`.
4. Do not add dependencies.
5. Do not modify unrelated UI behavior.

## Verification

Run:

```bash
./node_modules/.bin/vitest run apps/desktop/src/components/workbench/stages/VideoCompositionStage.test.ts
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json
git diff --check
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md docs/人工提示词.md docs/superpowers/PROJECT-STATE.md .codex/dispatch-state.json
```

Browser verification:

- Use Playwright/browser in desktop web dev mode.
- Provide a non-empty `videoPath` scenario.
- Confirm the page/stage does not crash in non-Tauri browser mode.
- Save report, summary, and screenshot under `/tmp/mirax-p2-convertfilesrc-guard-fix/`.

## Completion Format

```text
STATUS: DONE | BLOCKED
CHANGED FILES:
SUMMARY:
BROWSER VERIFICATION:
VERIFICATION:
NOTES:
- 未 commit / push
```

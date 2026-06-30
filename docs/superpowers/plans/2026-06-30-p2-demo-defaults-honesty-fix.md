# P2 Demo Defaults Honesty Fix

> **For agentic workers:** Execute this scoped fix only. Workers never commit or push.

## Background

`first-usable-release-audit` found two P2 dogfood honesty issues:

- `MaterialParsingStage` shows fabricated recent-parse demo entries.
- The default desktop draft pre-fills source/voice sample paths, making first dogfood look like user-selected assets already exist.

## Goal

Remove misleading default/demo data from the first Workbench dogfood path.

## Non-Goals

- Do not remove asset library mock data.
- Do not change provider routing or media rendering.
- Do not implement persistence or keychain.
- Do not add new onboarding flows.
- Do not commit or push.

## Allowed Files

Prefer only:

- `apps/desktop/src/runtime/desktopDraft.ts`
- `apps/desktop/src/runtime/desktopDraft.test.ts`
- `apps/desktop/src/components/workbench/stages/MaterialParsingStage.vue`
- Existing focused test files if needed for the above behavior.

Browser evidence may only be written under:

- `/tmp/mirax-p2-demo-defaults-honesty-fix/`

## Forbidden Files

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- `docs/superpowers/PROJECT-STATE.md`
- Provider runtime, FFmpeg, compose renderer, publish code, unrelated asset libraries.

## Requirements

1. First add/update the smallest test that locks default desktop draft source/voice paths as empty.
2. Remove fabricated default `sourceVideoPath` and `voiceSamplePath` from `createDefaultDesktopDraft`.
3. Preserve restored user-saved paths. Do not wipe saved drafts.
4. Replace `MaterialParsingStage` hard-coded recent parse demo row with an honest empty/recent-none state.
5. Do not create fake files, fake recent activity, fake waveform, fake duration, or fake file size.

## Verification

Run:

```bash
./node_modules/.bin/vitest run apps/desktop/src/runtime/desktopDraft.test.ts
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json
git diff --check
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md docs/人工提示词.md docs/superpowers/PROJECT-STATE.md .codex/dispatch-state.json
```

Browser verification:

- Use Playwright/browser against desktop web dev mode.
- Confirm a fresh/default draft does not prefill source video or voice sample path.
- Confirm `MaterialParsingStage` no longer shows fabricated recent parse entries and instead shows an honest empty state.
- Save report, summary, and screenshot under `/tmp/mirax-p2-demo-defaults-honesty-fix/`.

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

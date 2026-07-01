# P1 Default Draft Honesty Fix

> **For agentic workers:** Execute this scoped fix only. Workers never commit or push.

## Background

`first-dogfood-smoke-audit` found one auto-fixable P1 blocker:

- `createDefaultDesktopDraft()` still pre-fills a fake project name and fake project notes.

## Goal

Fresh/default desktop drafts must not look like a user already selected or authored a real dogfood project.

## Non-Goals

- Do not add onboarding.
- Do not change provider routing.
- Do not change publish or media rendering.
- Do not implement persistence or keychain.
- Do not commit or push.

## Allowed Files

Prefer only:

- `apps/desktop/src/runtime/desktopDraft.ts`
- `apps/desktop/src/runtime/desktopDraft.test.ts`

Browser evidence may only be written under:

- `/tmp/mirax-p1-default-draft-honesty-fix/`

## Forbidden Files

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- `docs/superpowers/PROJECT-STATE.md`
- Provider runtime, FFmpeg, compose renderer, publish code, unrelated UI files.

## Requirements

1. First add/update the smallest failing test proving default draft `project.name` and `project.notes` are not fake user-authored content.
2. Change `createDefaultDesktopDraft()` to use neutral honest defaults.
3. Preserve `restoreDesktopDraft()` behavior for saved user drafts.
4. Do not create fake files, fake recent activity, fake waveform, fake duration, or fake file size.

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
- Clear `mirax-ai.desktop-draft.v1` and reload.
- Confirm fresh Workbench no longer shows fake project name `轻奢女包口播 0611` or fake notes `强调通勤、大容量、上身质感。`.
- Confirm saved draft restoration still keeps real saved user values if practical.
- Save report, summary, and screenshot under `/tmp/mirax-p1-default-draft-honesty-fix/`.

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

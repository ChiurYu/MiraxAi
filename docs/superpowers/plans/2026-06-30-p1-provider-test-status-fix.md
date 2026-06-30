# P1 Provider Test Status Fix

> **For agentic workers:** Execute this scoped fix only. Workers never commit or push.

## Background

`first-usable-release-audit` found no P0 blockers. One auto-fixable P1 remains:

- Provider test connection failure only shows an inline error while the provider card still displays `已就绪`.
- The `连接失败` filter therefore does not reliably represent failed connection tests.

The other P1, session-only API keys, is not part of this task because keychain / OS credential storage is explicitly out of scope.

## Goal

After a provider connection test fails, the AI services settings UI must honestly surface that provider as failed.

## Non-Goals

- Do not implement keychain / OS secure storage.
- Do not persist API keys.
- Do not change runtime provider routing.
- Do not add providers.
- Do not run real network provider tests.
- Do not commit or push.

## Allowed Files

Prefer only:

- `apps/desktop/src/components/settings/AiServicesSettings.vue`
- `apps/desktop/src/components/settings/AiServicesSettings.test.ts`

Browser evidence may only be written under:

- `/tmp/mirax-p1-provider-test-status-fix/`

## Forbidden Files

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`
- `docs/人工提示词.md`
- `docs/superpowers/PROJECT-STATE.md`
- Provider runtime, FFmpeg, compose renderer, or unrelated settings files.

## Requirements

1. First add the smallest failing test proving a configured provider with a failed test appears in the failed state/filter.
2. Implement the smallest UI state fix in `AiServicesSettings.vue`.
3. Keep config completeness readiness separate from live connection-test status, but make the card/filter honest after a failed test.
4. A successful retry should clear the failed state and restore the ready display.
5. Do not leak API keys or local paths in messages, snapshots, or tests.

## Verification

Run:

```bash
./node_modules/.bin/vitest run apps/desktop/src/components/settings/AiServicesSettings.test.ts
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json
git diff --check
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md docs/人工提示词.md docs/superpowers/PROJECT-STATE.md .codex/dispatch-state.json
```

Browser verification:

- Use Playwright/browser against desktop web dev mode.
- Configure a provider that is complete enough to be ready.
- Force a connection test failure.
- Confirm the card displays a failed/connection-failed state and the `连接失败` filter includes it.
- Save report, summary, and screenshot under `/tmp/mirax-p1-provider-test-status-fix/`.

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

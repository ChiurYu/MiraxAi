# First Usable Release Readiness Plan

> **For agentic workers:** Execute one task at a time. Codex is controller; Claude/Kimi are workers. Workers never commit or push.

## Goal

Verify Mirax AI is ready for first real dogfood use after the real Workbench capability chain landed on `main`.

This plan is about release/readiness, not new provider expansion.

## Scope

- Settings and local dependency readiness are honest.
- Workbench stages expose mock / real / not-connected / failed states honestly.
- Failed or not-connected paths do not fabricate transcripts, audio, videos, covers, subtitles, durations, file sizes, or waveforms.
- Desktop web dev and build/typecheck entry points remain healthy.
- Known limitations are captured as blockers ranked P0/P1/P2.

## Non-Goals

- Do not add more providers.
- Do not implement keychain / OS secure storage.
- Do not run real network provider tests.
- Do not require real FFmpeg or real local AI services.
- Do not silently fallback to mock after a real-path failure.
- Do not commit or push from worker tasks.

## Task 1: First Usable Release Audit

**Kind:** worker acceptance

**Allowed writes:**

- `/tmp/mirax-first-usable-release-audit/`

**Forbidden repository writes:**

- Application source, tests, docs, config, lockfiles.
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `docs/人工提示词.md`
- `docs/superpowers/PROJECT-STATE.md`
- `.codex/dispatch-state.json`

- [ ] Run a Playwright/browser dogfood pass against the desktop web app.
- [ ] Check settings/provider readiness and local dependency readiness.
- [ ] Check Workbench transcribe / rewrite / voice-clone / speech / avatar / compose readiness and failure states.
- [ ] Confirm failed/not-connected paths do not fabricate output artifacts.
- [ ] Save screenshots, `report.json`, and `summary.md` under `/tmp/mirax-first-usable-release-audit/`.
- [ ] Run minimal verification:

```bash
./node_modules/.bin/vitest run apps/desktop/src/App.provider-runtime.test.ts apps/desktop/src/composables/useAppSettings.test.ts apps/desktop/src/composables/useComposeRenderer.test.ts apps/desktop/src/components/settings/AiServicesSettings.test.ts apps/desktop/src/components/workbench/stages/VideoCompositionStage.test.ts
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json
git diff --check
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md docs/人工提示词.md docs/superpowers/PROJECT-STATE.md .codex/dispatch-state.json
```

**Report format:**

```text
STATUS: DONE | BLOCKED
CHANGED FILES:
SUMMARY:
BROWSER VERIFICATION:
VERIFICATION:
BLOCKERS:
NOTES:
- 未 commit / push
```

## Task 2: Blocker Fix Loop

**Kind:** controller dispatches scoped worker tasks

- [ ] If Task 1 finds P0/P1 engineering blockers, create the smallest fix task.
- [ ] Implementation workers must add a failing test first, then implement.
- [ ] Every fix must include browser regression evidence when it affects UI flow.
- [ ] No worker commits or pushes.

## Task 3: Final Readiness

**Kind:** controller

- [ ] Run final targeted verification after all P0/P1 blockers are closed.
- [ ] Write `/tmp/mirax-first-usable-release-final/report.json`.
- [ ] Stop at `ready_to_commit` and ask for explicit commit/push authorization.

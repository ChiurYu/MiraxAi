# First Dogfood Smoke Readiness Plan

> **For agentic workers:** Execute one task at a time. Codex is controller; Claude/Kimi are workers. Workers never commit or push.

## Goal

Verify Mirax AI can survive a first dogfood smoke pass after the first usable release readiness fixes landed on `main`.

This plan is about smoke/readiness evidence, not new provider expansion.

## Scope

- Desktop web/dev smoke starts and renders the Workbench.
- First-run Workbench dogfood dry-run does not prefill fake user assets.
- Settings and local dependency readiness remain honest.
- Not-connected/failed paths do not fabricate transcripts, audio, videos, covers, subtitles, durations, file sizes, or waveforms.
- Desktop typecheck and build/package-adjacent checks remain healthy.
- Known limitations are captured as P0/P1/P2 blockers.

## Non-Goals

- Do not add more providers.
- Do not implement keychain / OS secure storage.
- Do not run real network provider tests.
- Do not require real FFmpeg or real local AI services.
- Do not silently fallback to mock after a real-path failure.
- Do not commit or push from worker tasks.

## Task 1: First Dogfood Smoke Audit

**Kind:** worker acceptance

**Allowed writes:**

- `/tmp/mirax-first-dogfood-smoke-audit/`

**Forbidden repository writes:**

- Application source, tests, docs, config, lockfiles.
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `docs/人工提示词.md`
- `docs/superpowers/PROJECT-STATE.md`
- `.codex/dispatch-state.json`

- [ ] Run a Playwright/browser smoke pass against the desktop web app.
- [ ] Confirm fresh/default Workbench inputs are honest and no fake user-selected assets are prefilled.
- [ ] Check AI services settings failed/ready filtering and local dependency readiness display.
- [ ] Check Workbench not-connected/failed paths for transcribe / rewrite / voice-clone / speech / avatar / compose.
- [ ] Confirm failed/not-connected paths do not fabricate output artifacts.
- [ ] Run minimal verification:

```bash
./node_modules/.bin/vitest run apps/desktop/src/components/settings/AiServicesSettings.test.ts apps/desktop/src/runtime/desktopDraft.test.ts apps/desktop/src/components/workbench/stages/MaterialParsingStage.test.ts apps/desktop/src/components/workbench/stages/VideoCompositionStage.test.ts apps/desktop/src/composables/useComposeRenderer.test.ts
./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json
cd apps/desktop && ../../apps/desktop/node_modules/.bin/vite build
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
git diff --check
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md docs/人工提示词.md docs/superpowers/PROJECT-STATE.md .codex/dispatch-state.json
```

- [ ] Save screenshots, `report.json`, and `summary.md` under `/tmp/mirax-first-dogfood-smoke-audit/`.

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

## Task 3: Final Dogfood Smoke Readiness

**Kind:** controller

- [ ] Run final targeted verification after all P0/P1 blockers are closed.
- [ ] Write `/tmp/mirax-first-dogfood-smoke-final/report.json`.
- [ ] Stop at `ready_to_commit` and ask for explicit commit/push authorization if repository changes exist.

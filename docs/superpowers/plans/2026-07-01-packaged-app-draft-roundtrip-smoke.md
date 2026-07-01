# Packaged App Draft Roundtrip Smoke Plan

> **For agentic workers:** Execute one task at a time. Codex is controller; Claude/Kimi are workers. Workers never commit or push.

## Goal

Verify the packaged macOS app is not only launchable, but usable enough for a first dogfood draft roundtrip.

This plan is about packaged-app dogfood usability, not new provider expansion.

## Scope

- The packaged `Mirax AI.app` launches from the existing bundle.
- A fresh user can start in the Workbench and reach an honest draft/workflow state.
- Minimal draft state persists across app restart when the UI exposes a safe editable path.
- Empty or unconfigured real dependencies remain honest; no fake success is accepted.
- Evidence and any blocker classification are saved under `/tmp`.

## Non-Goals

- Do not add more providers.
- Do not implement keychain / OS secure storage.
- Do not run real network provider tests.
- Do not require real FFmpeg or real local AI services.
- Do not modify repository source, tests, docs, config, or lockfiles.
- Do not commit or push from worker tasks.

## Task 1: Packaged App Draft Roundtrip Acceptance

**Kind:** worker acceptance

**Allowed writes:**

- `/tmp/mirax-packaged-app-draft-roundtrip-smoke/`

**Forbidden repository writes:**

- Application source, tests, docs, config, lockfiles.
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `docs/人工提示词.md`
- `docs/superpowers/PROJECT-STATE.md`
- `.codex/dispatch-state.json`

- [x] Confirm the packaged app exists:

```bash
test -d "apps/desktop/src-tauri/target/release/bundle/macos/Mirax AI.app"
```

- [x] Launch the packaged app without rebuilding:

```bash
open -n "apps/desktop/src-tauri/target/release/bundle/macos/Mirax AI.app"
```

- [x] Use browser or macOS automation evidence to verify the Workbench appears.
- [x] Exercise the smallest visible draft/workflow interaction available in the packaged app.
- [x] Restart the packaged app and verify whether that minimal state persists or honestly resets.
- [x] Verify settings/dependency status does not claim real readiness without real configuration.
- [x] Capture screenshots, logs, `report.json`, and `summary.md` under `/tmp/mirax-packaged-app-draft-roundtrip-smoke/`.
- [x] Quit the launched app after evidence capture.
- [x] Run final hygiene:

```bash
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

**Result (2026-07-01):** Packaged `Mirax AI.app` exists, launches, renders the Workbench, and restarts back to the same fresh Workbench state. Direct packaged-app UI interaction was blocked by macOS accessibility permissions and the app does not expose a remote debugging port, so draft interaction and localStorage roundtrip were verified through the browser dev-server fallback. Settings and local dependency screens stayed honest: no configured AI providers and local services/FFmpeg/Playwright shown as needing configuration, with no false ready state. Evidence: `/tmp/mirax-packaged-app-draft-roundtrip-smoke/report.json`.

## Task 2: Blocker Fix Loop

**Kind:** controller dispatches scoped worker tasks

- [x] If Task 1 finds P0/P1 engineering blockers, create the smallest fix task.
- [x] Implementation workers must add a failing test first, then implement.
- [x] Every fix must include packaged-app or browser regression evidence when it affects launch, draft persistence, or honest readiness states.
- [x] No worker commits or pushes.

## Task 3: Final Draft Roundtrip Readiness

**Kind:** controller

- [x] Run final targeted verification after all P0/P1 blockers are closed.
- [x] Write `/tmp/mirax-packaged-app-draft-roundtrip-smoke-final/report.json`.
- [x] Continue to commit/push gate if repository changes exist and have been accepted.

# Packaged App Launch Smoke Plan

> **For agentic workers:** Execute one task at a time. Codex is controller; Claude/Kimi are workers. Workers never commit or push.

## Goal

Verify the packaged macOS app produced by the desktop build can launch locally and present the Mirax AI Workbench for first dogfood use.

This plan is about packaged-app launch readiness, not new provider expansion.

## Scope

- Existing `Mirax AI.app` bundle launches.
- The app window appears and renders the Workbench shell.
- The packaged app does not crash immediately on launch.
- Evidence and any blocker classification are saved under `/tmp`.

## Non-Goals

- Do not add more providers.
- Do not implement keychain / OS secure storage.
- Do not run real network provider tests.
- Do not require real FFmpeg or real local AI services.
- Do not modify repository source, tests, docs, config, or lockfiles.
- Do not commit or push from worker tasks.

## Task 1: Packaged App Launch Acceptance

**Kind:** worker acceptance

**Allowed writes:**

- `/tmp/mirax-packaged-app-launch-smoke/`

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

- [x] Verify a Mirax AI window appears and remains alive long enough for a smoke check.
- [x] Capture screenshot or window evidence under `/tmp/mirax-packaged-app-launch-smoke/`.
- [x] Verify the UI shows the Workbench shell or honest startup state.
- [x] Quit the launched app after evidence capture.
- [x] Run final hygiene:

```bash
git diff --check
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md docs/人工提示词.md docs/superpowers/PROJECT-STATE.md .codex/dispatch-state.json
```

- [x] Save `report.json` and `summary.md` under `/tmp/mirax-packaged-app-launch-smoke/`.

**Result (2026-07-01):** Packaged `Mirax AI.app` launched successfully, created a `mirax-ai-desktop` process, rendered the Mirax AI Workbench shell, and quit after screenshot capture. macOS accessibility denied scripted window enumeration, but screenshot and process evidence were sufficient for launch smoke. Evidence: `/tmp/mirax-packaged-app-launch-smoke/report.json`.

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
- [ ] Every fix must include packaged-app or browser regression evidence when it affects launch or UI flow.
- [ ] No worker commits or pushes.

## Task 3: Final Launch Readiness

**Kind:** controller

- [ ] Run final targeted verification after all P0/P1 blockers are closed.
- [ ] Write `/tmp/mirax-packaged-app-launch-smoke-final/report.json`.
- [ ] Continue to commit/push gate if repository changes exist and have been accepted.

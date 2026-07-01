# Desktop Package Smoke Readiness Plan

> **For agentic workers:** Execute one task at a time. Codex is controller; Claude/Kimi are workers. Workers never commit or push.

## Goal

Verify Mirax AI's desktop build and package-adjacent entry points are healthy enough for first dogfood use after the first smoke fixes landed on `main`.

This plan is about packaging/readiness evidence, not new provider expansion.

## Scope

- Desktop web build succeeds and renders from built assets.
- Tauri/Rust package-adjacent checks are healthy.
- Full desktop package build is attempted and any local tooling blocker is reported honestly.
- No failed package/build path fabricates product readiness.
- Known limitations are captured as P0/P1/P2 blockers.

## Non-Goals

- Do not add more providers.
- Do not implement keychain / OS secure storage.
- Do not run real network provider tests.
- Do not require real FFmpeg or real local AI services.
- Do not silently fallback to mock after a real-path failure.
- Do not commit or push from worker tasks.

## Task 1: Desktop Package Smoke Acceptance

**Kind:** worker acceptance

**Allowed writes:**

- `/tmp/mirax-desktop-package-smoke/`

**Forbidden repository writes:**

- Application source, tests, docs, config, lockfiles.
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `docs/人工提示词.md`
- `docs/superpowers/PROJECT-STATE.md`
- `.codex/dispatch-state.json`

- [x] Run desktop web build:

```bash
pnpm --filter @mirax/desktop build:web
```

- [x] Serve the built desktop assets and run a Playwright/browser smoke pass confirming the Workbench renders from `apps/desktop/dist`.
- [x] Run Tauri/Rust package-adjacent checks:

```bash
cargo fmt --check --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

- [x] Attempt full desktop package build:

```bash
pnpm --filter @mirax/desktop build
```

- [x] If full package build is blocked by local environment/tooling, report the exact blocker and classify whether it is P0/P1/P2 for dogfood.
- [x] Run final hygiene:

```bash
git diff --check
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md docs/人工提示词.md docs/superpowers/PROJECT-STATE.md .codex/dispatch-state.json
```

- [x] Save screenshots, command logs, `report.json`, and `summary.md` under `/tmp/mirax-desktop-package-smoke/`.

**Result (2026-07-01):** Browser-built assets smoke passed, `cargo fmt --check` passed, `cargo check` passed, and full desktop package build produced `apps/desktop/src-tauri/target/release/bundle/macos/Mirax AI.app`. Initial package build was blocked by local pnpm build-script approval policy for `esbuild@0.21.5`; the controller fixed it with the minimal workspace allowlist entry and reran the package build successfully. Evidence: `/tmp/mirax-desktop-package-smoke/report.json`.

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

## Task 3: Final Package Smoke Readiness

**Kind:** controller

- [ ] Run final targeted verification after all P0/P1 blockers are closed.
- [ ] Write `/tmp/mirax-desktop-package-smoke-final/report.json`.
- [ ] Continue to commit/push gate if repository changes exist and have been accepted.
